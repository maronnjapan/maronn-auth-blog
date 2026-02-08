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
# Usage: ./setup-auth0-m2m.sh <AUTH0_DOMAIN> <AUTH0_CLIENT_ID> <AUTH0_CLIENT_SECRET>
#
# AUTH0_DOMAIN:        Auth0 tenant domain (e.g., your-tenant.auth0.com)
# AUTH0_CLIENT_ID:     Client ID of an existing Auth0 app with Management API access
# AUTH0_CLIENT_SECRET: Client Secret of that app
#
# The existing app needs at minimum the following Management API scopes:
#   - create:clients
#   - create:client_grants
#   - read:resource_servers
#
# Alternatively, you can use the "Auth0 Management API (Test Application)"
# that Auth0 auto-creates when you enable the Management API explorer.

if [ $# -lt 3 ]; then
    echo "Usage: $0 <AUTH0_DOMAIN> <AUTH0_CLIENT_ID> <AUTH0_CLIENT_SECRET>"
    echo ""
    echo "Creates an Auth0 Machine-to-Machine application for Management API access."
    echo "The created app will have read:users scope to look up user emails."
    echo ""
    echo "Arguments:"
    echo "  AUTH0_DOMAIN        Auth0 tenant domain (e.g., your-tenant.auth0.com)"
    echo "  AUTH0_CLIENT_ID     Client ID of an existing app with Management API access"
    echo "  AUTH0_CLIENT_SECRET Client Secret of that app"
    exit 1
fi

AUTH0_DOMAIN="$1"
AUTH0_CLIENT_ID="$2"
AUTH0_CLIENT_SECRET="$3"

M2M_APP_NAME="Auth Vault M2M (Management API)"

# ============================================
# Step 1: Get Management API token
# ============================================
print_info "Obtaining Management API access token..."

TOKEN_RESPONSE=$(curl -s --request POST \
    "https://${AUTH0_DOMAIN}/oauth/token" \
    --header 'content-type: application/json' \
    --data "{
        \"client_id\": \"${AUTH0_CLIENT_ID}\",
        \"client_secret\": \"${AUTH0_CLIENT_SECRET}\",
        \"audience\": \"https://${AUTH0_DOMAIN}/api/v2/\",
        \"grant_type\": \"client_credentials\"
    }")

MGMT_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [ -z "$MGMT_TOKEN" ]; then
    print_error "Failed to obtain Management API token"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

print_success "Management API token obtained"

# ============================================
# Step 2: Check if M2M app already exists
# ============================================
print_info "Checking if M2M application already exists..."

EXISTING_CLIENTS=$(curl -s --request GET \
    "https://${AUTH0_DOMAIN}/api/v2/clients?app_type=non_interactive&fields=client_id,name,client_secret" \
    --header "authorization: Bearer ${MGMT_TOKEN}" \
    --header 'content-type: application/json')

EXISTING_M2M_ID=$(echo "$EXISTING_CLIENTS" | jq -r --arg name "$M2M_APP_NAME" '.[] | select(.name == $name) | .client_id // empty')

if [ -n "$EXISTING_M2M_ID" ]; then
    EXISTING_M2M_SECRET=$(echo "$EXISTING_CLIENTS" | jq -r --arg name "$M2M_APP_NAME" '.[] | select(.name == $name) | .client_secret // empty')
    print_warning "M2M application already exists: ${EXISTING_M2M_ID}"
    M2M_CLIENT_ID="$EXISTING_M2M_ID"
    M2M_CLIENT_SECRET="$EXISTING_M2M_SECRET"
else
    # ============================================
    # Step 3: Create Machine-to-Machine application
    # ============================================
    print_info "Creating Machine-to-Machine application..."

    CREATE_RESPONSE=$(curl -s --request POST \
        "https://${AUTH0_DOMAIN}/api/v2/clients" \
        --header "authorization: Bearer ${MGMT_TOKEN}" \
        --header 'content-type: application/json' \
        --data "{
            \"name\": \"${M2M_APP_NAME}\",
            \"app_type\": \"non_interactive\",
            \"grant_types\": [\"client_credentials\"],
            \"token_endpoint_auth_method\": \"client_secret_post\"
        }")

    M2M_CLIENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.client_id // empty')
    M2M_CLIENT_SECRET=$(echo "$CREATE_RESPONSE" | jq -r '.client_secret // empty')

    if [ -z "$M2M_CLIENT_ID" ] || [ -z "$M2M_CLIENT_SECRET" ]; then
        print_error "Failed to create M2M application"
        echo "Response: $CREATE_RESPONSE"
        exit 1
    fi

    print_success "M2M application created: ${M2M_CLIENT_ID}"

    # ============================================
    # Step 4: Get Management API resource server ID
    # ============================================
    print_info "Looking up Management API resource server..."

    API_ID="https://${AUTH0_DOMAIN}/api/v2/"

    # ============================================
    # Step 5: Grant client_credentials to Management API with read:users scope
    # ============================================
    print_info "Granting read:users scope to M2M application..."

    GRANT_RESPONSE=$(curl -s --request POST \
        "https://${AUTH0_DOMAIN}/api/v2/client-grants" \
        --header "authorization: Bearer ${MGMT_TOKEN}" \
        --header 'content-type: application/json' \
        --data "{
            \"client_id\": \"${M2M_CLIENT_ID}\",
            \"audience\": \"${API_ID}\",
            \"scope\": [\"read:users\"]
        }")

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
