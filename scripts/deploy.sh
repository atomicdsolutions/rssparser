#!/bin/bash

# RSS Feed Parser Deployment Script
# Deploy all services to HashiCorp Nomad cluster

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NOMAD_ADDR=${NOMAD_ADDR:-"http://localhost:4646"}
CONSUL_ADDR=${CONSUL_ADDR:-"http://localhost:8500"}
DEPLOYMENT_TIMEOUT=${DEPLOYMENT_TIMEOUT:-300}

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local service_name=$1
    print_status "Checking if $service_name is running..."
    
    if curl -s "$NOMAD_ADDR/v1/jobs" | grep -q "\"$service_name\""; then
        print_success "$service_name is running"
        return 0
    else
        print_warning "$service_name is not running"
        return 1
    fi
}

# Function to wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local timeout=$2
    local count=0
    
    print_status "Waiting for $service_name to be healthy..."
    
    while [ $count -lt $timeout ]; do
        if curl -s "$CONSUL_ADDR/v1/health/service/$service_name?passing" | grep -q "\"$service_name\""; then
            print_success "$service_name is healthy"
            return 0
        fi
        
        sleep 5
        count=$((count + 5))
        echo -n "."
    done
    
    print_error "$service_name failed to become healthy within $timeout seconds"
    return 1
}

# Function to deploy a single job
deploy_job() {
    local job_file=$1
    local job_name=$2
    
    print_status "Deploying $job_name..."
    
    if ! nomad job validate "$job_file"; then
        print_error "Job validation failed for $job_name"
        return 1
    fi
    
    if nomad job run "$job_file"; then
        print_success "$job_name deployment initiated"
        return 0
    else
        print_error "Failed to deploy $job_name"
        return 1
    fi
}

# Function to setup Consul KV store
setup_consul_kv() {
    print_status "Setting up Consul KV store..."
    
    # Check if consul command is available
    if ! command -v consul &> /dev/null; then
        print_warning "Consul CLI not found, skipping KV setup"
        return 0
    fi
    
    # Load KV configuration
    if [ -f "infrastructure/consul/kv-config.hcl" ]; then
        print_status "Loading Consul KV configuration..."
        
        # Parse and load KV pairs (simplified approach)
        while IFS= read -r line; do
            if [[ $line =~ ^config/.*=.* ]]; then
                key=$(echo "$line" | cut -d'=' -f1 | xargs)
                value=$(echo "$line" | cut -d'=' -f2- | xargs | sed 's/^"//' | sed 's/"$//')
                
                if [ ! -z "$key" ] && [ ! -z "$value" ]; then
                    consul kv put "$key" "$value"
                    print_status "Set $key"
                fi
            fi
        done < "infrastructure/consul/kv-config.hcl"
        
        print_success "Consul KV configuration loaded"
    else
        print_warning "Consul KV configuration file not found"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Nomad
    if ! curl -s "$NOMAD_ADDR/v1/status/leader" > /dev/null; then
        print_error "Cannot connect to Nomad at $NOMAD_ADDR"
        exit 1
    fi
    print_success "Nomad is accessible"
    
    # Check Consul
    if ! curl -s "$CONSUL_ADDR/v1/status/leader" > /dev/null; then
        print_error "Cannot connect to Consul at $CONSUL_ADDR"
        exit 1
    fi
    print_success "Consul is accessible"
    
    # Check required files
    local required_files=(
        "infrastructure/nomad/feed-parser.hcl"
        "infrastructure/nomad/web-api.hcl"
        "infrastructure/nomad/scheduler.hcl"
        "infrastructure/nomad/frontend.hcl"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Required file not found: $file"
            exit 1
        fi
    done
    print_success "All required files found"
}

# Function to show deployment status
show_status() {
    print_status "Current deployment status:"
    echo ""
    
    # Show Nomad jobs
    print_status "Nomad Jobs:"
    nomad job status 2>/dev/null | grep -E "(feed-parser|web-api|scheduler|frontend)" || print_warning "No RSS Feed Parser jobs found"
    
    echo ""
    
    # Show Consul services
    print_status "Consul Services:"
    curl -s "$CONSUL_ADDR/v1/catalog/services" | grep -E "(feed-parser|web-api|scheduler|frontend)" || print_warning "No RSS Feed Parser services found"
    
    echo ""
}

# Main deployment function
main() {
    print_status "Starting RSS Feed Parser deployment"
    echo ""
    
    # Parse command line arguments
    DEPLOY_ALL=true
    SERVICES=()
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                DEPLOY_ALL=false
                SERVICES+=("$2")
                shift 2
                ;;
            --status)
                show_status
                exit 0
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --service <name>    Deploy specific service (feed-parser, web-api, scheduler, frontend)"
                echo "  --status           Show current deployment status"
                echo "  --help             Show this help message"
                echo ""
                echo "Environment Variables:"
                echo "  NOMAD_ADDR         Nomad server address (default: http://localhost:4646)"
                echo "  CONSUL_ADDR        Consul server address (default: http://localhost:8500)"
                echo "  DEPLOYMENT_TIMEOUT Timeout for health checks (default: 300 seconds)"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Setup Consul KV store
    setup_consul_kv
    
    # Deploy services
    if [ "$DEPLOY_ALL" = true ]; then
        SERVICES=("feed-parser" "web-api" "scheduler" "frontend")
    fi
    
    for service in "${SERVICES[@]}"; do
        case $service in
            feed-parser)
                deploy_job "infrastructure/nomad/feed-parser.hcl" "feed-parser"
                wait_for_service "feed-parser" 60
                ;;
            web-api)
                deploy_job "infrastructure/nomad/web-api.hcl" "web-api"
                wait_for_service "web-api" 60
                ;;
            scheduler)
                deploy_job "infrastructure/nomad/scheduler.hcl" "scheduler"
                sleep 30  # Scheduler doesn't have HTTP health check
                ;;
            frontend)
                deploy_job "infrastructure/nomad/frontend.hcl" "frontend"
                wait_for_service "frontend" 120  # Frontend takes longer to build
                ;;
            *)
                print_error "Unknown service: $service"
                exit 1
                ;;
        esac
    done
    
    echo ""
    print_success "Deployment completed!"
    
    # Show final status
    show_status
    
    # Show access URLs
    echo ""
    print_status "Access URLs:"
    echo "  Frontend: http://feedreader.local"
    echo "  API:      http://api.feedreader.local"
    echo "  Parser:   http://parser.feedreader.local"
    echo ""
    print_status "Make sure to update your /etc/hosts file or DNS to point these domains to your load balancer"
}

# Run main function
main "$@"