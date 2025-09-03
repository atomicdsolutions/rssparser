import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rss, Home, Settings, Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-blue-700' : '';
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
              
              <button className="flex items-center px-3 py-2 bg-blue-500 rounded-md hover:bg-blue-400 transition-colors">
                <Plus className="h-4 w-4 mr-2" />
                Add Feed
              </button>
              
              <button className="flex items-center px-3 py-2 rounded-md hover:bg-blue-700 transition-colors">
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