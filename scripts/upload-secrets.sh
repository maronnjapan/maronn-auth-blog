#!/bin/bash

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# ============================================
# Usage
# ============================================
usage() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Upload secrets to Cloudflare Workers (API production environment)."
    echo "Prompts interactively for all required values."
    echo ""
    echo "Options:"
    echo "  --skip-m2m-setup  Skip Auth0 M2M application setup (use when M2M app already exists)"
    echo "  -h, --help        Show this help message"
}

SKIP_M2M_SETUP=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-m2m-setup)
            SKIP_M2M_SETUP=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# ============================================
# Check prerequisites
# ============================================
if ! command -v wrangler &> /dev/null; then
    print_error "wrangler CLI is not installed"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

if ! command -v auth0 &> /dev/null; then
    print_error "Auth0 CLI is not installed"
    echo "Please install it:"
    echo "  macOS: brew install auth0/auth0-cli/auth0"
    echo "  Linux: curl -sSfL https://raw.githubusercontent.com/auth0/auth0-cli/main/install.sh | sh -s -- -b /usr/local/bin"
    exit 1
fi

if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Cloudflare"
    echo "Please login with: wrangler login"
    exit 1
fi

# ============================================
# Collect secrets
# ============================================
echo ""
print_info "Auth0 Configuration:"
read -p "Auth0 Domain (e.g., your-tenant.auth0.com): " AUTH0_DOMAIN
read -p "Auth0 Client ID (login app): " AUTH0_CLIENT_ID
read -sp "Auth0 Client Secret (login app): " AUTH0_CLIENT_SECRET
echo ""

echo ""
print_info "Auth0 M2M Configuration (Management API):"

if [ "$SKIP_M2M_SETUP" = true ]; then
    read -p "Auth0 M2M Client ID: " AUTH0_M2M_CLIENT_ID
    read -sp "Auth0 M2M Client Secret: " AUTH0_M2M_CLIENT_SECRET
    echo ""
else
    print_info "Setting up Auth0 M2M application via Auth0 CLI..."
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

    M2M_OUTPUT=$(bash "${SCRIPT_DIR}/setup-auth0-m2m.sh" "$AUTH0_DOMAIN" 2>&1)
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
fi

echo ""
print_info "GitHub App Configuration:"
read -p "GitHub App ID: " GITHUB_APP_ID
echo "GitHub App Private Key (paste the entire key including -----BEGIN/END----- lines):"
echo "Press Enter when done, then Ctrl+D:"
GITHUB_APP_PRIVATE_KEY=$(cat)

read -p "GitHub Webhook Secret: " GITHUB_WEBHOOK_SECRET

echo ""
print_info "Session Configuration:"
read -p "Session Secret (leave empty to auto-generate): " SESSION_SECRET
if [ -z "$SESSION_SECRET" ]; then
    SESSION_SECRET=$(openssl rand -base64 32)
    print_success "Session secret auto-generated"
fi

echo ""
print_info "Email Configuration (Resend):"
read -p "Resend API Key: " RESEND_API_KEY
read -p "Notification Email From (e.g., noreply@example.com): " NOTIFICATION_EMAIL_FROM
read -p "Admin Notification Email: " ADMIN_NOTIFICATION_EMAIL

echo ""
print_info "URL Configuration:"
read -p "API URL (e.g., https://api.example.com): " API_URL
read -p "Web URL (e.g., https://web.example.com): " WEB_URL
read -p "Embed Origin URL (e.g., https://embed.example.com): " EMBED_ORIGIN
read -p "Image URL (e.g., https://api.example.com): " IMAGE_URL

AUTH0_CALLBACK_URL="${API_URL}/auth/callback"

echo ""
print_info "Cookie Configuration:"
read -p "Cookie Domain (e.g., .example.com, leave empty to skip): " COOKIE_DOMAIN

# ============================================
# Upload secrets
# ============================================
echo ""
print_info "Uploading secrets to Cloudflare Workers..."

# Find the API package directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(cd "${SCRIPT_DIR}/../packages/api" && pwd)"

cd "$API_DIR"

echo "$AUTH0_DOMAIN" | wrangler secret put AUTH0_DOMAIN --env production
echo "$AUTH0_CLIENT_ID" | wrangler secret put AUTH0_CLIENT_ID --env production
echo "$AUTH0_CLIENT_SECRET" | wrangler secret put AUTH0_CLIENT_SECRET --env production
echo "$AUTH0_CALLBACK_URL" | wrangler secret put AUTH0_CALLBACK_URL --env production
echo "$AUTH0_M2M_CLIENT_ID" | wrangler secret put AUTH0_M2M_CLIENT_ID --env production
echo "$AUTH0_M2M_CLIENT_SECRET" | wrangler secret put AUTH0_M2M_CLIENT_SECRET --env production
echo "$GITHUB_APP_ID" | wrangler secret put GITHUB_APP_ID --env production
echo "$GITHUB_APP_PRIVATE_KEY" | wrangler secret put GITHUB_APP_PRIVATE_KEY --env production
echo "$GITHUB_WEBHOOK_SECRET" | wrangler secret put GITHUB_WEBHOOK_SECRET --env production
echo "$SESSION_SECRET" | wrangler secret put SESSION_SECRET --env production
echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY --env production
echo "$NOTIFICATION_EMAIL_FROM" | wrangler secret put NOTIFICATION_EMAIL_FROM --env production
echo "$ADMIN_NOTIFICATION_EMAIL" | wrangler secret put ADMIN_NOTIFICATION_EMAIL --env production
echo "$API_URL" | wrangler secret put API_URL --env production
echo "$WEB_URL" | wrangler secret put WEB_URL --env production
echo "$EMBED_ORIGIN" | wrangler secret put EMBED_ORIGIN --env production
echo "$IMAGE_URL" | wrangler secret put IMAGE_URL --env production

if [ -n "$COOKIE_DOMAIN" ]; then
    echo "$COOKIE_DOMAIN" | wrangler secret put COOKIE_DOMAIN --env production
fi

cd - > /dev/null

echo ""
print_success "All secrets uploaded to Cloudflare Workers (API production environment)"
echo ""
echo "Uploaded secrets:"
echo "  - AUTH0_DOMAIN"
echo "  - AUTH0_CLIENT_ID"
echo "  - AUTH0_CLIENT_SECRET"
echo "  - AUTH0_CALLBACK_URL (${AUTH0_CALLBACK_URL})"
echo "  - AUTH0_M2M_CLIENT_ID"
echo "  - AUTH0_M2M_CLIENT_SECRET"
echo "  - GITHUB_APP_ID"
echo "  - GITHUB_APP_PRIVATE_KEY"
echo "  - GITHUB_WEBHOOK_SECRET"
echo "  - SESSION_SECRET"
echo "  - RESEND_API_KEY"
echo "  - NOTIFICATION_EMAIL_FROM"
echo "  - ADMIN_NOTIFICATION_EMAIL"
echo "  - API_URL"
echo "  - WEB_URL"
echo "  - EMBED_ORIGIN"
echo "  - IMAGE_URL"
if [ -n "$COOKIE_DOMAIN" ]; then
    echo "  - COOKIE_DOMAIN"
fi
