import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  User, 
  Tag,
  RefreshCw,
  Image,
  Play,
  Clock
} from 'lucide-react';
import { apiService } from '../services/api.ts';

interface Feed {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  active: boolean;
  last_updated?: string;
  item_count: number;
  created_at: string;
}

interface FeedItem {
  id: string;
  feed_id: string;
  title: string;
  description: string;
  link: string;
  published?: string;
  author?: string;
  content?: string;
  images: string[];
  media_urls: string[];
  tags: string[];
  created_at: string;
}

const FeedView: React.FC = () => {
  const { feedId } = useParams<{ feedId: string }>();
  const [feed, setFeed] = useState<Feed | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);

  useEffect(() => {
    if (feedId) {
      loadFeedData();
    }
  }, [feedId]);

  const loadFeedData = async () => {
    if (!feedId) return;
    
    setLoading(true);
    try {
      const [feedData, itemsData] = await Promise.all([
        apiService.getFeed(feedId),
        apiService.getItems({ feed_id: feedId, limit: 100 })
      ]);
      
      setFeed(feedData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load feed data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!feedId) return;
    
    setRefreshing(true);
    try {
      await apiService.refreshFeed(feedId);
      await loadFeedData(); // Reload data
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!feed) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Feed not found.</p>
        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link 
            to="/dashboard"
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{feed.name}</h1>
              {feed.description && (
                <p className="text-gray-600 mb-4">{feed.description}</p>
              )}
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  {feed.category || 'Uncategorized'}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Last updated: {formatDate(feed.last_updated)}
                </span>
                <span>{feed.item_count} items</span>
              </div>
            </div>
            <a 
              href={feed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 hover:text-blue-800"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Original Feed
            </a>
          </div>
        </div>
      </div>

      {/* Feed Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Feed Items ({items.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {items.length === 0 ? (
                <p className="text-gray-500 text-center py-12">No items found in this feed.</p>
              ) : (
                items.map((item) => (
                  <div 
                    key={item.id} 
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900 line-clamp-2 flex-1 mr-4">
                        {item.title}
                      </h3>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {item.images.length > 0 && (
                          <Image className="h-4 w-4 text-green-600" />
                        )}
                        {item.media_urls.length > 0 && (
                          <Play className="h-4 w-4 text-blue-600" />
                        )}
                        <a 
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-4">
                        {item.author && (
                          <span className="flex items-center">
                            <User className="h-3 w-3 mr-1" />
                            {item.author}
                          </span>
                        )}
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeAgo(item.published || item.created_at)}
                        </span>
                      </div>
                      
                      {item.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Tag className="h-3 w-3" />
                          <span>{item.tags.slice(0, 2).join(', ')}</span>
                          {item.tags.length > 2 && (
                            <span>+{item.tags.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Item Detail Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md sticky top-8">
            {selectedItem ? (
              <div>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg mb-3">{selectedItem.title}</h3>
                  
                  {selectedItem.author && (
                    <div className="flex items-center mb-3 text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      {selectedItem.author}
                    </div>
                  )}
                  
                  <div className="flex items-center mb-4 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(selectedItem.published)}
                  </div>
                  
                  {selectedItem.content && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Content</h4>
                      <p className="text-sm text-gray-700 line-clamp-6">
                        {truncateText(selectedItem.content, 500)}
                      </p>
                    </div>
                  )}
                  
                  {selectedItem.images.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Images ({selectedItem.images.length})</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedItem.images.slice(0, 4).map((image, index) => (
                          <img 
                            key={index}
                            src={image} 
                            alt="" 
                            className="w-full h-16 object-cover rounded border"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedItem.media_urls.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Media ({selectedItem.media_urls.length})</h4>
                      <div className="space-y-2">
                        {selectedItem.media_urls.slice(0, 3).map((url, index) => (
                          <a 
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <Play className="h-3 w-3 mr-2" />
                            Media {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedItem.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedItem.tags.map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-xs rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <a 
                    href={selectedItem.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Read Full Article
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>Select an item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedView;