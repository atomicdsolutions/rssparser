from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import httpx
import logging
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import asyncio
import consul

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RSS Web API Service",
    description="REST API service for RSS feed data management",
    version="1.0.0"
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

# Consul client for service discovery
consul_client = consul.Consul(
    host=os.getenv("CONSUL_HOST", "localhost"),
    port=int(os.getenv("CONSUL_PORT", "8500"))
)

# Models
class FeedSubscription(BaseModel):
    url: HttpUrl
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    active: bool = True

class FeedUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    active: Optional[bool] = None

class FeedItemResponse(BaseModel):
    id: str
    feed_id: str
    title: str
    description: str
    link: str
    published: Optional[datetime]
    author: Optional[str]
    content: Optional[str]
    images: List[str]
    media_urls: List[str]
    tags: List[str]
    created_at: datetime

class FeedResponse(BaseModel):
    id: str
    url: str
    name: str
    description: Optional[str]
    category: Optional[str]
    active: bool
    last_updated: Optional[datetime]
    item_count: int
    created_at: datetime

class DashboardStats(BaseModel):
    total_feeds: int
    total_items: int
    active_feeds: int
    recent_items: int
    categories: Dict[str, int]

# Service Discovery
async def get_feed_parser_url():
    """Get feed parser service URL from Consul"""
    try:
        _, services = consul_client.health.service('feed-parser', passing=True)
        if services:
            service = services[0]['Service']
            return f"http://{service['Address']}:{service['Port']}"
        else:
            return os.getenv("FEED_PARSER_URL", "http://localhost:8001")
    except:
        return os.getenv("FEED_PARSER_URL", "http://localhost:8001")

