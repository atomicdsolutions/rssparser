-- RSS Feed Parser Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Feeds table
CREATE TABLE feeds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Uncategorized',
    active BOOLEAN DEFAULT true,
    last_updated TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on active feeds
CREATE INDEX idx_feeds_active ON feeds(active);
CREATE INDEX idx_feeds_category ON feeds(category);

-- Feed items table
CREATE TABLE feed_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL,
    published TIMESTAMPTZ,
    author TEXT,
    content TEXT,
    images TEXT[] DEFAULT '{}',
    media_urls TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique items per feed based on link
    UNIQUE(feed_id, link)
);

-- Create indexes for better query performance
CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_published ON feed_items(published DESC);
CREATE INDEX idx_feed_items_created_at ON feed_items(created_at DESC);
CREATE INDEX idx_feed_items_link ON feed_items(link);

-- Feed processing logs table (for monitoring)
CREATE TABLE feed_processing_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
    status TEXT NOT NULL, -- 'success', 'error', 'partial'
    items_processed INTEGER DEFAULT 0,
    error_message TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feed_logs_feed_id ON feed_processing_logs(feed_id);
CREATE INDEX idx_feed_logs_status ON feed_processing_logs(status);
CREATE INDEX idx_feed_logs_created_at ON feed_processing_logs(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_feeds_updated_at 
    BEFORE UPDATE ON feeds 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feed_items_updated_at 
    BEFORE UPDATE ON feed_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_processing_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for service role
CREATE POLICY "Enable all operations for service role" ON feeds
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for service role" ON feed_items
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for service role" ON feed_processing_logs
    FOR ALL USING (true);

-- Views for common queries

-- Feed summary view
CREATE VIEW feed_summary AS
SELECT 
    f.id,
    f.url,
    f.name,
    f.description,
    f.category,
    f.active,
    f.last_updated,
    f.created_at,
    COUNT(fi.id) as item_count,
    MAX(fi.published) as latest_item_date
FROM feeds f
LEFT JOIN feed_items fi ON f.id = fi.feed_id
GROUP BY f.id, f.url, f.name, f.description, f.category, f.active, f.last_updated, f.created_at;

-- Recent items view (last 30 days)
CREATE VIEW recent_items AS
SELECT 
    fi.*,
    f.name as feed_name,
    f.category as feed_category
FROM feed_items fi
JOIN feeds f ON fi.feed_id = f.id
WHERE fi.created_at >= NOW() - INTERVAL '30 days'
ORDER BY fi.published DESC, fi.created_at DESC;

-- Dashboard stats view
CREATE VIEW dashboard_stats AS
SELECT 
    COUNT(DISTINCT f.id) as total_feeds,
    COUNT(DISTINCT CASE WHEN f.active THEN f.id END) as active_feeds,
    COUNT(fi.id) as total_items,
    COUNT(CASE WHEN fi.created_at >= NOW() - INTERVAL '1 day' THEN fi.id END) as recent_items,
    COUNT(CASE WHEN fi.created_at >= NOW() - INTERVAL '7 days' THEN fi.id END) as weekly_items
FROM feeds f
LEFT JOIN feed_items fi ON f.id = fi.feed_id;

-- Sample data for testing
INSERT INTO feeds (url, name, description, category) VALUES
('https://feeds.simplecast.com/fPtxrgCC', 'Test Podcast 1', 'Sample podcast feed', 'Podcasts'),
('https://feeds.simplecast.com/pGL9tdkW', 'Test Podcast 2', 'Another sample podcast feed', 'Podcasts'),
('https://cheeseonmycracker.com/feed/', 'Cheese on My Cracker Blog', 'Food blog RSS feed', 'Blogs');

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;