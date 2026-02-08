#!/bin/bash

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}======================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI is not installed"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed"
    echo "Please install it:"
    echo "  macOS: brew install jq"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  Other: https://stedolan.github.io/jq/download/"
    exit 1
fi

# Check if auth0 CLI is installed
if ! command -v auth0 &> /dev/null; then
    print_error "Auth0 CLI is not installed"
    echo "Please install it:"
    echo "  macOS: brew install auth0/auth0-cli/auth0"
    echo "  Linux: curl -sSfL https://raw.githubusercontent.com/auth0/auth0-cli/main/install.sh | sh -s -- -b /usr/local/bin"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare"
    echo "Please login with: wrangler login"
    exit 1
fi

print_header "Auth Vault - Deployment Script"

# ============================================
# Step 1: Collect environment variables
# ============================================
print_header "Step 1: Collecting Environment Variables"

echo "Please enter the following information:"
echo ""

# Auth0 Configuration
print_info "Auth0 Configuration:"
read -p "Auth0 Domain (e.g., your-tenant.auth0.com): " AUTH0_DOMAIN
read -p "Auth0 Client ID: " AUTH0_CLIENT_ID
read -sp "Auth0 Client Secret: " AUTH0_CLIENT_SECRET
echo ""

# GitHub App Configuration
print_info "GitHub App Configuration:"
read -p "GitHub App ID: " GITHUB_APP_ID
read -p "GitHub App Slug (the name in the GitHub App URL, e.g., 'my-blog-app' from github.com/apps/my-blog-app): " GITHUB_APP_SLUG
echo "GitHub App Private Key (paste the entire key including -----BEGIN/END----- lines):"
echo "Press Enter when done, then Ctrl+D:"
GITHUB_APP_PRIVATE_KEY=$(cat)

# Session Secret
print_info "Session Configuration:"
echo "Generating random session secret..."
SESSION_SECRET=$(openssl rand -base64 32)
print_success "Session secret generated"

# Cloudflare Configuration
print_info "Cloudflare Configuration:"
read -p "Project name (used for resource naming): " PROJECT_NAME

# Custom Domain Configuration (Required)
print_info "Custom Domain Configuration:"
read -p "Root domain (e.g., maronn-room.com): " ROOT_DOMAIN

if [ -z "$ROOT_DOMAIN" ]; then
    print_error "Root domain is required"
    exit 1
fi

COOKIE_DOMAIN=".${ROOT_DOMAIN}"
API_DOMAIN="api.${ROOT_DOMAIN}"
WEB_DOMAIN="web.${ROOT_DOMAIN}"
EMBED_DOMAIN="embed.${ROOT_DOMAIN}"
print_success "Custom domain configured: ${ROOT_DOMAIN}"
print_info "  Web:   https://${WEB_DOMAIN}"
print_info "  API:   https://${API_DOMAIN}"
print_info "  Embed: https://${EMBED_DOMAIN}"

# Get Cloudflare Zone ID for custom domain
print_info "Fetching Cloudflare Zone ID for ${ROOT_DOMAIN}..."
ZONE_ID=$(wrangler whoami --json 2>/dev/null | jq -r '.accounts[0].id' 2>/dev/null || echo "")
if [ -z "$ZONE_ID" ]; then
    print_warning "Could not auto-detect Zone ID. You may need to configure custom domains manually."
fi

print_success "Environment variables collected"

# ============================================
# Step 1.5: Setup Auth0 M2M Application
# ============================================
print_header "Step 1.5: Setting up Auth0 M2M Application"

print_info "Creating Auth0 Machine-to-Machine application for Management API access..."
print_info "Auth0 CLI (auth0) is required. You will be prompted to login if not already authenticated."
echo ""

M2M_OUTPUT=$(bash scripts/setup-auth0-m2m.sh "$AUTH0_DOMAIN" 2>&1)
M2M_EXIT_CODE=$?

echo "$M2M_OUTPUT"

