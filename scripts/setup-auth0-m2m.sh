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
# Validate required arguments
# ============================================
# Usage: ./setup-auth0-m2m.sh <AUTH0_DOMAIN>
#
# AUTH0_DOMAIN: Auth0 tenant domain (e.g., your-tenant.auth0.com)
#
# Prerequisites:
#   - Auth0 CLI (auth0) must be installed
#   - Must be logged in via `auth0 login`

if [ $# -lt 1 ]; then
    echo "Usage: $0 <AUTH0_DOMAIN>"
    echo ""
    echo "Creates an Auth0 Machine-to-Machine application for Management API access."
    echo "The created app will have read:users scope to look up user emails."
    echo ""
    echo "Arguments:"
    echo "  AUTH0_DOMAIN  Auth0 tenant domain (e.g., your-tenant.auth0.com)"
    echo ""
    echo "Prerequisites:"
    echo "  - Auth0 CLI must be installed: https://github.com/auth0/auth0-cli"
    echo "  - Must be logged in: auth0 login"
    exit 1
fi

AUTH0_DOMAIN="$1"
M2M_APP_NAME="Auth Vault M2M (Management API)"

# ============================================
# Step 1: Check Auth0 CLI is installed and logged in
# ============================================
if ! command -v auth0 &> /dev/null; then
    print_error "Auth0 CLI is not installed"
    echo "Install it from: https://github.com/auth0/auth0-cli"
    echo ""
    echo "  macOS:   brew install auth0/auth0-cli/auth0"
    echo "  Linux:   curl -sSfL https://raw.githubusercontent.com/auth0/auth0-cli/main/install.sh | sh -s -- -b /usr/local/bin"
    exit 1
fi

# Check if logged in by trying to list tenants
if ! auth0 tenants list --json &> /dev/null; then
    print_warning "Not logged in to Auth0 CLI. Starting login..."
    auth0 login
fi

print_success "Auth0 CLI authenticated"

# ============================================
# Step 2: Check if M2M app already exists
# ============================================
print_info "Checking if M2M application already exists..."

EXISTING_APP=$(auth0 apps list --json 2>/dev/null | jq -r --arg name "$M2M_APP_NAME" '[.[] | select(.name == $name and .app_type == "non_interactive")] | first // empty')

if [ -n "$EXISTING_APP" ] && [ "$EXISTING_APP" != "null" ]; then
    EXISTING_M2M_ID=$(echo "$EXISTING_APP" | jq -r '.client_id')
    print_warning "M2M application already exists: ${EXISTING_M2M_ID}"

    # Fetch full app details with secrets
    APP_DETAILS=$(auth0 apps show "$EXISTING_M2M_ID" --reveal-secrets --json 2>/dev/null)
    M2M_CLIENT_ID=$(echo "$APP_DETAILS" | jq -r '.client_id')
    M2M_CLIENT_SECRET=$(echo "$APP_DETAILS" | jq -r '.client_secret')
else
    # ============================================
    # Step 3: Create Machine-to-Machine application
    # ============================================
    print_info "Creating Machine-to-Machine application..."

    CREATE_OUTPUT=$(auth0 apps create \
        --name "$M2M_APP_NAME" \
        --type m2m \
        --description "Management API client for looking up user emails during article review" \
        --reveal-secrets \
        --json 2>/dev/null)

    M2M_CLIENT_ID=$(echo "$CREATE_OUTPUT" | jq -r '.client_id // empty')
    M2M_CLIENT_SECRET=$(echo "$CREATE_OUTPUT" | jq -r '.client_secret // empty')

    if [ -z "$M2M_CLIENT_ID" ] || [ -z "$M2M_CLIENT_SECRET" ]; then
        print_error "Failed to create M2M application"
        echo "Response: $CREATE_OUTPUT"
        exit 1
    fi

    print_success "M2M application created: ${M2M_CLIENT_ID}"

    # ============================================
    # Step 4: Grant read:users scope to Management API
    # ============================================
    print_info "Granting read:users scope to M2M application..."

    API_AUDIENCE="https://${AUTH0_DOMAIN}/api/v2/"

    GRANT_RESPONSE=$(auth0 api post "client-grants" --data "{
        \"client_id\": \"${M2M_CLIENT_ID}\",
        \"audience\": \"${API_AUDIENCE}\",
        \"scope\": [\"read:users\"]
    }" 2>/dev/null)

    GRANT_ID=$(echo "$GRANT_RESPONSE" | jq -r '.id // empty')

    if [ -z "$GRANT_ID" ]; then
        print_error "Failed to create client grant"
        echo "Response: $GRANT_RESPONSE"
        exit 1
    fi

    print_success "Client grant created with read:users scope"
fi

# ============================================
# Output results
# ============================================
echo ""
print_success "Auth0 M2M Application Setup Complete"
echo ""
echo "AUTH0_M2M_CLIENT_ID=${M2M_CLIENT_ID}"
echo "AUTH0_M2M_CLIENT_SECRET=${M2M_CLIENT_SECRET}"
