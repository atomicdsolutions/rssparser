#!/bin/bash

# RSS Feed Parser with Full Supabase Stack Startup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_error "docker-compose is not installed. Please install docker-compose."
        exit 1
    fi
    
    print_success "Docker is running"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Copy Supabase environment file
    if [ ! -f ".env" ]; then
        cp .env.supabase .env
        print_success "Created .env from .env.supabase"
    else
        print_status ".env file already exists"
    fi
}

# Function to start services
start_services() {
    print_status "Building and starting Supabase stack..."
    
    # Stop any running services first
    docker-compose -f docker-compose.supabase.yml down 2>/dev/null || true
    
    # Pull latest images
    print_status "Pulling latest Supabase images..."
    docker-compose -f docker-compose.supabase.yml pull
    
    # Build custom services
    print_status "Building custom service images..."
    docker-compose -f docker-compose.supabase.yml build
    
    # Start services in the right order
    print_status "Starting core services..."
    docker-compose -f docker-compose.supabase.yml up -d db vector
    
    # Wait for database
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start Supabase services
    print_status "Starting Supabase services..."
    docker-compose -f docker-compose.supabase.yml up -d auth rest realtime storage imgproxy meta
    
    # Wait for Supabase core
    sleep 15
    
    # Start API Gateway
    print_status "Starting Kong API Gateway..."
    docker-compose -f docker-compose.supabase.yml up -d kong
    
    # Wait for Kong
    sleep 10
    
    # Start Studio
    print_status "Starting Supabase Studio..."
    docker-compose -f docker-compose.supabase.yml up -d studio
    
    # Start our application services
    print_status "Starting RSS Feed Parser services..."
    docker-compose -f docker-compose.supabase.yml up -d consul feed-parser web-api scheduler frontend
    
    # Start reverse proxy
    sleep 5
    docker-compose -f docker-compose.supabase.yml up -d nginx
    
    print_success "All services started"
}

# Function to wait for services
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    local max_attempts=90
    local attempt=0
    
    # Wait for database
    print_status "Waiting for PostgreSQL..."
    while [ $attempt -lt 30 ]; do
        attempt=$((attempt + 1))
        
        if docker-compose -f docker-compose.supabase.yml exec -T db pg_isready -U supabase_admin -d supabase >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        
        if [ $attempt -eq 30 ]; then
            print_error "PostgreSQL failed to start within timeout"
            return 1
        fi
        
        echo -n "."
        sleep 2
    done
    echo ""
    
    # Wait for Kong (Supabase API Gateway)
    print_status "Waiting for Supabase API Gateway..."
    attempt=0
    while [ $attempt -lt 30 ]; do
        attempt=$((attempt + 1))
        
        if curl -s -f "http://localhost:8000" >/dev/null 2>&1; then
            print_success "Supabase API Gateway is ready"
            break
        fi
        
        if [ $attempt -eq 30 ]; then
            print_warning "Supabase API Gateway may not be ready yet"
            break
        fi
        
        echo -n "."
        sleep 2
    done
    echo ""
    
    # Wait for our application services
    local services=("feed-parser:8001" "web-api:8002" "frontend:3000")
    
    for service in "${services[@]}"; do
        local service_name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        print_status "Waiting for $service_name..."
        
        local attempt=0
        while [ $attempt -lt 30 ]; do
            attempt=$((attempt + 1))
            
            if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1 || curl -s -f "http://localhost:$port" >/dev/null 2>&1; then
                print_success "$service_name is ready"
                break
            fi
            
            if [ $attempt -eq 30 ]; then
                print_warning "$service_name may not be ready yet"
                break
            fi
            
            echo -n "."
            sleep 2
        done
        echo ""
    done
}

# Function to validate services
validate_services() {
    print_status "Validating Supabase and application services..."
    
    # Test Supabase API
    print_status "Testing Supabase REST API..."
    if curl -s -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NzQ3NTAzMDAsCiAgICAiZXhwIjogMTgzMjUxNjcwMAp9.Gic8YSxj5HqxG0LlnLtJ0z6Pjw3dCj8qGhNpRHlcB5A" \
       "http://localhost:8000/rest/v1/feeds?select=*" >/dev/null 2>&1; then
        print_success "Supabase REST API is working"
    else
        print_warning "Supabase REST API test failed"
    fi
    
    # Test feed parser
    print_status "Testing Feed Parser Service..."
    if curl -s -f "http://localhost:8001/health" | grep -q "healthy"; then
        print_success "Feed Parser Service is healthy"
    else
        print_warning "Feed Parser Service health check failed"
    fi
    
    # Test web API
    print_status "Testing Web API Service..."
    if curl -s -f "http://localhost:8002/health" | grep -q "healthy"; then
        print_success "Web API Service is healthy"
    else
        print_warning "Web API Service health check failed"
    fi
    
    # Test frontend
    print_status "Testing Frontend Service..."
    if curl -s -f "http://localhost:3000" >/dev/null 2>&1; then
        print_success "Frontend Service is healthy"
    else
        print_warning "Frontend Service may not be ready yet"
    fi
    
    # Test Supabase Studio
    print_status "Testing Supabase Studio..."
    if curl -s -f "http://localhost:3001" >/dev/null 2>&1; then
        print_success "Supabase Studio is accessible"
    else
        print_warning "Supabase Studio may not be ready yet"
    fi
}

