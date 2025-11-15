#!/bin/bash

# Portyfoul Deployment Script
# Builds Docker image, tags it, and pushes to ECR

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
REGION="${AWS_REGION:-us-east-2}"
STACK_NAME="${STACK_NAME:-portyfoul-infra}"
BUILD_ONLY=false
PUSH_ONLY=false
IMAGE_TAG=""

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Build and deploy Docker images to AWS ECR.

OPTIONS:
    --build-only          Build image only, don't push to ECR
    --push-only           Push existing image, skip build (requires --tag)
    --tag TAG             Use specific tag instead of git commit SHA
    --region REGION       AWS region (default: us-east-2)
    --stack-name NAME     CloudFormation stack name (default: portyfoul-infra)
    -h, --help            Show this help message

EXAMPLES:
    # Full build and push (default)
    $0

    # Build only (useful for local testing)
    $0 --build-only

    # Push specific tag
    $0 --push-only --tag abc123

    # Use different region
    $0 --region us-west-2

EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --push-only)
            PUSH_ONLY=true
            shift
            ;;
        --tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --region)
            REGION="$2"
            shift 2
            ;;
        --stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

# Validate options
if [ "$PUSH_ONLY" = true ] && [ -z "$IMAGE_TAG" ]; then
    print_error "--push-only requires --tag to be specified"
    exit 1
fi

if [ "$BUILD_ONLY" = true ] && [ "$PUSH_ONLY" = true ]; then
    print_error "Cannot use --build-only and --push-only together"
    exit 1
fi

# Print header
echo ""
print_info "Portyfoul Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_info "Region: $REGION"
print_info "Stack: $STACK_NAME"
echo ""

# Step 1: Get ECR repository URI from CloudFormation stack
print_info "Fetching ECR repository URI from CloudFormation..."
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryUri`].OutputValue' \
    --output text 2>/dev/null)

if [ -z "$ECR_URI" ]; then
    print_error "Failed to get ECR repository URI from CloudFormation stack"
    print_error "Make sure the stack '$STACK_NAME' exists in region '$REGION'"
    exit 1
fi

print_success "ECR Repository: $ECR_URI"
echo ""

# Step 2: Determine image tag
if [ -z "$IMAGE_TAG" ]; then
    # Check if we're in a git repository
    if git rev-parse --git-dir > /dev/null 2>&1; then
        IMAGE_TAG=$(git rev-parse --short=8 HEAD)
        print_info "Using git commit SHA as tag: $IMAGE_TAG"
    else
        # Fallback to timestamp if not in git repo
        IMAGE_TAG=$(date +%s)
        print_warning "Not in a git repository, using timestamp as tag: $IMAGE_TAG"
    fi
else
    print_info "Using specified tag: $IMAGE_TAG"
fi
echo ""

# Step 3: Build Docker image (unless push-only)
if [ "$PUSH_ONLY" = false ]; then
    print_info "Building Docker image..."

    # Build the image
    if docker build -t portyfoul:$IMAGE_TAG -t portyfoul:latest .; then
        print_success "Docker image built successfully"
        print_success "Tagged as: portyfoul:$IMAGE_TAG"
        print_success "Tagged as: portyfoul:latest"
    else
        print_error "Docker build failed"
        exit 1
    fi
    echo ""
fi

# Exit here if build-only
if [ "$BUILD_ONLY" = true ]; then
    print_success "Build complete (skipping push as requested)"
    exit 0
fi

# Step 4: Authenticate with ECR
print_info "Authenticating with ECR..."
if aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_URI" > /dev/null 2>&1; then
    print_success "Successfully authenticated with ECR"
else
    print_error "ECR authentication failed"
    exit 1
fi
echo ""

# Step 5: Tag images for ECR
print_info "Tagging images for ECR..."
docker tag portyfoul:$IMAGE_TAG $ECR_URI:$IMAGE_TAG
docker tag portyfoul:latest $ECR_URI:latest
print_success "Images tagged for ECR"
echo ""

# Step 6: Push images to ECR
print_info "Pushing images to ECR..."
print_info "Pushing $ECR_URI:$IMAGE_TAG..."
if docker push $ECR_URI:$IMAGE_TAG; then
    print_success "Pushed $ECR_URI:$IMAGE_TAG"
else
    print_error "Failed to push tagged image"
    exit 1
fi

print_info "Pushing $ECR_URI:latest..."
if docker push $ECR_URI:latest; then
    print_success "Pushed $ECR_URI:latest"
else
    print_error "Failed to push latest image"
    exit 1
fi
echo ""

# Print summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Deployment complete!"
echo ""
print_info "Image tags pushed:"
echo "  • $ECR_URI:$IMAGE_TAG"
echo "  • $ECR_URI:latest"
echo ""
print_info "To use this image in ECS:"
echo "  Image URI: $ECR_URI:$IMAGE_TAG"
echo ""
