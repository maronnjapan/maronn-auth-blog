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

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header "Development Environment Setup"

# ============================================
# Step 1: Collect environment variables
# ============================================
print_header "Step 1: Collecting Environment Variables"

echo "Please enter the following information for local development:"
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

# Local URLs
AUTH0_CALLBACK_URL="http://localhost:8787/auth/callback"
PUBLIC_API_URL="http://localhost:8787"
PUBLIC_APP_URL="http://localhost:4321"
EMBED_ORIGIN="http://localhost:8788"

# ============================================
# Step 2: Create .dev.vars for API
# ============================================
print_header "Step 2: Creating API Configuration"

cat > packages/api/.dev.vars << EOF
AUTH0_DOMAIN=${AUTH0_DOMAIN}
AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID}
AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET}
AUTH0_CALLBACK_URL=${AUTH0_CALLBACK_URL}

GITHUB_APP_ID=${GITHUB_APP_ID}
GITHUB_APP_PRIVATE_KEY=${GITHUB_APP_PRIVATE_KEY}

SESSION_SECRET=${SESSION_SECRET}

EMBED_ORIGIN=${EMBED_ORIGIN}
EOF

print_success "API .dev.vars created"

# ============================================
# Step 3: Create .env for Web
# ============================================
print_header "Step 3: Creating Web Configuration"

cat > packages/web/.env << EOF
PUBLIC_API_URL=${PUBLIC_API_URL}
PUBLIC_APP_URL=${PUBLIC_APP_URL}
EOF

print_success "Web .env created"

# ============================================
# Step 4: Create local D1 database
# ============================================
print_header "Step 4: Setting up Local Database"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI is not installed"
    echo "Please install it with: pnpm add -g wrangler"
    exit 1
fi

# Use schema file from scripts directory
print_info "Applying database schema to local D1..."
cd packages/api
wrangler d1 execute blog-db --file=../../scripts/schema.sql --local
cd ../..
print_success "Local database schema applied"

# ============================================
# Summary
# ============================================
print_header "Setup Complete!"

echo "Your development environment is ready!"
echo ""
echo "Configuration files created:"
echo "  ✓ packages/api/.dev.vars"
echo "  ✓ packages/web/.env"
echo "  ✓ Local D1 database initialized"
echo ""
echo "Local URLs:"
echo "  Web:   ${PUBLIC_APP_URL}"
echo "  API:   ${PUBLIC_API_URL}"
echo "  Embed: ${EMBED_ORIGIN}"
echo ""
echo "Next steps:"
echo "1. Install dependencies: pnpm install"
echo "2. Start development servers: pnpm dev"
echo "3. Update Auth0 callback URLs to include: ${AUTH0_CALLBACK_URL}"
echo ""
print_success "All done! 🎉"
