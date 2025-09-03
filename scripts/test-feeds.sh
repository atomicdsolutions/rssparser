#!/bin/bash

# RSS Feed Parser Testing Script
# Test the application with your provided feeds

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

# API Base URL
API_URL="http://localhost:8002"
PARSER_URL="http://localhost:8001"

# Test feeds provided by user
TEST_FEEDS=(
    '{"url": "https://feeds.simplecast.com/fPtxrgCC", "name": "Feed Test 1 - Podcast", "description": "First test podcast feed", "category": "Podcasts"}'
    '{"url": "https://feeds.simplecast.com/pGL9tdkW", "name": "Feed Test 2 - Podcast", "description": "Second test podcast feed", "category": "Podcasts"}'
    '{"url": "https://cheeseonmycracker.com/feed/", "name": "Feed Test 3 - Blog", "description": "Test food blog feed", "category": "Blogs"}'
)

# Function to test API health
test_api_health() {
    print_status "Testing API health..."
    
    if curl -s -f "$API_URL/health" | grep -q "healthy"; then
        print_success "Web API is healthy"
    else
        print_error "Web API health check failed"
        return 1
    fi
    
    if curl -s -f "$PARSER_URL/health" | grep -q "healthy"; then
        print_success "Feed Parser is healthy"
    else
        print_error "Feed Parser health check failed"
        return 1
    fi
}

# Function to test feed parsing directly
test_direct_parsing() {
    print_status "Testing direct feed parsing..."
    
    local test_url="https://feeds.simplecast.com/fPtxrgCC"
    local response
    
    print_status "Parsing feed: $test_url"
    
    if response=$(curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"url\": \"$test_url\"}" \
        "$PARSER_URL/parse"); then
        
        # Check if response contains expected fields
        if echo "$response" | grep -q '"feed_title"' && echo "$response" | grep -q '"items"'; then
            local item_count=$(echo "$response" | grep -o '"items":\[[^]]*\]' | grep -o '\[.*\]' | jq '. | length' 2>/dev/null || echo "unknown")
            print_success "Direct parsing successful - Found $item_count items"
            
            # Show sample data
            echo "$response" | jq '.feed_title, .feed_description, (.items | length)' 2>/dev/null || echo "Raw response: ${response:0:200}..."
        else
            print_error "Direct parsing returned unexpected response"
            echo "Response: ${response:0:200}..."
            return 1
        fi
    else
        print_error "Direct parsing failed"
        return 1
    fi
}

# Function to add test feeds
add_test_feeds() {
    print_status "Adding test feeds to the system..."
    
    local added_feeds=()
    
    for feed in "${TEST_FEEDS[@]}"; do
        local feed_name=$(echo "$feed" | grep -o '"name": "[^"]*"' | cut -d'"' -f4)
        print_status "Adding: $feed_name"
        
        local response
        if response=$(curl -s -X POST -H "Content-Type: application/json" -d "$feed" "$API_URL/feeds"); then
            if echo "$response" | grep -q '"id"'; then
                local feed_id=$(echo "$response" | grep -o '"id": "[^"]*"' | cut -d'"' -f4)
                print_success "Added feed: $feed_name (ID: $feed_id)"
                added_feeds+=("$feed_id")
            else
                print_warning "Feed may already exist: $feed_name"
            fi
        else
            print_error "Failed to add feed: $feed_name"
        fi
    done
    
    echo "${added_feeds[@]}"
}

