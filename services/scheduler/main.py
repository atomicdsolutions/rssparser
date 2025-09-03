import asyncio
import logging
import os
import signal
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from dotenv import load_dotenv
from supabase import create_client, Client
import consul

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FeedScheduler:
    def __init__(self):
        # Supabase client
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None
        
        # Consul client for service discovery
        self.consul_client = consul.Consul(
            host=os.getenv("CONSUL_HOST", "localhost"),
            port=int(os.getenv("CONSUL_PORT", "8500"))
        )
        
        # Configuration
        self.update_interval_minutes = int(os.getenv("FEED_UPDATE_INTERVAL_MINUTES", "15"))
        self.max_concurrent_feeds = int(os.getenv("MAX_CONCURRENT_FEEDS", "5"))
        
        # Initialize scheduler
        self.scheduler = AsyncIOScheduler()
        self.running = False
        
        # Service URLs
        self.feed_parser_url = None
        self.web_api_url = None
        
    async def start(self):
        """Start the scheduler service"""
        logger.info("Starting Feed Scheduler Service")
        
        # Discover services
        await self._discover_services()
        
        # Setup scheduled jobs
        self._setup_jobs()
        
        # Start scheduler
        self.scheduler.start()
        self.running = True
        
        logger.info(f"Scheduler started - feeds will be updated every {self.update_interval_minutes} minutes")
        
    async def stop(self):
        """Stop the scheduler service"""
        logger.info("Stopping Feed Scheduler Service")
        self.running = False
        self.scheduler.shutdown()
        
    def _setup_jobs(self):
        """Setup scheduled jobs"""
        # Main feed processing job - every X minutes
        self.scheduler.add_job(
            self._process_all_feeds,
            trigger=IntervalTrigger(minutes=self.update_interval_minutes),
            id='process_feeds',
            name='Process All Feeds',
            max_instances=1,
            coalesce=True
        )
        
        # Health check job - every minute
        self.scheduler.add_job(
            self._health_check,
            trigger=IntervalTrigger(minutes=1),
            id='health_check',
            name='Health Check',
            max_instances=1
        )
        
        # Cleanup old items job - daily at 2 AM
        self.scheduler.add_job(
            self._cleanup_old_items,
            trigger=CronTrigger(hour=2, minute=0),
            id='cleanup_old_items',
            name='Cleanup Old Items',
            max_instances=1
        )
        
        # Service discovery refresh - every 5 minutes
        self.scheduler.add_job(
            self._discover_services,
            trigger=IntervalTrigger(minutes=5),
            id='service_discovery',
            name='Service Discovery Refresh',
            max_instances=1
        )
        
    async def _discover_services(self):
        """Discover microservices via Consul"""
        try:
            # Discover feed parser service
            _, services = self.consul_client.health.service('feed-parser', passing=True)
            if services:
                service = services[0]['Service']
                self.feed_parser_url = f"http://{service['Address']}:{service['Port']}"
                logger.info(f"Discovered feed parser service: {self.feed_parser_url}")
            else:
                self.feed_parser_url = os.getenv("FEED_PARSER_URL", "http://localhost:8001")
                logger.warning(f"Feed parser service not found in Consul, using fallback: {self.feed_parser_url}")
            
            # Discover web API service
            _, services = self.consul_client.health.service('web-api', passing=True)
            if services:
                service = services[0]['Service']
                self.web_api_url = f"http://{service['Address']}:{service['Port']}"
                logger.info(f"Discovered web API service: {self.web_api_url}")
            else:
                self.web_api_url = os.getenv("WEB_API_URL", "http://localhost:8002")
                logger.warning(f"Web API service not found in Consul, using fallback: {self.web_api_url}")
                
        except Exception as e:
            logger.error(f"Error during service discovery: {str(e)}")
            # Use fallback URLs
            self.feed_parser_url = os.getenv("FEED_PARSER_URL", "http://localhost:8001")
            self.web_api_url = os.getenv("WEB_API_URL", "http://localhost:8002")
    
    async def _process_all_feeds(self):
        """Process all active feeds"""
        if not self.supabase:
            logger.error("Supabase client not configured")
            return
            
        logger.info("Starting scheduled feed processing")
        start_time = datetime.now()
        
        try:
            # Get all active feeds
            feeds = await self._get_active_feeds()
            if not feeds:
                logger.info("No active feeds to process")
                return
                
            logger.info(f"Processing {len(feeds)} active feeds")
            
            # Process feeds in batches to avoid overwhelming services
            semaphore = asyncio.Semaphore(self.max_concurrent_feeds)
            tasks = [self._process_single_feed(feed, semaphore) for feed in feeds]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Log results
            successful = sum(1 for r in results if r is True)
            failed = len(results) - successful
            
            processing_time = datetime.now() - start_time
            logger.info(f"Feed processing completed: {successful} successful, {failed} failed, took {processing_time}")
            
            # Store processing stats
            await self._log_processing_batch(len(feeds), successful, failed, processing_time)
            
        except Exception as e:
            logger.error(f"Error during feed processing: {str(e)}")
    
    async def _get_active_feeds(self) -> List[Dict]:
        """Get all active feeds from database"""
        try:
            result = self.supabase.table('feeds').select('*').eq('active', True).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error fetching active feeds: {str(e)}")
            return []
    
    async def _process_single_feed(self, feed: Dict, semaphore: asyncio.Semaphore) -> bool:
        """Process a single feed"""
        async with semaphore:
            feed_id = feed['id']
            feed_url = feed['url']
            feed_name = feed['name']
            
            processing_start = datetime.now()
            
            try:
                logger.debug(f"Processing feed: {feed_name} ({feed_url})")
                
                # Call feed parser service
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.feed_parser_url}/parse",
                        json={"url": feed_url}
                    )
                    response.raise_for_status()
                    parsed_data = response.json()
                
                # Store items in database
                items_processed = await self._store_feed_items(feed_id, parsed_data['items'])
                
                # Update feed timestamp
                await self._update_feed_timestamp(feed_id)
                
                processing_time = datetime.now() - processing_start
                logger.info(f"Successfully processed feed '{feed_name}': {items_processed} items in {processing_time}")
                
                # Log successful processing
                await self._log_feed_processing(feed_id, 'success', items_processed, None, processing_time)
                
                return True
                
            except httpx.TimeoutException:
                error_msg = f"Timeout processing feed '{feed_name}'"
                logger.error(error_msg)
                await self._log_feed_processing(feed_id, 'error', 0, error_msg, datetime.now() - processing_start)
                return False
                
            except httpx.RequestError as e:
                error_msg = f"Request error processing feed '{feed_name}': {str(e)}"
                logger.error(error_msg)
                await self._log_feed_processing(feed_id, 'error', 0, error_msg, datetime.now() - processing_start)
                return False
                
            except Exception as e:
                error_msg = f"Error processing feed '{feed_name}': {str(e)}"
                logger.error(error_msg)
                await self._log_feed_processing(feed_id, 'error', 0, error_msg, datetime.now() - processing_start)
                return False
    
    async def _store_feed_items(self, feed_id: str, items: List[Dict]) -> int:
        """Store feed items in database"""
        try:
            if not items:
                return 0
                
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
            
            # Upsert items (handle duplicates based on feed_id + link)
            result = self.supabase.table('feed_items').upsert(db_items).execute()
            
            return len(result.data) if result.data else 0
            
        except Exception as e:
            logger.error(f"Error storing feed items: {str(e)}")
            return 0
    
    async def _update_feed_timestamp(self, feed_id: str):
        """Update feed last_updated timestamp"""
        try:
            self.supabase.table('feeds').update({
                'last_updated': datetime.now().isoformat()
            }).eq('id', feed_id).execute()
        except Exception as e:
            logger.error(f"Error updating feed timestamp: {str(e)}")
    
    async def _log_feed_processing(self, feed_id: str, status: str, items_processed: int, 
                                  error_message: str, processing_time: timedelta):
        """Log feed processing result"""
        try:
            self.supabase.table('feed_processing_logs').insert({
                'feed_id': feed_id,
                'status': status,
                'items_processed': items_processed,
                'error_message': error_message,
                'processing_time_ms': int(processing_time.total_seconds() * 1000),
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f"Error logging feed processing: {str(e)}")
    
    async def _log_processing_batch(self, total_feeds: int, successful: int, failed: int, processing_time: timedelta):
        """Log batch processing stats"""
        try:
            # You could store this in a separate batch_processing_logs table
            logger.info(f"Batch processing stats - Total: {total_feeds}, Success: {successful}, Failed: {failed}, Time: {processing_time}")
        except Exception as e:
            logger.error(f"Error logging batch processing stats: {str(e)}")
    
    async def _health_check(self):
        """Perform health checks on dependent services"""
        try:
            # Check feed parser service
            if self.feed_parser_url:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    response = await client.get(f"{self.feed_parser_url}/health")
                    if response.status_code == 200:
                        logger.debug("Feed parser service is healthy")
                    else:
                        logger.warning(f"Feed parser service health check failed: {response.status_code}")
            
            # Check database connection
            if self.supabase:
                result = self.supabase.table('feeds').select('count').limit(1).execute()
                logger.debug("Database connection is healthy")
                
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
    
    async def _cleanup_old_items(self):
        """Clean up old feed items to prevent database bloat"""
        try:
            # Delete items older than 90 days
            cutoff_date = datetime.now() - timedelta(days=90)
            
            result = self.supabase.table('feed_items').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_count} old feed items")
            
            # Also cleanup old processing logs
            result = self.supabase.table('feed_processing_logs').delete().lt(
                'created_at', cutoff_date.isoformat()
            ).execute()
            
            deleted_logs = len(result.data) if result.data else 0
            logger.info(f"Cleaned up {deleted_logs} old processing logs")
            
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

# Global scheduler instance
scheduler = FeedScheduler()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    asyncio.create_task(scheduler.stop())
    sys.exit(0)

async def main():
    """Main entry point"""
    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Start scheduler
        await scheduler.start()
        
        # Keep running
        while scheduler.running:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down...")
    finally:
        await scheduler.stop()

if __name__ == "__main__":
    asyncio.run(main())