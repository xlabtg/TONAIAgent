#!/bin/bash
# TON AI Agent - Deployment Script
#
# Usage:
#   ./deploy.sh [platform] [environment]
#
# Platforms: vercel, docker, aws, k8s
# Environments: development, staging, production
#
# Examples:
#   ./deploy.sh docker development
#   ./deploy.sh vercel production
#   ./deploy.sh aws production

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PLATFORM="${1:-docker}"
ENVIRONMENT="${2:-development}"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements for $PLATFORM deployment..."

    case $PLATFORM in
        vercel)
            if ! command -v vercel &> /dev/null; then
                log_error "Vercel CLI not found. Install with: npm i -g vercel"
                exit 1
            fi
            ;;
        docker)
            if ! command -v docker &> /dev/null; then
                log_error "Docker not found. Please install Docker."
                exit 1
            fi
            if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
                log_error "Docker Compose not found. Please install Docker Compose."
                exit 1
            fi
            ;;
        aws)
            if ! command -v aws &> /dev/null; then
                log_error "AWS CLI not found. Please install AWS CLI."
                exit 1
            fi
            if ! command -v terraform &> /dev/null; then
                log_error "Terraform not found. Please install Terraform."
                exit 1
            fi
            ;;
        k8s)
            if ! command -v kubectl &> /dev/null; then
                log_error "kubectl not found. Please install kubectl."
                exit 1
            fi
            if ! command -v helm &> /dev/null; then
                log_error "Helm not found. Please install Helm."
                exit 1
            fi
            ;;
        *)
            log_error "Unknown platform: $PLATFORM"
            echo "Supported platforms: vercel, docker, aws, k8s"
            exit 1
            ;;
    esac

    log_success "All requirements satisfied"
}

deploy_vercel() {
    log_info "Deploying to Vercel ($ENVIRONMENT)..."

    cd "$PROJECT_ROOT"

    if [ "$ENVIRONMENT" == "production" ]; then
        vercel --prod
    else
        vercel
    fi

    log_success "Deployed to Vercel"
}

deploy_docker() {
    log_info "Deploying with Docker Compose ($ENVIRONMENT)..."

    cd "$PROJECT_ROOT/deploy/docker"

    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            log_warning ".env file not found, copying from .env.example"
            cp .env.example .env
            log_warning "Please edit .env with your configuration"
        else
            log_error ".env file not found"
            exit 1
        fi
    fi

    # Determine compose file
    if [ "$ENVIRONMENT" == "development" ]; then
        COMPOSE_FILE="docker-compose.dev.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi

    # Pull latest images
    log_info "Pulling latest images..."
    docker compose -f "$COMPOSE_FILE" pull || true

    # Build and start
    log_info "Building and starting services..."
    docker compose -f "$COMPOSE_FILE" up -d --build

    # Wait for health check
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        log_success "Deployment healthy!"
    else
        log_warning "Health check pending... Services may still be starting"
    fi

    # Show status
    docker compose -f "$COMPOSE_FILE" ps

    log_success "Deployed with Docker Compose"
}

deploy_aws() {
    log_info "Deploying to AWS ($ENVIRONMENT)..."

    cd "$PROJECT_ROOT/deploy/aws/terraform"

    # Check for terraform.tfvars
    if [ ! -f "terraform.tfvars" ]; then
        log_error "terraform.tfvars not found. Copy from terraform.tfvars.example"
        exit 1
    fi

    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init

    # Plan
    log_info "Planning deployment..."
    terraform plan -out=tfplan

    # Confirm deployment
    read -p "Do you want to apply this plan? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Applying Terraform plan..."
        terraform apply tfplan

        # Get outputs
        log_info "Deployment outputs:"
        terraform output

        log_success "Deployed to AWS"
    else
        log_info "Deployment cancelled"
    fi
}

deploy_k8s() {
    log_info "Deploying to Kubernetes ($ENVIRONMENT)..."

    cd "$PROJECT_ROOT/deploy/kubernetes/helm"

    NAMESPACE="tonaiagent-${ENVIRONMENT}"
    RELEASE_NAME="tonaiagent"

    # Add Bitnami repo
    log_info "Adding Helm repositories..."
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update

    # Check for values file
    VALUES_FILE="values-${ENVIRONMENT}.yaml"
    if [ -f "$VALUES_FILE" ]; then
        VALUES_ARG="-f $VALUES_FILE"
    else
        VALUES_ARG=""
        log_warning "No $VALUES_FILE found, using default values"
    fi

    # Lint chart
    log_info "Linting Helm chart..."
    helm lint tonaiagent

    # Deploy
    log_info "Deploying Helm chart..."
    helm upgrade --install "$RELEASE_NAME" tonaiagent \
        --namespace "$NAMESPACE" \
        --create-namespace \
        $VALUES_ARG \
        --wait \
        --timeout 10m

    # Verify
    log_info "Verifying deployment..."
    kubectl rollout status deployment/"$RELEASE_NAME" -n "$NAMESPACE"

    # Show pods
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=tonaiagent

    log_success "Deployed to Kubernetes"
}

# Main
echo ""
echo "=========================================="
echo "  TON AI Agent Deployment Script"
echo "=========================================="
echo ""
log_info "Platform: $PLATFORM"
log_info "Environment: $ENVIRONMENT"
echo ""

check_requirements

case $PLATFORM in
    vercel)
        deploy_vercel
        ;;
    docker)
        deploy_docker
        ;;
    aws)
        deploy_aws
        ;;
    k8s)
        deploy_k8s
        ;;
esac

echo ""
log_success "Deployment complete!"
echo ""
