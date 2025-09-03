import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Rss, 
  ExternalLink, 
  RefreshCw,
  CheckCircle 
} from 'lucide-react';

interface FeedData {
  url: string;
  name: string;
  status: 'loading' | 'success' | 'error';
  data?: any;
  items?: any[];
}

const SimpleDashboard: React.FC = () => {
  const [feeds, setFeeds] = useState<FeedData[]>([
    {
      url: 'https://feeds.simplecast.com/fPtxrgCC',
      name: 'The Wellness Collective',
      status: 'loading'
    },
    {
      url: 'https://feeds.simplecast.com/pGL9tdkW', 
      name: "The State of the Black Man's Mental Health",
      status: 'loading'
    },
    {
      url: 'https://cheeseonmycracker.com/feed/',
      name: 'Getting My Cheese Back On My Cracker',
      status: 'loading'
    }
  ]);

  const loadFeed = async (feedIndex: number) => {
    const feed = feeds[feedIndex];
    try {
      const response = await fetch('http://localhost:8001/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: feed.url })
      });
      const data = await response.json();
      
      setFeeds(prev => prev.map((f, i) => 
        i === feedIndex 
          ? { ...f, status: 'success', data, items: data.items || [] }
          : f
      ));
    } catch (error) {
      console.error('Error loading feed:', error);
      setFeeds(prev => prev.map((f, i) => 
        i === feedIndex 
          ? { ...f, status: 'error' }
          : f
      ));
    }
  };

  useEffect(() => {
    // Load all feeds
    feeds.forEach((_, index) => {
      loadFeed(index);
    });
  }, []);

  const handleRefresh = (index: number) => {
    setFeeds(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'loading' } : f
    ));
    loadFeed(index);
  };

  const totalItems = feeds.reduce((sum, feed) => sum + (feed.items?.length || 0), 0);
  const successfulFeeds = feeds.filter(f => f.status === 'success').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">RSS Feed Dashboard</h1>
          <p className="text-gray-600">Monitoring your RSS feeds and latest content</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Rss className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Feeds</p>
                <p className="text-2xl font-bold text-gray-900">{feeds.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Feeds</p>
                <p className="text-2xl font-bold text-gray-900">{successfulFeeds}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Rss className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Rss className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feed Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {feeds.map((feed, index) => (
            <div key={feed.url} className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{feed.name}</h3>
                    <p className="text-sm text-gray-500 mb-4 break-all">{feed.url}</p>
                  </div>
                  <button
                    onClick={() => handleRefresh(index)}
                    className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                    disabled={feed.status === 'loading'}
                  >
                    <RefreshCw className={`h-5 w-5 ${feed.status === 'loading' ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      feed.status === 'success' ? 'bg-green-100 text-green-800' :
                      feed.status === 'loading' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {feed.status === 'success' ? 'Active' : 
                       feed.status === 'loading' ? 'Loading...' : 'Error'}
                    </span>
                  </div>

                  {feed.data && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Items:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {feed.items?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Updated:</span>
                        <span className="text-sm text-gray-900">
                          {feed.data.parsed_at ? new Date(feed.data.parsed_at).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {feed.items && feed.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Items:</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {feed.items.slice(0, 3).map((item, itemIndex) => (
                        <div key={itemIndex} className="text-xs">
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 line-clamp-2"
                          >
                            {item.title}
                          </a>
                          <p className="text-gray-500 mt-1">
                            {item.published ? new Date(item.published).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Link
                    to={`/feed/${
                      feed.url === 'https://feeds.simplecast.com/fPtxrgCC' ? 'wellness' :
                      feed.url === 'https://feeds.simplecast.com/pGL9tdkW' ? 'mental-health' :
                      'cheese-blog'
                    }`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Feed Details →
                  </Link>
                  <a
                    href={feed.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    Original
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;