if [ $M2M_EXIT_CODE -ne 0 ]; then
    print_error "Failed to setup Auth0 M2M application"
    exit 1
fi

AUTH0_M2M_CLIENT_ID=$(echo "$M2M_OUTPUT" | grep "^AUTH0_M2M_CLIENT_ID=" | cut -d'=' -f2)
AUTH0_M2M_CLIENT_SECRET=$(echo "$M2M_OUTPUT" | grep "^AUTH0_M2M_CLIENT_SECRET=" | cut -d'=' -f2)

if [ -z "$AUTH0_M2M_CLIENT_ID" ] || [ -z "$AUTH0_M2M_CLIENT_SECRET" ]; then
    print_error "Failed to parse M2M credentials from setup script output"
    exit 1
fi

print_success "Auth0 M2M application configured"

# ============================================
# Step 2: Install dependencies
# ============================================
print_header "Step 2: Installing Dependencies"

if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    pnpm install
    print_success "Dependencies installed"
else
    print_success "Dependencies already installed"
fi

# ============================================
# Step 3: Create Cloudflare Resources
# ============================================
print_header "Step 3: Creating Cloudflare Resources"

# Create D1 Database
print_info "Creating D1 database..."
D1_OUTPUT=$(wrangler d1 create ${PROJECT_NAME}-db 2>&1 || true)
if echo "$D1_OUTPUT" | grep -q "already exists"; then
    print_warning "D1 database already exists"
    # Get D1 database ID from list command with JSON output
    D1_DATABASE_ID=$(wrangler d1 list --json 2>/dev/null | jq -r --arg name "${PROJECT_NAME}-db" '.[] | select(.name == $name) | .uuid' | head -1)
else
    # Parse database_id from create output
    D1_DATABASE_ID=$(echo "$D1_OUTPUT" | grep -o '"database_id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"database_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    if [ -z "$D1_DATABASE_ID" ]; then
        # Alternative parsing for different output format
        D1_DATABASE_ID=$(echo "$D1_OUTPUT" | grep "database_id" | awk -F'=' '{print $2}' | tr -d ' "')
    fi
    print_success "D1 database created: $D1_DATABASE_ID"
fi

if [ -z "$D1_DATABASE_ID" ]; then
    print_error "Failed to get D1 database ID"
    exit 1
fi
print_info "D1 Database ID: $D1_DATABASE_ID"

# Create KV Namespace
print_info "Creating KV namespace..."
KV_NAMESPACE_TITLE="${PROJECT_NAME}-kv"

# Check if KV namespace already exists
EXISTING_KV_ID=$(wrangler kv namespace list 2>/dev/null | jq -r --arg title "$KV_NAMESPACE_TITLE" '.[] | select(.title == $title) | .id' | head -1)

if [ -n "$EXISTING_KV_ID" ]; then
    print_warning "KV namespace already exists"
    KV_ID="$EXISTING_KV_ID"
else
    KV_OUTPUT=$(wrangler kv namespace create "$KV_NAMESPACE_TITLE" 2>&1)
    # Parse id from output like: id = "abc123..."
    KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | sed 's/id = "\([^"]*\)"/\1/')
    if [ -z "$KV_ID" ]; then
        # Alternative: try JSON-like parsing
        KV_ID=$(echo "$KV_OUTPUT" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
    fi
    print_success "KV namespace created: $KV_ID"
fi

if [ -z "$KV_ID" ]; then
    print_error "Failed to get KV namespace ID"
    exit 1
fi
print_info "KV Namespace ID: $KV_ID"

# Create R2 Bucket
print_info "Creating R2 bucket..."
R2_BUCKET_NAME="${PROJECT_NAME}-images"
R2_OUTPUT=$(wrangler r2 bucket create "$R2_BUCKET_NAME" 2>&1 || true)
if echo "$R2_OUTPUT" | grep -q "already exists"; then
    print_warning "R2 bucket already exists"
elif echo "$R2_OUTPUT" | grep -q "Please enable R2"; then
    print_error "R2 is not enabled in your Cloudflare account"
    echo "Please enable R2 through the Cloudflare Dashboard:"
    echo "  https://dash.cloudflare.com/ -> R2 Object Storage -> Create bucket"
    echo ""
    echo "After enabling R2, run this script again."
    exit 1
else
    print_success "R2 bucket created: $R2_BUCKET_NAME"
fi

print_success "Cloudflare resources created"

# ============================================
# Step 4: Initialize Database Schema
# ============================================
print_header "Step 4: Initializing Database Schema"

print_info "Applying database schema..."
wrangler d1 execute ${PROJECT_NAME}-db --file=scripts/schema.sql --remote
print_success "Database schema applied"

# ============================================
# Step 5: Update wrangler.toml with Resource IDs
# ============================================
print_header "Step 5: Updating wrangler.toml with Resource IDs"

# Update API wrangler.toml with actual resource IDs
print_info "Updating packages/api/wrangler.toml with resource IDs..."

# Remove existing production environment bindings if present
# Find the line where production bindings start and remove everything after
WRANGLER_TOML="packages/api/wrangler.toml"

# Create a clean wrangler.toml with only base configuration
# First, extract only the base configuration (before any env.production settings)
if grep -q "env.production" "$WRANGLER_TOML"; then
    print_info "Removing existing production bindings..."
    # Find the first line containing env.production and keep only lines before it
    FIRST_PROD_LINE=$(grep -n "env.production" "$WRANGLER_TOML" | head -1 | cut -d: -f1)
    if [ -n "$FIRST_PROD_LINE" ]; then
        # Also remove comment line before it if it's the deploy.sh comment
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if sed -n "${PREV_LINE}p" "$WRANGLER_TOML" | grep -q "Production environment bindings"; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        # Check for empty line before that
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if [ "$PREV_LINE" -gt 0 ] && [ -z "$(sed -n "${PREV_LINE}p" "$WRANGLER_TOML" | tr -d '[:space:]')" ]; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        head -n $((FIRST_PROD_LINE - 1)) "$WRANGLER_TOML" > "${WRANGLER_TOML}.tmp"
        mv "${WRANGLER_TOML}.tmp" "$WRANGLER_TOML"
    fi
fi

# Add production environment bindings to wrangler.toml
cat >> "$WRANGLER_TOML" << EOF

# Production environment bindings (added by deploy.sh)
[env.production]
name = "${PROJECT_NAME}-api-production"

[[env.production.d1_databases]]
binding = "DB"
database_name = "${PROJECT_NAME}-db"
database_id = "${D1_DATABASE_ID}"

[[env.production.kv_namespaces]]
binding = "KV"
id = "${KV_ID}"

[[env.production.r2_buckets]]
binding = "R2"
bucket_name = "${R2_BUCKET_NAME}"

[env.production.vars]
ENVIRONMENT = "production"

[[env.production.routes]]
pattern = "${API_DOMAIN}"
custom_domain = true
EOF

print_success "API wrangler.toml updated"

# Update Embed wrangler.toml with custom domain
print_info "Updating packages/embed/wrangler.toml with custom domain..."
EMBED_WRANGLER_TOML="packages/embed/wrangler.toml"

# Remove existing production environment if present
if grep -q "env.production" "$EMBED_WRANGLER_TOML"; then
    print_info "Removing existing production config from embed wrangler.toml..."
    FIRST_PROD_LINE=$(grep -n "env.production" "$EMBED_WRANGLER_TOML" | head -1 | cut -d: -f1)
    if [ -n "$FIRST_PROD_LINE" ]; then
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if sed -n "${PREV_LINE}p" "$EMBED_WRANGLER_TOML" | grep -q "Production"; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if [ "$PREV_LINE" -gt 0 ] && [ -z "$(sed -n "${PREV_LINE}p" "$EMBED_WRANGLER_TOML" | tr -d '[:space:]')" ]; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        head -n $((FIRST_PROD_LINE - 1)) "$EMBED_WRANGLER_TOML" > "${EMBED_WRANGLER_TOML}.tmp"
        mv "${EMBED_WRANGLER_TOML}.tmp" "$EMBED_WRANGLER_TOML"
    fi
fi

# Add production environment with custom domain to embed wrangler.toml
cat >> "$EMBED_WRANGLER_TOML" << EOF

# Production environment (added by deploy.sh)
[env.production]
name = "${PROJECT_NAME}-embed-production"

[[env.production.routes]]
pattern = "${EMBED_DOMAIN}"
custom_domain = true
EOF

print_success "Embed wrangler.toml updated"

# Update Web wrangler.toml with custom domain
print_info "Updating packages/web/wrangler.toml with custom domain..."
WEB_WRANGLER_TOML="packages/web/wrangler.toml"

# Remove existing production environment if present
if grep -q "env.production" "$WEB_WRANGLER_TOML"; then
    print_info "Removing existing production config from web wrangler.toml..."
    FIRST_PROD_LINE=$(grep -n "env.production" "$WEB_WRANGLER_TOML" | head -1 | cut -d: -f1)
    if [ -n "$FIRST_PROD_LINE" ]; then
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if sed -n "${PREV_LINE}p" "$WEB_WRANGLER_TOML" | grep -q "Production"; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        PREV_LINE=$((FIRST_PROD_LINE - 1))
        if [ "$PREV_LINE" -gt 0 ] && [ -z "$(sed -n "${PREV_LINE}p" "$WEB_WRANGLER_TOML" | tr -d '[:space:]')" ]; then
            FIRST_PROD_LINE=$PREV_LINE
        fi
        head -n $((FIRST_PROD_LINE - 1)) "$WEB_WRANGLER_TOML" > "${WEB_WRANGLER_TOML}.tmp"
        mv "${WEB_WRANGLER_TOML}.tmp" "$WEB_WRANGLER_TOML"
    fi
fi

# Add production environment with custom domain to web wrangler.toml
cat >> "$WEB_WRANGLER_TOML" << EOF

# Production environment (added by deploy.sh)
[env.production]
name = "${PROJECT_NAME}-web-production"

[[env.production.routes]]
pattern = "${WEB_DOMAIN}"
custom_domain = true
EOF

print_success "Web wrangler.toml updated"

# ============================================
# Step 6: Set Secrets for Production
# ============================================
print_header "Step 6: Setting Secrets for Production Environment"

# Compute URLs for secrets
API_URL="https://${API_DOMAIN}"
WEB_URL="https://${WEB_DOMAIN}"
EMBED_URL="https://${EMBED_DOMAIN}"
AUTH0_CALLBACK_URL="${API_URL}/auth/callback"

print_info "Setting API secrets for production..."
cd packages/api

# Auth0 (login app)
echo "$AUTH0_DOMAIN" | wrangler secret put AUTH0_DOMAIN --env production
echo "$AUTH0_CLIENT_ID" | wrangler secret put AUTH0_CLIENT_ID --env production
echo "$AUTH0_CLIENT_SECRET" | wrangler secret put AUTH0_CLIENT_SECRET --env production
echo "$AUTH0_CALLBACK_URL" | wrangler secret put AUTH0_CALLBACK_URL --env production

# Auth0 M2M (Management API)
echo "$AUTH0_M2M_CLIENT_ID" | wrangler secret put AUTH0_M2M_CLIENT_ID --env production
echo "$AUTH0_M2M_CLIENT_SECRET" | wrangler secret put AUTH0_M2M_CLIENT_SECRET --env production

# GitHub App
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID --env production
echo "$GITHUB_APP_PRIVATE_KEY" | wrangler secret put GITHUB_APP_PRIVATE_KEY --env production

# Session
echo "$SESSION_SECRET" | wrangler secret put SESSION_SECRET --env production

# URLs
echo "$API_URL" | wrangler secret put API_URL --env production
echo "$WEB_URL" | wrangler secret put WEB_URL --env production
echo "$EMBED_URL" | wrangler secret put EMBED_ORIGIN --env production

# Cookie domain
if [ -n "$COOKIE_DOMAIN" ]; then
    echo "$COOKIE_DOMAIN" | wrangler secret put COOKIE_DOMAIN --env production
fi

cd ../..
print_success "Secrets configured for production"

# ============================================
# Step 7: Build
# ============================================
print_header "Step 7: Building Applications"

print_info "Building all packages..."
pnpm build
print_success "Build completed"

# ============================================
# Step 8: Deploy to Cloudflare
# ============================================
print_header "Step 8: Deploying to Cloudflare"

# Deploy API (Workers)
print_info "Deploying API to Cloudflare Workers..."
cd packages/api
wrangler deploy --env production
cd ../..
print_success "API deployed: $API_URL"

# Deploy Embed (Workers)
print_info "Deploying Embed to Cloudflare Workers..."
cd packages/embed
wrangler deploy --env production
cd ../..
print_success "Embed deployed: $EMBED_URL"

# Deploy Web (Cloudflare Workers)
print_info "Deploying Web to Cloudflare Workers..."
cd packages/web

# Create .env for build
GITHUB_APP_INSTALL_URL="https://github.com/apps/${GITHUB_APP_SLUG}/installations/new"
cat > .env << EOF
PUBLIC_API_URL=$API_URL
PUBLIC_APP_URL=$WEB_URL
PUBLIC_GITHUB_APP_INSTALL_URL=$GITHUB_APP_INSTALL_URL
PUBLIC_EMBED_ORIGIN=$EMBED_URL
EOF

# Deploy to Cloudflare Workers
wrangler deploy --env production
cd ../..
print_success "Web deployed: $WEB_URL"

# ============================================
# Deployment Summary
# ============================================
print_header "Deployment Complete!"

echo "Your application has been deployed to Cloudflare successfully!"
echo ""
echo "📍 Application URLs:"
echo "   Web:   ${WEB_URL}"
echo "   API:   ${API_URL}"
echo "   Embed: ${EMBED_URL}"
echo ""
echo "⚙️  Next Steps:"
echo ""
echo "1. Verify Custom Domain DNS (if not already configured):"
echo "   → https://dash.cloudflare.com/ -> Workers & Pages -> Your Worker -> Settings -> Domains & Routes"
echo "   - The custom domains should be automatically configured"
echo "   - Ensure your domain (${ROOT_DOMAIN}) is managed by Cloudflare DNS"
echo "   - Required DNS records (auto-created by wrangler):"
echo "     * ${WEB_DOMAIN} -> CNAME to your worker"
echo "     * ${API_DOMAIN} -> CNAME to your worker"
echo "     * ${EMBED_DOMAIN} -> CNAME to your worker"
echo ""
echo "2. Update Auth0 Application Settings:"
echo "   → https://manage.auth0.com/"
echo "   - Allowed Callback URLs: ${API_URL}/auth/callback"
echo "   - Allowed Logout URLs: ${WEB_URL}"
echo "   - Allowed Web Origins: ${WEB_URL}"
echo ""
echo "3. Update GitHub App Settings:"
echo "   → https://github.com/settings/apps"
echo "   - Webhook URL: ${API_URL}/webhook/github"
echo "   - Homepage URL: ${WEB_URL}"
echo "   - Post installation > Setup URL: ${WEB_URL}/dashboard/settings"
echo "   - Post installation > Redirect on update: ✓ (checked)"
echo "   Note: The 'Post installation redirect URL' is REQUIRED for repository selection to work."
echo ""
echo "4. Test the application:"
echo "   - Visit: ${WEB_URL}"
echo "   - Test authentication flow"
echo ""
print_success "All done!"
