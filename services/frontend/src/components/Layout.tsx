import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rss, Home, Settings, Plus, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [showAddFeedModal, setShowAddFeedModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedName, setNewFeedName] = useState('');
  const [itemLimit, setItemLimit] = useState(() => {
    return parseInt(localStorage.getItem('feedItemLimit') || '10');
  });
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : '';
  };

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedUrl.trim()) return;

    try {
      // Test the feed first
      const response = await fetch('http://localhost:8001/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: newFeedUrl.trim(),
          limit: itemLimit === 0 ? null : itemLimit
        })
      });
      
      if (response.ok) {
        // Feed is valid, you could store it in localStorage or send to backend
        const feedData = await response.json();
        
        // For now, we'll store in localStorage
        const existingFeeds = JSON.parse(localStorage.getItem('customFeeds') || '[]');
        const newFeed = {
          url: newFeedUrl.trim(),
          name: newFeedName.trim() || feedData.feed_title || 'Custom Feed',
          id: Date.now().toString()
        };
        existingFeeds.push(newFeed);
        localStorage.setItem('customFeeds', JSON.stringify(existingFeeds));
        
        // Reset form and close modal
        setNewFeedUrl('');
        setNewFeedName('');
        setShowAddFeedModal(false);
        
        // Refresh page to show new feed
        window.location.reload();
      } else {
        alert('Invalid RSS feed URL. Please check the URL and try again.');
      }
    } catch (error) {
      alert('Error adding feed. Please check the URL and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Rss className="h-8 w-8" />
              <h1 className="text-xl font-bold">RSS Feed Parser</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/dashboard" 
                className={`flex items-center px-3 py-2 rounded-md hover:bg-blue-700 transition-colors ${isActive('/dashboard')}`}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              
              <button 
                onClick={() => setShowAddFeedModal(true)}
                className="flex items-center px-3 py-2 bg-blue-500 rounded-md hover:bg-blue-400 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Feed
              </button>
              
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center px-3 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Add Feed Modal */}
      {showAddFeedModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Add New RSS Feed</h3>
                <button
                  onClick={() => setShowAddFeedModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddFeed} className="mt-4 text-left">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feed URL
                  </label>
                  <input
                    type="url"
                    value={newFeedUrl}
                    onChange={(e) => setNewFeedUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/feed.xml"
                    required
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feed Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Custom feed name"
                  />
                </div>
                
                <div className="flex items-center justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowAddFeedModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Add Feed
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mt-4 text-left">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Feed Management</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Manage your RSS feeds and parsing preferences.
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Items to fetch per feed
                      </label>
                      <select
                        value={itemLimit}
                        onChange={(e) => {
                          const limit = parseInt(e.target.value);
                          setItemLimit(limit);
                          localStorage.setItem('feedItemLimit', limit.toString());
                          
                          // Trigger refresh for all feeds by dispatching a custom event
                          window.dispatchEvent(new CustomEvent('feedLimitChanged', {
                            detail: { limit }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>5 items</option>
                        <option value={10}>10 items</option>
                        <option value={25}>25 items</option>
                        <option value={50}>50 items</option>
                        <option value={100}>100 items</option>
                        <option value={0}>All items</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose how many items to fetch from each RSS feed
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-700">Auto-refresh feeds every hour</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span className="text-sm text-gray-700">Show feed descriptions</span>
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span className="text-sm text-gray-700">Enable email notifications</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div>
              <p>&copy; 2024 RSS Feed Parser. Built with FastAPI and React.</p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">API</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;