# Function to show service status and URLs
show_status() {
    echo ""
    print_status "Service Status:"
    docker-compose -f docker-compose.supabase.yml ps
    
    echo ""
    print_success "🎉 RSS Feed Parser with Supabase is running!"
    echo ""
    print_status "Application URLs:"
    echo "  📱 Frontend:       http://localhost:3000"
    echo "  🔗 Web API:        http://localhost:8002"
    echo "  🔍 Feed Parser:    http://localhost:8001"
    echo "  🌐 Nginx Proxy:    http://localhost:80"
    echo ""
    print_status "Supabase URLs:"
    echo "  🚀 Supabase API:   http://localhost:8000"
    echo "  📊 Studio (Admin): http://localhost:3001"
    echo "  💾 Database:       localhost:5433 (user: supabase_admin, db: supabase)"
    echo ""
    print_status "Other Services:"
    echo "  🗂️  Consul UI:      http://localhost:8500"
    echo ""
    print_status "Supabase Configuration:"
    echo "  🔑 Anon Key:       eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NzQ3NTAzMDAsCiAgICAiZXhwIjogMTgzMjUxNjcwMAp9.Gic8YSxj5HqxG0LlnLtJ0z6Pjw3dCj8qGhNpRHlcB5A"
    echo "  🔐 Service Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZSIsCiAgICAiaWF0IjogMTY3NDc1MDMwMCwKICAgICJleHAiOiAxODMyNTE2NzAwCn0.fZJEP4aO6s6X8a6xnXfhMF2bJ5F6R1WQO8d4D5K8Tc4"
    echo ""
}

# Function to add test feeds
add_test_feeds() {
    print_status "Adding test feeds..."
    sleep 5  # Give services time to fully start
    
    local feeds=(
        '{"url": "https://feeds.simplecast.com/fPtxrgCC", "name": "Test Podcast 1 - Supabase", "description": "Sample podcast feed with Supabase", "category": "Podcasts"}'
        '{"url": "https://feeds.simplecast.com/pGL9tdkW", "name": "Test Podcast 2 - Supabase", "description": "Another sample podcast feed with Supabase", "category": "Podcasts"}'
        '{"url": "https://cheeseonmycracker.com/feed/", "name": "Cheese Blog - Supabase", "description": "Food blog RSS feed with Supabase", "category": "Blogs"}'
    )
    
    for feed in "${feeds[@]}"; do
        if curl -s -X POST -H "Content-Type: application/json" -d "$feed" "http://localhost:8002/feeds" >/dev/null 2>&1; then
            local feed_name=$(echo "$feed" | grep -o '"name": "[^"]*"' | cut -d'"' -f4)
            print_success "Added feed: $feed_name"
        else
            print_warning "Failed to add feed (may already exist)"
        fi
    done
}

# Function to show logs
show_logs() {
    print_status "Showing service logs (press Ctrl+C to exit)..."
    docker-compose -f docker-compose.supabase.yml logs -f
}

# Main function
main() {
    case "${1:-start}" in
        start)
            print_status "Starting RSS Feed Parser with Full Supabase Stack"
            echo ""
            check_docker
            setup_environment
            start_services
            wait_for_services
            validate_services
            add_test_feeds
            show_status
            ;;
        stop)
            print_status "Stopping all services..."
            docker-compose -f docker-compose.supabase.yml down
            print_success "All services stopped"
            ;;
        restart)
            print_status "Restarting all services..."
            docker-compose -f docker-compose.supabase.yml down
            sleep 2
            main start
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs
            ;;
        clean)
            print_status "Cleaning up all containers and volumes..."
            docker-compose -f docker-compose.supabase.yml down -v --remove-orphans
            docker system prune -f
            print_success "Cleanup completed"
            ;;
        test)
            print_status "Running tests with Supabase..."
            ./scripts/test-feeds.sh full
            ;;
        help|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     Start all services with Supabase (default)"
            echo "  stop      Stop all services"
            echo "  restart   Restart all services" 
            echo "  status    Show service status and URLs"
            echo "  logs      Show service logs"
            echo "  clean     Clean up containers and volumes"
            echo "  test      Run feed parsing tests"
            echo "  help      Show this help"
            echo ""
            echo "This script starts the complete RSS Feed Parser with:"
            echo "  • Full Supabase stack (Auth, Storage, Realtime, etc.)"
            echo "  • All RSS Feed Parser microservices"
            echo "  • Consul service discovery"
            echo "  • Nginx reverse proxy"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"