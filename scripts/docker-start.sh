#!/bin/bash

# RSS Feed Parser Docker Compose Startup Script
# Builds and starts all services with validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to prepare the database init script
prepare_database() {
    print_status "Preparing database initialization..."
    
    # Copy the correct init script for Docker
    if [ -f "database/schema/docker-init.sql" ]; then
        mkdir -p database/init
        cp database/schema/docker-init.sql database/init/01-init.sql
        print_success "Database initialization script prepared"
    else
        print_warning "Docker database init script not found, using original"
        mkdir -p database/init
        cp database/schema/tables.sql database/init/01-init.sql
    fi
}

# Function to update the docker-compose file for the init script
update_compose_file() {
    print_status "Updating docker-compose configuration..."
    
    # Create a temporary docker-compose file with the correct volume mapping
    cat > docker-compose.override.yml << 'EOF'
version: '3.8'

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init/01-init.sql:/docker-entrypoint-initdb.d/01-init.sql
EOF
    
    print_success "Docker compose override created"
}

# Function to build and start services
start_services() {
    print_status "Building and starting services..."
    
    # Stop any running services first
    docker-compose down 2>/dev/null || true
    
    # Build images
    print_status "Building Docker images..."
    docker-compose build
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d
    
    print_success "Services started"
}

# Function to wait for services to be healthy
wait_for_services() {
    print_status "Waiting for services to be healthy..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        
        # Check PostgreSQL
        if docker-compose exec -T postgres pg_isready -U feedparser -d feedparser >/dev/null 2>&1; then
            print_success "PostgreSQL is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "PostgreSQL failed to start within timeout"
            return 1
        fi
        
        echo -n "."
        sleep 2
    done
    
    echo ""
    
    # Wait for other services
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
    print_status "Validating services..."
    
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
    
    # Test database
    print_status "Testing Database..."
    if docker-compose exec -T postgres psql -U feedparser -d feedparser -c "SELECT COUNT(*) FROM feeds;" >/dev/null 2>&1; then
        print_success "Database is accessible"
    else
        print_warning "Database connection test failed"
    fi
}

# Function to add test feeds
add_test_feeds() {
    print_status "Adding test feeds..."
    
    local feeds=(
        '{"url": "https://feeds.simplecast.com/fPtxrgCC", "name": "Test Podcast 1", "description": "Sample podcast feed", "category": "Podcasts"}'
        '{"url": "https://feeds.simplecast.com/pGL9tdkW", "name": "Test Podcast 2", "description": "Another sample podcast feed", "category": "Podcasts"}'
        '{"url": "https://cheeseonmycracker.com/feed/", "name": "Cheese on My Cracker Blog", "description": "Food blog RSS feed", "category": "Blogs"}'
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

# Function to show service status
show_status() {
    echo ""
    print_status "Service Status:"
    docker-compose ps
    
    echo ""
    print_status "Service URLs:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Web API:     http://localhost:8002"
    echo "  Feed Parser: http://localhost:8001"
    echo "  Nginx Proxy: http://localhost:80"
    echo "  Consul UI:   http://localhost:8500"
    echo ""
    
    print_status "Database Info:"
    echo "  Host: localhost:5432"
    echo "  Database: feedparser"
    echo "  Username: feedparser" 
    echo "  Password: feedparser_password"
}

# Function to show logs
show_logs() {
    print_status "Showing service logs (press Ctrl+C to exit)..."
    docker-compose logs -f
}

# Main function
main() {
    print_status "Starting RSS Feed Parser with Docker Compose"
    echo ""
    
    # Parse command line arguments
    case "${1:-start}" in
        start)
            check_docker
            prepare_database
            update_compose_file
            start_services
            wait_for_services
            validate_services
            add_test_feeds
            show_status
            ;;
        stop)
            print_status "Stopping services..."
            docker-compose down
            print_success "Services stopped"
            ;;
        restart)
            print_status "Restarting services..."
            docker-compose down
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
            print_status "Cleaning up..."
            docker-compose down -v --remove-orphans
            docker-compose build --no-cache
            print_success "Cleanup completed"
            ;;
        validate)
            validate_services
            ;;
        help|--help|-h)
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start     Start all services (default)"
            echo "  stop      Stop all services"
            echo "  restart   Restart all services" 
            echo "  status    Show service status"
            echo "  logs      Show service logs"
            echo "  clean     Clean up and rebuild"
            echo "  validate  Validate services"
            echo "  help      Show this help"
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