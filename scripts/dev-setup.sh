#!/bin/bash

# RSS Feed Parser Development Setup Script
# Sets up the development environment

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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."
    
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_status "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install main requirements
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    print_success "Python dependencies installed"
}

# Function to setup Node.js environment
setup_node_env() {
    print_status "Setting up Node.js environment..."
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        return 1
    fi
    
    # Install frontend dependencies
    cd services/frontend
    
    print_status "Installing Node.js dependencies..."
    npm install
    
    cd ../..
    print_success "Node.js dependencies installed"
}

# Function to setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # Main .env file
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please update .env with your actual configuration values"
    else
        print_status ".env file already exists"
    fi
    
    # Service-specific env files
    for service in feed-parser web-api scheduler; do
        if [ ! -f "services/$service/.env" ]; then
            cp .env.example "services/$service/.env"
            print_success "Created .env file for $service"
        fi
    done
}

# Function to setup database
setup_database() {
    print_status "Setting up database schema..."
    
    if [ -f "database/schema/tables.sql" ]; then
        print_status "Database schema file found: database/schema/tables.sql"
        print_warning "Please run this SQL file in your Supabase project:"
        echo "  1. Go to your Supabase dashboard"
        echo "  2. Navigate to SQL Editor"
        echo "  3. Copy and run the contents of database/schema/tables.sql"
        print_success "Database setup instructions provided"
    else
        print_error "Database schema file not found"
    fi
}

# Function to create test data
create_test_data() {
    print_status "Creating test feed data..."
    
    # Create a simple test script
    cat > scripts/add_test_feeds.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import requests

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def add_test_feeds():
    """Add test feeds to the database via API"""
    api_url = "http://localhost:8002"
    
    test_feeds = [
        {
            "url": "https://feeds.simplecast.com/fPtxrgCC",
            "name": "Test Podcast 1",
            "description": "Sample podcast feed for testing",
            "category": "Podcasts"
        },
        {
            "url": "https://feeds.simplecast.com/pGL9tdkW", 
            "name": "Test Podcast 2",
            "description": "Another sample podcast feed",
            "category": "Podcasts"
        },
        {
            "url": "https://cheeseonmycracker.com/feed/",
            "name": "Cheese on My Cracker Blog",
            "description": "Food blog RSS feed",
            "category": "Blogs"
        }
    ]
    
    print("Adding test feeds...")
    
    for feed in test_feeds:
        try:
            response = requests.post(f"{api_url}/feeds", json=feed, timeout=10)
            if response.status_code == 200:
                print(f"✓ Added: {feed['name']}")
            else:
                print(f"✗ Failed to add {feed['name']}: {response.status_code}")
        except Exception as e:
            print(f"✗ Error adding {feed['name']}: {e}")
    
    print("Test feeds setup completed!")

if __name__ == "__main__":
    add_test_feeds()
EOF
    
    chmod +x scripts/add_test_feeds.py
    print_success "Test data script created: scripts/add_test_feeds.py"
}

# Function to create development scripts
create_dev_scripts() {
    print_status "Creating development scripts..."
    
    # Start all services script
    cat > scripts/start-dev.sh << 'EOF'
#!/bin/bash

# Start all services in development mode

echo "Starting RSS Feed Parser in development mode..."

# Start services in background
echo "Starting Feed Parser Service..."
cd services/feed-parser && python main.py &
PARSER_PID=$!

echo "Starting Web API Service..."
cd ../web-api && python main.py &
API_PID=$!

echo "Starting Scheduler Service..."
cd ../scheduler && python main.py &
SCHEDULER_PID=$!

echo "Starting Frontend..."
cd ../frontend && npm start &
FRONTEND_PID=$!

cd ../..

echo ""
echo "All services started!"
echo "Frontend: http://localhost:3000"
echo "Web API: http://localhost:8002"
echo "Feed Parser: http://localhost:8001"
echo ""
echo "Process IDs:"
echo "  Parser: $PARSER_PID"
echo "  API: $API_PID" 
echo "  Scheduler: $SCHEDULER_PID"
echo "  Frontend: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap 'echo "Stopping services..."; kill $PARSER_PID $API_PID $SCHEDULER_PID $FRONTEND_PID 2>/dev/null; exit 0' INT

wait
EOF
    
    chmod +x scripts/start-dev.sh
    print_success "Development start script created: scripts/start-dev.sh"
    
    # Stop services script
    cat > scripts/stop-dev.sh << 'EOF'
#!/bin/bash

echo "Stopping RSS Feed Parser services..."

# Kill processes by name
pkill -f "python.*main.py" 2>/dev/null || true
pkill -f "npm.*start" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

echo "All services stopped!"
EOF
    
    chmod +x scripts/stop-dev.sh
    print_success "Development stop script created: scripts/stop-dev.sh"
}

# Function to run tests
run_tests() {
    print_status "Running tests..."
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Run Python tests
    for service in feed-parser web-api; do
        if [ -f "services/$service/test_*.py" ]; then
            print_status "Running tests for $service..."
            cd "services/$service"
            python -m pytest test_*.py -v || print_warning "Tests failed for $service"
            cd ../..
        fi
    done
    
    print_success "Tests completed"
}

# Main setup function
main() {
    print_status "Setting up RSS Feed Parser development environment"
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! command_exists python3; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    if ! command_exists node; then
        print_warning "Node.js is not installed. Frontend setup will be skipped."
        SKIP_FRONTEND=true
    fi
    
    # Setup steps
    setup_python_env
    
    if [ "$SKIP_FRONTEND" != true ]; then
        setup_node_env
    fi
    
    setup_env_files
    setup_database
    create_test_data
    create_dev_scripts
    
    # Optional: Run tests
    if [ "$1" = "--with-tests" ]; then
        run_tests
    fi
    
    echo ""
    print_success "Development environment setup completed!"
    echo ""
    print_status "Next steps:"
    echo "  1. Update .env files with your actual configuration"
    echo "  2. Set up your Supabase project and run the database schema"
    echo "  3. Run './scripts/start-dev.sh' to start all services"
    echo "  4. Run './scripts/add_test_feeds.py' to add test feeds"
    echo ""
    print_status "Development URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Web API:  http://localhost:8002"
    echo "  Parser:   http://localhost:8001"
}

# Run main function
main "$@"