# Function to refresh feeds and test processing
test_feed_processing() {
    print_status "Testing feed processing..."
    
    # Get all feeds
    local feeds_response
    if feeds_response=$(curl -s "$API_URL/feeds"); then
        print_success "Retrieved feeds list"
        
        # Extract feed IDs
        local feed_ids
        feed_ids=$(echo "$feeds_response" | grep -o '"id": "[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$feed_ids" ]; then
            local count=0
            while IFS= read -r feed_id; do
                if [ -n "$feed_id" ]; then
                    print_status "Refreshing feed: $feed_id"
                    
                    if refresh_response=$(curl -s -X POST "$API_URL/feeds/$feed_id/refresh"); then
                        if echo "$refresh_response" | grep -q '"items_processed"'; then
                            local items_processed=$(echo "$refresh_response" | grep -o '"items_processed": [0-9]*' | cut -d':' -f2 | tr -d ' ')
                            print_success "Feed refreshed - Processed $items_processed items"
                            count=$((count + 1))
                        else
                            print_warning "Feed refresh completed but no processing count returned"
                        fi
                    else
                        print_warning "Failed to refresh feed: $feed_id"
                    fi
                    
                    sleep 2  # Brief delay between refreshes
                fi
            done <<< "$feed_ids"
            
            print_success "Refreshed $count feeds"
        else
            print_warning "No feeds found to refresh"
        fi
    else
        print_error "Failed to retrieve feeds list"
        return 1
    fi
}

# Function to test dashboard and items
test_dashboard_and_items() {
    print_status "Testing dashboard and items..."
    
    # Test dashboard stats
    if dashboard_response=$(curl -s "$API_URL/dashboard"); then
        if echo "$dashboard_response" | grep -q '"total_feeds"'; then
            local total_feeds=$(echo "$dashboard_response" | grep -o '"total_feeds": [0-9]*' | cut -d':' -f2 | tr -d ' ')
            local total_items=$(echo "$dashboard_response" | grep -o '"total_items": [0-9]*' | cut -d':' -f2 | tr -d ' ')
            print_success "Dashboard stats: $total_feeds feeds, $total_items items"
        else
            print_warning "Dashboard returned unexpected response"
        fi
    else
        print_error "Failed to get dashboard stats"
    fi
    
    # Test items endpoint
    if items_response=$(curl -s "$API_URL/items?limit=5"); then
        local item_count=$(echo "$items_response" | jq '. | length' 2>/dev/null || echo "unknown")
        print_success "Retrieved $item_count recent items"
        
        # Show sample item titles
        if command -v jq >/dev/null 2>&1; then
            echo "$items_response" | jq -r '.[].title' | head -3 | while read -r title; do
                print_status "Sample item: $title"
            done
        fi
    else
        print_error "Failed to get items"
    fi
}

# Function to test frontend
test_frontend() {
    print_status "Testing frontend availability..."
    
    if curl -s -f "http://localhost:3000" >/dev/null 2>&1; then
        print_success "Frontend is accessible at http://localhost:3000"
        
        # Check if it returns HTML
        if curl -s "http://localhost:3000" | grep -q "<html"; then
            print_success "Frontend returned valid HTML"
        else
            print_warning "Frontend response doesn't look like HTML"
        fi
    else
        print_error "Frontend is not accessible"
        return 1
    fi
}

# Function to run comprehensive test
run_full_test() {
    print_status "Running comprehensive RSS Feed Parser test"
    echo ""
    
    # Test 1: Health checks
    test_api_health || return 1
    echo ""
    
    # Test 2: Direct parsing
    test_direct_parsing || return 1
    echo ""
    
    # Test 3: Add feeds
    print_status "Adding test feeds..."
    add_test_feeds
    echo ""
    
    # Wait a moment for feeds to be added
    sleep 3
    
    # Test 4: Process feeds
    test_feed_processing || return 1
    echo ""
    
    # Wait for processing to complete
    sleep 5
    
    # Test 5: Dashboard and items
    test_dashboard_and_items || return 1
    echo ""
    
    # Test 6: Frontend
    test_frontend || return 1
    echo ""
    
    print_success "All tests passed! 🎉"
    
    echo ""
    print_status "Your RSS Feed Parser is working correctly!"
    print_status "Access the application at:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • API Docs: http://localhost:8002"
    echo "  • Consul UI: http://localhost:8500"
}

# Main function
main() {
    case "${1:-full}" in
        full)
            run_full_test
            ;;
        health)
            test_api_health
            ;;
        parse)
            test_direct_parsing
            ;;
        feeds)
            add_test_feeds
            ;;
        process)
            test_feed_processing
            ;;
        dashboard)
            test_dashboard_and_items
            ;;
        frontend)
            test_frontend
            ;;
        help|--help|-h)
            echo "Usage: $0 [test]"
            echo ""
            echo "Tests:"
            echo "  full        Run all tests (default)"
            echo "  health      Test service health"
            echo "  parse       Test direct feed parsing"
            echo "  feeds       Add test feeds"
            echo "  process     Test feed processing"
            echo "  dashboard   Test dashboard and items"
            echo "  frontend    Test frontend"
            echo "  help        Show this help"
            ;;
        *)
            print_error "Unknown test: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"