# Database operations
class DatabaseManager:
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def create_feed(self, feed_data: FeedSubscription) -> Dict:
        """Create new feed subscription"""
        try:
            result = self.supabase.table('feeds').insert({
                'url': str(feed_data.url),
                'name': feed_data.name,
                'description': feed_data.description,
                'category': feed_data.category,
                'active': feed_data.active,
                'created_at': datetime.now().isoformat()
            }).execute()
            
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating feed: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to create feed")

    async def get_feeds(self, category: Optional[str] = None, active_only: bool = True) -> List[Dict]:
        """Get all feeds with optional filtering"""
        try:
            query = self.supabase.table('feeds').select('*')
            
            if active_only:
                query = query.eq('active', True)
            
            if category:
                query = query.eq('category', category)
            
            result = query.execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching feeds: {str(e)}")
            return []

    async def get_feed_by_id(self, feed_id: str) -> Optional[Dict]:
        """Get specific feed by ID"""
        try:
            result = self.supabase.table('feeds').select('*').eq('id', feed_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error fetching feed {feed_id}: {str(e)}")
            return None

    async def update_feed(self, feed_id: str, update_data: FeedUpdate) -> Optional[Dict]:
        """Update feed information"""
        try:
            update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
            result = self.supabase.table('feeds').update(update_dict).eq('id', feed_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating feed {feed_id}: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to update feed")

    async def delete_feed(self, feed_id: str) -> bool:
        """Delete feed and all its items"""
        try:
            # Delete feed items first
            self.supabase.table('feed_items').delete().eq('feed_id', feed_id).execute()
            # Delete feed
            self.supabase.table('feeds').delete().eq('id', feed_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting feed {feed_id}: {str(e)}")
            return False

    async def get_feed_items(self, feed_id: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get feed items with pagination"""
        try:
            query = self.supabase.table('feed_items').select('*').order('published', desc=True)
            
            if feed_id:
                query = query.eq('feed_id', feed_id)
            
            result = query.limit(limit).offset(offset).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching feed items: {str(e)}")
            return []

    async def store_feed_items(self, feed_id: str, items: List[Dict]) -> bool:
        """Store parsed feed items"""
        try:
            # Prepare items for insertion
            db_items = []
            for item in items:
                db_items.append({
                    'feed_id': feed_id,
                    'title': item.get('title', ''),
                    'description': item.get('description', ''),
                    'link': item.get('link', ''),
                    'published': item.get('published'),
                    'author': item.get('author'),
                    'content': item.get('content'),
                    'images': item.get('images', []),
                    'media_urls': item.get('media_urls', []),
                    'tags': item.get('tags', []),
                    'created_at': datetime.now().isoformat()
                })
            
            # Insert items (upsert to handle duplicates)
            result = self.supabase.table('feed_items').upsert(db_items).execute()
            
            # Update feed last_updated timestamp
            self.supabase.table('feeds').update({
                'last_updated': datetime.now().isoformat()
            }).eq('id', feed_id).execute()
            
            return True
        except Exception as e:
            logger.error(f"Error storing feed items: {str(e)}")
            return False

    async def get_dashboard_stats(self) -> DashboardStats:
        """Get dashboard statistics"""
        try:
            # Get feed counts
            feeds_result = self.supabase.table('feeds').select('*').execute()
            feeds = feeds_result.data
            
            total_feeds = len(feeds)
            active_feeds = len([f for f in feeds if f.get('active', True)])
            
            # Get total items count
            items_result = self.supabase.table('feed_items').select('id').execute()
            total_items = len(items_result.data)
            
            # Get recent items (last 24 hours)
            recent_cutoff = datetime.now() - timedelta(days=1)
            recent_result = self.supabase.table('feed_items').select('id').gte(
                'created_at', recent_cutoff.isoformat()
            ).execute()
            recent_items = len(recent_result.data)
            
            # Get categories
            categories = {}
            for feed in feeds:
                category = feed.get('category', 'Uncategorized')
                categories[category] = categories.get(category, 0) + 1
            
            return DashboardStats(
                total_feeds=total_feeds,
                total_items=total_items,
                active_feeds=active_feeds,
                recent_items=recent_items,
                categories=categories
            )
        except Exception as e:
            logger.error(f"Error getting dashboard stats: {str(e)}")
            return DashboardStats(
                total_feeds=0,
                total_items=0,
                active_feeds=0,
                recent_items=0,
                categories={}
            )

# Initialize database manager
db_manager = DatabaseManager(supabase) if supabase else None

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "RSS Web API Service",
        "version": "1.0.0",
        "endpoints": {
            "feeds": "GET/POST /feeds - Manage feed subscriptions",
            "items": "GET /items - Get feed items",
            "dashboard": "GET /dashboard - Dashboard statistics",
            "refresh": "POST /feeds/{feed_id}/refresh - Refresh specific feed"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "web-api",
        "supabase_connected": supabase is not None
    }

@app.post("/feeds", response_model=FeedResponse)
async def create_feed(feed_data: FeedSubscription):
    """Create new feed subscription"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db_manager.create_feed(feed_data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create feed")
    
    return FeedResponse(**result, item_count=0)

@app.get("/feeds", response_model=List[FeedResponse])
async def get_feeds(
    category: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    """Get all feeds with optional filtering"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    feeds = await db_manager.get_feeds(category=category, active_only=active_only)
    
    # Add item counts
    response_feeds = []
    for feed in feeds:
        items = await db_manager.get_feed_items(feed_id=feed['id'])
        response_feeds.append(FeedResponse(**feed, item_count=len(items)))
    
    return response_feeds

@app.get("/feeds/{feed_id}", response_model=FeedResponse)
async def get_feed(feed_id: str):
    """Get specific feed by ID"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    feed = await db_manager.get_feed_by_id(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    items = await db_manager.get_feed_items(feed_id=feed_id)
    return FeedResponse(**feed, item_count=len(items))

@app.put("/feeds/{feed_id}", response_model=FeedResponse)
async def update_feed(feed_id: str, update_data: FeedUpdate):
    """Update feed information"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db_manager.update_feed(feed_id, update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    items = await db_manager.get_feed_items(feed_id=feed_id)
    return FeedResponse(**result, item_count=len(items))

@app.delete("/feeds/{feed_id}")
async def delete_feed(feed_id: str):
    """Delete feed and all its items"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    success = await db_manager.delete_feed(feed_id)
    if not success:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    return {"message": "Feed deleted successfully"}

@app.get("/items", response_model=List[FeedItemResponse])
async def get_items(
    feed_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Get feed items with pagination"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    items = await db_manager.get_feed_items(feed_id=feed_id, limit=limit, offset=offset)
    return [FeedItemResponse(**item) for item in items]

@app.post("/feeds/{feed_id}/refresh")
async def refresh_feed(feed_id: str):
    """Manually refresh a specific feed"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    # Get feed info
    feed = await db_manager.get_feed_by_id(feed_id)
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    
    # Call feed parser service
    parser_url = await get_feed_parser_url()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{parser_url}/parse",
                json={"url": feed['url']},
                timeout=30.0
            )
            response.raise_for_status()
            
            parsed_data = response.json()
            
            # Store the items
            success = await db_manager.store_feed_items(feed_id, parsed_data['items'])
            if not success:
                raise HTTPException(status_code=500, detail="Failed to store feed items")
            
            return {
                "message": "Feed refreshed successfully",
                "items_processed": len(parsed_data['items'])
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error calling feed parser: {str(e)}")
        raise HTTPException(status_code=503, detail="Feed parser service unavailable")
    except Exception as e:
        logger.error(f"Error refreshing feed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to refresh feed")

@app.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    if not db_manager:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    return await db_manager.get_dashboard_stats()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)