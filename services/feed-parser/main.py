from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging
from datetime import datetime
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RSS Feed Parser Service",
    description="Microservice for parsing RSS feeds and extracting content",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "*"],  # Allow all origins for embedding
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FeedUrl(BaseModel):
    url: HttpUrl
    name: Optional[str] = None

class FeedItem(BaseModel):
    title: str
    description: str
    link: str
    published: Optional[datetime] = None
    author: Optional[str] = None
    content: Optional[str] = None
    images: List[str] = []
    media_urls: List[str] = []
    tags: List[str] = []
    duration: Optional[str] = None

class ParsedFeed(BaseModel):
    feed_url: str
    feed_title: str
    feed_description: str
    items: List[FeedItem]
    last_updated: datetime
    image: Optional[str] = None
    category: Optional[str] = None
    language: Optional[str] = None

class FeedParser:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'FeedParser/1.0 (RSS Feed Parser Service)'
        })

    async def parse_feed(self, feed_url: str, extract_content: bool = False) -> ParsedFeed:
        """Parse RSS feed and extract all content"""
        try:
            logger.info(f"Parsing feed: {feed_url}")
            
            # Parse RSS feed
            feed = feedparser.parse(feed_url)
            
            if feed.bozo:
                logger.warning(f"Feed parsing warning for {feed_url}: {feed.bozo_exception}")
            
            # Extract feed metadata
            feed_title = feed.feed.get('title', 'Unknown Feed')
            feed_description = feed.feed.get('description', '')
            
            # Extract feed image from various possible locations
            feed_image = None
            if hasattr(feed.feed, 'image') and feed.feed.image:
                feed_image = feed.feed.image.get('href') or feed.feed.image.get('url')
            elif hasattr(feed.feed, 'itunes_image'):
                feed_image = feed.feed.itunes_image
            
            # Extract category and language
            category = feed.feed.get('category', '')
            language = feed.feed.get('language', '')
            
            # Process each feed item
            items = []
            async with httpx.AsyncClient() as client:
                for entry in feed.entries:
                    item = await self._process_feed_item(entry, client, extract_content)
                    if item:
                        items.append(item)
            
            return ParsedFeed(
                feed_url=feed_url,
                feed_title=feed_title,
                feed_description=feed_description,
                items=items,
                last_updated=datetime.now(),
                image=feed_image,
                category=category,
                language=language
            )
            
        except Exception as e:
            logger.error(f"Error parsing feed {feed_url}: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to parse feed: {str(e)}")

    async def _process_feed_item(self, entry: Any, client: httpx.AsyncClient, extract_content: bool = False) -> Optional[FeedItem]:
        """Process individual feed item and extract content"""
        try:
            # Basic item data
            title = entry.get('title', '')
            description = entry.get('summary', '')
            link = entry.get('link', '')
            
            # Parse published date
            published = None
            if hasattr(entry, 'published_parsed') and entry.published_parsed:
                published = datetime(*entry.published_parsed[:6])
            
            # Author information
            author = entry.get('author', '')
            
            # Extract tags
            tags = []
            if hasattr(entry, 'tags'):
                tags = [tag.term for tag in entry.tags if hasattr(tag, 'term')]
            
            # Get full content if available
            content = ''
            if hasattr(entry, 'content') and entry.content:
                content = entry.content[0].value
            elif description:
                content = description
            
            # Extract media URLs from RSS enclosures (for podcasts)
            media_urls = []
            if hasattr(entry, 'enclosures'):
                for enclosure in entry.enclosures:
                    if hasattr(enclosure, 'href') and hasattr(enclosure, 'type'):
                        if enclosure.type.startswith('audio/'):
                            media_urls.append(enclosure.href)
            
            # Extract duration from iTunes tags
            duration = None
            if hasattr(entry, 'itunes_duration'):
                duration = entry.itunes_duration
            
            # Initialize empty lists for images and page media
            images = []
            page_media_urls = []
            
            # Conditionally extract full content from article pages
            if extract_content:
                # Extract additional content from article page (slower but more detailed)
                full_content, page_images, page_media_urls = await self._extract_full_content(link, client)
                if full_content:
                    content = full_content
                images = page_images
            
            # Combine media URLs from RSS and page content
            media_urls.extend(page_media_urls)
            
            return FeedItem(
                title=title,
                description=description,
                link=link,
                published=published,
                author=author,
                content=content,
                images=images,
                media_urls=media_urls,
                tags=tags,
                duration=duration
            )
            
        except Exception as e:
            logger.error(f"Error processing feed item: {str(e)}")
            return None

    async def _extract_full_content(self, url: str, client: httpx.AsyncClient) -> tuple[str, List[str], List[str]]:
        """Extract full content, images, and media from article page"""
        try:
            response = await client.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()
            
            # Extract main content
            content = ""
            content_selectors = [
                'article', '.post-content', '.entry-content', 
                '.content', 'main', '.post-body', '.article-content'
            ]
            
            for selector in content_selectors:
                content_elem = soup.select_one(selector)
                if content_elem:
                    content = content_elem.get_text(strip=True)
                    break
            
            if not content:
                # Fallback to body content
                body = soup.find('body')
                if body:
                    content = body.get_text(strip=True)
            
            # Extract images
            images = []
            for img in soup.find_all('img', src=True):
                img_url = urljoin(url, img['src'])
                if self._is_valid_image_url(img_url):
                    images.append(img_url)
            
            # Extract media URLs (videos, audio)
            media_urls = []
            for media in soup.find_all(['video', 'audio'], src=True):
                media_url = urljoin(url, media['src'])
                media_urls.append(media_url)
            
            # Extract embedded media
            for iframe in soup.find_all('iframe', src=True):
                iframe_src = iframe['src']
                if any(domain in iframe_src for domain in ['youtube.com', 'vimeo.com', 'soundcloud.com']):
                    media_urls.append(iframe_src)
            
            return content[:10000], images[:20], media_urls[:10]  # Limit sizes
            
        except Exception as e:
            logger.warning(f"Could not extract full content from {url}: {str(e)}")
            return "", [], []

    def _is_valid_image_url(self, url: str) -> bool:
        """Check if URL appears to be a valid image"""
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in ['http', 'https'] and
                any(parsed.path.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'])
            )
        except:
            return False

# Global parser instance
parser = FeedParser()

@app.post("/parse", response_model=ParsedFeed)
async def parse_feed_endpoint(feed_data: FeedUrl, extract_content: bool = False):
    """Parse a single RSS feed"""
    return await parser.parse_feed(str(feed_data.url), extract_content)

@app.post("/parse-batch")
async def parse_feeds_batch(feed_urls: List[FeedUrl]):
    """Parse multiple RSS feeds"""
    results = []
    for feed_data in feed_urls:
        try:
            parsed_feed = await parser.parse_feed(str(feed_data.url))
            results.append({
                "url": str(feed_data.url),
                "success": True,
                "data": parsed_feed
            })
        except Exception as e:
            results.append({
                "url": str(feed_data.url),
                "success": False,
                "error": str(e)
            })
    
    return {"results": results}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "feed-parser"}

@app.get("/")
async def root():
    """Root endpoint with service info"""
    return {
        "service": "RSS Feed Parser Service",
        "version": "1.0.0",
        "endpoints": {
            "parse": "POST /parse - Parse single RSS feed",
            "parse-batch": "POST /parse-batch - Parse multiple RSS feeds",
            "health": "GET /health - Health check"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)