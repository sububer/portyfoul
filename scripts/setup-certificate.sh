#!/bin/bash
#
# ACM Certificate Setup Helper Script
#
# This script helps you set up an ACM certificate for HTTPS.
# It provides AWS CLI commands with proper values filled in.
#
# Usage: ./scripts/setup-certificate.sh <domain-name>
# Example: ./scripts/setup-certificate.sh example.com
#

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-2"  # Must match ALB region

# Print colored messages
info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }
header() { echo -e "\n${GREEN}${1}${NC}\n$( printf '%.0s─' {1..60} )"; }

# Check arguments
if [ $# -lt 1 ]; then
    error "Usage: $0 <domain-name>"
    echo "Example: $0 example.com"
    exit 1
fi

DOMAIN_NAME="$1"

header "ACM Certificate Setup for ${DOMAIN_NAME}"

info "This script will guide you through setting up an ACM certificate."
info "Region: ${REGION}"
echo ""

# Step 1: Create Route 53 Hosted Zone
header "Step 1: Create Route 53 Hosted Zone"

info "Run the following command to create a hosted zone:"
echo ""
echo "aws route53 create-hosted-zone \\"
echo "  --name ${DOMAIN_NAME} \\"
echo "  --caller-reference \"${DOMAIN_NAME}-\$(date +%s)\" \\"
echo "  --hosted-zone-config Comment=\"Hosted zone for ${DOMAIN_NAME}\""
echo ""
warning "Save the Hosted Zone ID and nameservers from the output!"
echo ""
read -p "Press Enter when you have created the hosted zone and noted the details..."

# Get hosted zone ID
read -p "Enter the Hosted Zone ID (e.g., Z00364892BW91A1O6XV4P): " HOSTED_ZONE_ID

if [ -z "$HOSTED_ZONE_ID" ]; then
    error "Hosted Zone ID is required"
    exit 1
fi

success "Hosted Zone ID: ${HOSTED_ZONE_ID}"

# Step 2: Update Nameservers
header "Step 2: Update Nameservers at Registrar"

warning "You need to update nameservers at your domain registrar."
echo ""
info "Get the nameservers from your hosted zone:"
echo ""
echo "aws route53 get-hosted-zone --id ${HOSTED_ZONE_ID} | jq '.DelegationSet.NameServers'"
echo ""
info "Then log in to your registrar and replace the nameservers with AWS's nameservers."
echo ""
read -p "Press Enter when nameservers have been updated at your registrar..."

# Step 3: Verify DNS propagation
header "Step 3: Verify DNS Propagation"

info "Checking nameserver propagation..."
echo ""
if command -v dig &> /dev/null; then
    echo "dig NS ${DOMAIN_NAME} +short"
    dig NS ${DOMAIN_NAME} +short
    echo ""
else
    warning "dig command not found. Manually verify with: dig NS ${DOMAIN_NAME} +short"
fi

read -p "Press Enter to continue to certificate request..."

# Step 4: Request ACM Certificate
header "Step 4: Request ACM Certificate"

info "Run the following command to request a certificate:"
echo ""
echo "aws acm request-certificate \\"
echo "  --domain-name ${DOMAIN_NAME} \\"
echo "  --subject-alternative-names \"*.${DOMAIN_NAME}\" \\"
echo "  --validation-method DNS \\"
echo "  --region ${REGION}"
echo ""
warning "Save the Certificate ARN from the output!"
echo ""
read -p "Press Enter when you have requested the certificate..."

# Get certificate ARN
read -p "Enter the Certificate ARN: " CERT_ARN

if [ -z "$CERT_ARN" ]; then
    error "Certificate ARN is required"
    exit 1
fi

success "Certificate ARN: ${CERT_ARN}"

# Step 5: Get DNS Validation Records
header "Step 5: Add DNS Validation Records"

info "Get the DNS validation records:"
echo ""
echo "aws acm describe-certificate \\"
echo "  --certificate-arn ${CERT_ARN} \\"
echo "  --region ${REGION} \\"
echo "  | jq '.Certificate.DomainValidationOptions[0].ResourceRecord'"
echo ""
read -p "Press Enter to retrieve validation records..."

if command -v aws &> /dev/null && command -v jq &> /dev/null; then
    info "Retrieving validation records..."
    VALIDATION_RECORD=$(aws acm describe-certificate \
        --certificate-arn ${CERT_ARN} \
        --region ${REGION} \
        | jq -r '.Certificate.DomainValidationOptions[0].ResourceRecord')

    CNAME_NAME=$(echo "$VALIDATION_RECORD" | jq -r '.Name')
    CNAME_VALUE=$(echo "$VALIDATION_RECORD" | jq -r '.Value')

    echo ""
    success "Validation Record:"
    echo "  Name:  ${CNAME_NAME}"
    echo "  Type:  CNAME"
    echo "  Value: ${CNAME_VALUE}"
    echo ""

    info "Add this record to Route 53:"
    echo ""
    echo "aws route53 change-resource-record-sets \\"
    echo "  --hosted-zone-id ${HOSTED_ZONE_ID} \\"
    echo "  --change-batch '{"
    echo "    \"Changes\": [{"
    echo "      \"Action\": \"CREATE\","
    echo "      \"ResourceRecordSet\": {"
    echo "        \"Name\": \"${CNAME_NAME}\","
    echo "        \"Type\": \"CNAME\","
    echo "        \"TTL\": 300,"
    echo "        \"ResourceRecords\": [{\"Value\": \"${CNAME_VALUE}\"}]"
    echo "      }"
    echo "    }]"
    echo "  }'"
    echo ""
else
    warning "aws or jq command not found. Manually retrieve validation records."
fi

read -p "Press Enter after adding the validation record to Route 53..."

# Step 6: Wait for validation
header "Step 6: Wait for Certificate Validation"

info "Checking certificate status..."
echo ""
echo "aws acm describe-certificate \\"
echo "  --certificate-arn ${CERT_ARN} \\"
echo "  --region ${REGION} \\"
echo "  --query 'Certificate.Status' \\"
echo "  --output text"
echo ""

if command -v aws &> /dev/null; then
    info "Waiting for certificate validation (this may take a few minutes)..."

    MAX_ATTEMPTS=30
    ATTEMPT=0

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        STATUS=$(aws acm describe-certificate \
            --certificate-arn ${CERT_ARN} \
            --region ${REGION} \
            --query 'Certificate.Status' \
            --output text)

        if [ "$STATUS" == "ISSUED" ]; then
            success "Certificate is ISSUED!"
            break
        elif [ "$STATUS" == "PENDING_VALIDATION" ]; then
            info "Status: ${STATUS} (attempt $((ATTEMPT+1))/${MAX_ATTEMPTS})"
            sleep 10
            ATTEMPT=$((ATTEMPT+1))
        else
            error "Unexpected status: ${STATUS}"
            exit 1
        fi
    done

    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        warning "Certificate validation is taking longer than expected."
        warning "Check the AWS Console for validation status."
    fi
else
    warning "aws command not found. Manually check certificate status."
fi

# Summary
header "Setup Complete!"

success "ACM certificate has been set up successfully!"
echo ""
info "Summary:"
echo "  Domain:          ${DOMAIN_NAME}"
echo "  Hosted Zone ID:  ${HOSTED_ZONE_ID}"
echo "  Certificate ARN: ${CERT_ARN}"
echo "  Region:          ${REGION}"
echo ""
info "Next Steps:"
echo "  1. Update your CloudFormation stack with these parameters:"
echo "     - CertificateArn: ${CERT_ARN}"
echo "     - HostedZoneId: ${HOSTED_ZONE_ID}"
echo "     - DomainName: ${DOMAIN_NAME}"
echo ""
echo "  2. Run the CloudFormation update:"
echo ""
echo "     aws cloudformation update-stack \\"
echo "       --stack-name portyfoul-dev \\"
echo "       --template-body file://infra/main.yaml \\"
echo "       --parameters \\"
echo "         ParameterKey=CertificateArn,ParameterValue=${CERT_ARN} \\"
echo "         ParameterKey=HostedZoneId,ParameterValue=${HOSTED_ZONE_ID} \\"
echo "         ParameterKey=DomainName,ParameterValue=${DOMAIN_NAME} \\"
echo "         ParameterKey=Environment,UsePreviousValue=true \\"
echo "         ParameterKey=ProjectName,UsePreviousValue=true \\"
echo "         ParameterKey=DBInstanceClass,UsePreviousValue=true \\"
echo "         ParameterKey=DBAllocatedStorage,UsePreviousValue=true \\"
echo "         ParameterKey=DBBackupRetention,UsePreviousValue=true \\"
echo "         ParameterKey=DBEngineVersion,UsePreviousValue=true \\"
echo "       --capabilities CAPABILITY_NAMED_IAM \\"
echo "       --region ${REGION}"
echo ""
echo "  3. Monitor the stack update:"
echo "     aws cloudformation wait stack-update-complete --stack-name portyfoul-dev --region ${REGION}"
echo ""
echo "  4. Test HTTPS access:"
echo "     https://${DOMAIN_NAME}"
echo ""
success "Done!"
