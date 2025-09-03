import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Rss, 
  TrendingUp, 
  Clock, 
  Tag, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { apiService } from '../services/api.ts';

interface DashboardStats {
  total_feeds: number;
  total_items: number;
  active_feeds: number;
  recent_items: number;
  categories: Record<string, number>;
}

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
  created_at: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [recentItems, setRecentItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, feedsData, itemsData] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getFeeds(),
        apiService.getItems({ limit: 10 })
      ]);
      
      setStats(statsData);
      setFeeds(feedsData);
      setRecentItems(itemsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshFeed = async (feedId: string) => {
    setRefreshing(feedId);
    try {
      await apiService.refreshFeed(feedId);
      await loadDashboardData(); // Reload data
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      setRefreshing(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button 
          onClick={loadDashboardData}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Feeds</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_feeds}</p>
              </div>
              <Rss className="h-12 w-12 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_items}</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Feeds</p>
                <p className="text-3xl font-bold text-gray-900">{stats.active_feeds}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent Items</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recent_items}</p>
              </div>
              <Clock className="h-12 w-12 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Feeds List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Feeds</h2>
            </div>
            <div className="p-6">
              {feeds.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No feeds added yet.</p>
              ) : (
                <div className="space-y-4">
                  {feeds.map((feed) => (
                    <div key={feed.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Link 
                              to={`/feed/${feed.id}`}
                              className="text-lg font-medium text-blue-600 hover:text-blue-800"
                            >
                              {feed.name}
                            </Link>
                            {!feed.active && (
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          {feed.description && (
                            <p className="text-gray-600 text-sm mt-1">{feed.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Tag className="h-3 w-3 mr-1" />
                              {feed.category || 'Uncategorized'}
                            </span>
                            <span>{feed.item_count} items</span>
                            <span>Updated {formatDate(feed.last_updated)}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <a 
                            href={feed.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            onClick={() => handleRefreshFeed(feed.id)}
                            disabled={refreshing === feed.id}
                            className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50"
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshing === feed.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Items Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Items</h2>
            </div>
            <div className="p-6">
              {recentItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent items.</p>
              ) : (
                <div className="space-y-4">
                  {recentItems.map((item) => (
                    <div key={item.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                      <a 
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:bg-gray-50 -m-2 p-2 rounded"
                      >
                        <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                          {item.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{item.author || 'Unknown'}</span>
                          <span>{formatTimeAgo(item.published || item.created_at)}</span>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Categories */}
          {stats && Object.keys(stats.categories).length > 0 && (
            <div className="bg-white rounded-lg shadow-md mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {Object.entries(stats.categories).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{category}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;