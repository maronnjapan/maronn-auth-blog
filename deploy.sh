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

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare"
    echo "Please login with: wrangler login"
    exit 1
fi

print_header "GitHub Blog Platform - Deployment Script"

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

# URLs (will be updated after deployment)
print_info "URLs will be configured after deployment"

print_success "Environment variables collected"

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
    D1_DATABASE_ID=$(wrangler d1 list | grep "${PROJECT_NAME}-db" | awk '{print $2}')
else
    D1_DATABASE_ID=$(echo "$D1_OUTPUT" | grep "database_id" | awk -F'"' '{print $4}')
    print_success "D1 database created: $D1_DATABASE_ID"
fi

# Create KV Namespaces
print_info "Creating KV namespaces..."

# Sessions KV
KV_SESSIONS_OUTPUT=$(wrangler kv:namespace create "${PROJECT_NAME}-sessions" 2>&1 || true)
if echo "$KV_SESSIONS_OUTPUT" | grep -q "already exists"; then
    print_warning "Sessions KV namespace already exists"
    KV_SESSIONS_ID=$(wrangler kv:namespace list | grep "${PROJECT_NAME}-sessions" | jq -r '.[] | select(.title | contains("sessions")) | .id' | head -1)
else
    KV_SESSIONS_ID=$(echo "$KV_SESSIONS_OUTPUT" | grep "id =" | awk -F'"' '{print $2}')
    print_success "Sessions KV namespace created: $KV_SESSIONS_ID"
fi

# Cache KV
KV_CACHE_OUTPUT=$(wrangler kv:namespace create "${PROJECT_NAME}-cache" 2>&1 || true)
if echo "$KV_CACHE_OUTPUT" | grep -q "already exists"; then
    print_warning "Cache KV namespace already exists"
    KV_CACHE_ID=$(wrangler kv:namespace list | grep "${PROJECT_NAME}-cache" | jq -r '.[] | select(.title | contains("cache")) | .id' | head -1)
else
    KV_CACHE_ID=$(echo "$KV_CACHE_OUTPUT" | grep "id =" | awk -F'"' '{print $2}')
    print_success "Cache KV namespace created: $KV_CACHE_ID"
fi

# Create R2 Bucket
print_info "Creating R2 bucket..."
R2_OUTPUT=$(wrangler r2 bucket create ${PROJECT_NAME}-images 2>&1 || true)
if echo "$R2_OUTPUT" | grep -q "already exists"; then
    print_warning "R2 bucket already exists"
else
    print_success "R2 bucket created: ${PROJECT_NAME}-images"
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
# Step 5: Update wrangler.toml files
# ============================================
print_header "Step 5: Updating Configuration Files"

# Update API wrangler.toml
print_info "Updating packages/api/wrangler.toml..."
cat > packages/api/wrangler.toml << EOF
name = "${PROJECT_NAME}-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "${PROJECT_NAME}-db"
database_id = "${D1_DATABASE_ID}"

[[kv_namespaces]]
binding = "SESSIONS"
id = "${KV_SESSIONS_ID}"

[[kv_namespaces]]
binding = "CACHE"
id = "${KV_CACHE_ID}"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "${PROJECT_NAME}-images"

[vars]
EMBED_ORIGIN = "https://${PROJECT_NAME}-embed.workers.dev"
EOF
print_success "API configuration updated"

# Update Embed wrangler.toml
print_info "Updating packages/embed/wrangler.toml..."
cat > packages/embed/wrangler.toml << EOF
name = "${PROJECT_NAME}-embed"
main = "src/index.ts"
compatibility_date = "2024-01-01"
EOF
print_success "Embed configuration updated"

# ============================================
# Step 6: Set Secrets
# ============================================
print_header "Step 6: Setting Secrets"

print_info "Setting API secrets..."
cd packages/api

echo "$AUTH0_DOMAIN" | wrangler secret put AUTH0_DOMAIN
echo "$AUTH0_CLIENT_ID" | wrangler secret put AUTH0_CLIENT_ID
echo "$AUTH0_CLIENT_SECRET" | wrangler secret put AUTH0_CLIENT_SECRET
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID
echo "$GITHUB_APP_PRIVATE_KEY" | wrangler secret put GITHUB_APP_PRIVATE_KEY
echo "$SESSION_SECRET" | wrangler secret put SESSION_SECRET

cd ../..
print_success "Secrets configured"

# ============================================
# Step 7: Build
# ============================================
print_header "Step 7: Building Applications"

print_info "Building all packages..."
pnpm build
print_success "Build completed"

# ============================================
# Step 8: Deploy
# ============================================
print_header "Step 8: Deploying Applications"

# Deploy API
print_info "Deploying API..."
cd packages/api
API_URL=$(wrangler deploy --json | jq -r '.url')
cd ../..
print_success "API deployed: $API_URL"

# Deploy Embed
print_info "Deploying Embed..."
cd packages/embed
EMBED_URL=$(wrangler deploy --json | jq -r '.url')
cd ../..
print_success "Embed deployed: $EMBED_URL"

# Update API with correct EMBED_ORIGIN
print_info "Updating API with embed URL..."
cd packages/api
wrangler secret put EMBED_ORIGIN <<< "$EMBED_URL"
cd ../..

# Deploy Web (Cloudflare Pages)
print_info "Deploying Web..."
cd packages/web

# Create .env for build
cat > .env << EOF
PUBLIC_API_URL=$API_URL
PUBLIC_APP_URL=https://${PROJECT_NAME}.pages.dev
EOF

# Deploy to Cloudflare Pages
WEB_URL=$(wrangler pages deploy dist --project-name=${PROJECT_NAME} --branch=main | grep -o 'https://[^ ]*' | head -1)
cd ../..
print_success "Web deployed: $WEB_URL"

# ============================================
# Step 9: Update Auth0 Callback URLs
# ============================================
print_header "Step 9: Post-Deployment Configuration"

print_info "Deployment completed! Please update the following:"
echo ""
echo "1. Auth0 Callback URLs:"
echo "   - Add to Allowed Callback URLs: ${API_URL}/auth/callback"
echo "   - Add to Allowed Logout URLs: ${WEB_URL}"
echo "   - Add to Allowed Web Origins: ${WEB_URL}"
echo ""
echo "2. Update the AUTH0_CALLBACK_URL secret:"
AUTH0_CALLBACK_URL="${API_URL}/auth/callback"
cd packages/api
echo "$AUTH0_CALLBACK_URL" | wrangler secret put AUTH0_CALLBACK_URL
cd ../..
print_success "AUTH0_CALLBACK_URL secret updated"

# ============================================
# Deployment Summary
# ============================================
print_header "Deployment Complete!"

echo "Your application has been deployed successfully!"
echo ""
echo "Application URLs:"
echo "  Web:   $WEB_URL"
echo "  API:   $API_URL"
echo "  Embed: $EMBED_URL"
echo ""
echo "Next steps:"
echo "1. Update Auth0 application settings with the callback URLs above"
echo "2. Configure your GitHub App webhook URL: ${API_URL}/webhook/github"
echo "3. Test the authentication flow"
echo ""
print_success "All done! 🎉"
