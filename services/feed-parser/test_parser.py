import pytest
import httpx
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_root_endpoint():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert "service" in response.json()

def test_parse_valid_feed():
    """Test parsing a valid RSS feed"""
    test_feed = {
        "url": "https://feeds.feedburner.com/TechCrunch",
        "name": "TechCrunch"
    }
    
    response = client.post("/parse", json=test_feed)
    assert response.status_code == 200
    
    data = response.json()
    assert "feed_url" in data
    assert "feed_title" in data
    assert "items" in data
    assert isinstance(data["items"], list)

def test_parse_invalid_feed():
    """Test parsing an invalid RSS feed"""
    test_feed = {
        "url": "https://invalid-feed-url.com/feed.xml"
    }
    
    response = client.post("/parse", json=test_feed)
    assert response.status_code == 500

def test_batch_parse():
    """Test batch parsing multiple feeds"""
    test_feeds = [
        {"url": "https://feeds.feedburner.com/TechCrunch"},
        {"url": "https://invalid-feed.com/feed.xml"}
    ]
    
    response = client.post("/parse-batch", json=test_feeds)
    assert response.status_code == 200
    
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 2

if __name__ == "__main__":
    pytest.main([__file__])