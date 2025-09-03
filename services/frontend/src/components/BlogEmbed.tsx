import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Calendar, User, ExternalLink, Clock, AlertCircle } from 'lucide-react';

interface FeedItem {
  title: string;
  description: string;
  content?: string;
  link: string;
  published?: string;
  author?: string;
  images?: string[];
}

interface FeedData {
  feed_title: string;
  feed_description?: string;
  feed_url: string;
  items: FeedItem[];
  image?: string;
  category?: string;
  language?: string;
  last_updated: string;
}

interface BlogCustomizationOptions {
  theme: 'light' | 'dark';
  hideDescription: boolean;
  hideDate: boolean;
  hideAuthor: boolean;
  hideImages: boolean;
  backgroundGradient: string;
  itemCount?: number;
  showFullContent: boolean;
}

const BlogEmbed: React.FC = () => {
  const { feedUrl } = useParams<{ feedUrl: string }>();
  const location = useLocation();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTimeout, setIsTimeout] = useState(false);

  // Parse URL parameters for customization
  const customizations = useMemo((): BlogCustomizationOptions => {
    const params = new URLSearchParams(location.search);
    return {
      theme: (params.get('theme') as 'light' | 'dark') || 'light',
      hideDescription: params.get('hideDescription') === 'true',
      hideDate: params.get('hideDate') === 'true',
      hideAuthor: params.get('hideAuthor') === 'true',
      hideImages: params.get('hideImages') === 'true',
      backgroundGradient: params.get('backgroundGradient') || 'blue-50',
      itemCount: params.get('itemCount') ? parseInt(params.get('itemCount')!) : undefined,
      showFullContent: params.get('showFullContent') === 'true',
    };
  }, [location.search]);

  // Predefined feeds mapping
  const feedMappings: Record<string, { url: string; name: string; type: 'podcast' | 'blog' }> = {
    'wellness': {
      url: 'https://feeds.simplecast.com/fPtxrgCC',
      name: 'The Wellness Collective',
      type: 'podcast'
    },
    'mental-health': {
      url: 'https://feeds.simplecast.com/pGL9tdkW',
      name: "The State of the Black Man's Mental Health",
      type: 'podcast'
    },
    'cheese-blog': {
      url: 'https://cheeseonmycracker.com/feed/',
      name: 'Getting My Cheese Back On My Cracker',
      type: 'blog'
    }
  };

  const currentFeed = feedUrl ? feedMappings[feedUrl] : null;

  useEffect(() => {
    if (!currentFeed || currentFeed.type !== 'blog') {
      setError('Invalid or unsupported feed for blog embedding');
      setLoading(false);
      return;
    }

    loadFeed();
  }, [feedUrl]);

  const loadFeed = async () => {
    if (!currentFeed) return;
    
    setLoading(true);
    setError(null);
    setIsTimeout(false);
    
    // Set up timeout
    const timeoutId = setTimeout(() => {
      setIsTimeout(true);
      setError('Feed is taking too long to load');
      setLoading(false);
    }, 1500); // 1500ms timeout as requested
    
    try {
      const response = await fetch('http://localhost:8001/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: currentFeed.url,
          extract_content: customizations.showFullContent 
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Feed unavailable');
      }
      
      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      clearTimeout(timeoutId);
      if (!isTimeout) {
        setError('Feed host is currently unavailable');
        console.error('Error loading feed:', err);
      }
    } finally {
      if (!isTimeout) {
        setLoading(false);
      }
    }
  };

  const stripHtmlTags = (html: string) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${customizations.theme === 'light' ? 'bg-gray-100' : 'bg-gray-900'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className={customizations.theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
            Loading blog posts...
          </p>
        </div>
      </div>
    );
  }

  if (error || !currentFeed || !feedData) {
    return (
      <div className={`min-h-screen ${customizations.theme === 'light' ? 'bg-gray-100' : 'bg-gray-900'} flex items-center justify-center`}>
        <div className="text-center p-8">
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${
            customizations.theme === 'light' ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <h3 className={`text-xl font-semibold mb-2 ${
            customizations.theme === 'light' ? 'text-gray-800' : 'text-gray-200'
          }`}>
            {isTimeout ? 'No new posts right now' : 'Feed Unavailable'}
          </h3>
          <p className={`${customizations.theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            {isTimeout 
              ? 'Come back soon for fresh content!' 
              : error || 'Blog posts are temporarily unavailable'
            }
          </p>
        </div>
      </div>
    );
  }

  const itemsToShow = feedData?.items.slice(0, customizations.itemCount || 5) || [];

  const themeClasses = customizations.theme === 'light' 
    ? {
        bg: 'bg-white',
        bgGradient: `bg-gradient-to-br from-${customizations.backgroundGradient} via-gray-50 to-white`,
        text: 'text-gray-900',
        textMuted: 'text-gray-600',
        textLight: 'text-gray-500',
        border: 'border-gray-200',
        hover: 'hover:bg-gray-50',
        link: 'text-blue-600 hover:text-blue-800'
      }
    : {
        bg: 'bg-gray-800',
        bgGradient: `bg-gradient-to-br from-gray-800 via-gray-900 to-black`,
        text: 'text-white',
        textMuted: 'text-gray-300',
        textLight: 'text-gray-400',
        border: 'border-gray-700',
        hover: 'hover:bg-gray-700',
        link: 'text-blue-400 hover:text-blue-300'
      };

  return (
    <div className={`min-h-screen ${themeClasses.bgGradient} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Blog Header */}
        <div className={`${themeClasses.bg} rounded-2xl shadow-xl overflow-hidden mb-6`}>
          <div className="p-6">
            <div className="flex items-center space-x-4 mb-4">
              {feedData.image && (
                <img
                  src={feedData.image}
                  alt={feedData.feed_title}
                  className="w-16 h-16 rounded-xl object-cover shadow-lg"
                />
              )}
              <div className="flex-1">
                <h1 className={`text-2xl font-bold ${themeClasses.text} mb-1`}>
                  {feedData.feed_title}
                </h1>
                {!customizations.hideDescription && feedData.feed_description && (
                  <p className={`${themeClasses.textMuted} text-sm`}>
                    {stripHtmlTags(feedData.feed_description)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Blog Posts */}
        <div className="space-y-4">
          {itemsToShow.map((item, index) => (
            <article
              key={index}
              className={`${themeClasses.bg} rounded-xl shadow-lg overflow-hidden transition-all duration-200 ${themeClasses.hover}`}
            >
              <div className="p-6">
                {/* Post Header */}
                <div className="flex items-start justify-between mb-4">
                  <h2 className={`text-xl font-semibold ${themeClasses.text} leading-tight flex-1 pr-4`}>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${themeClasses.link} hover:underline`}
                    >
                      {item.title}
                    </a>
                  </h2>
                  <ExternalLink className={`h-5 w-5 ${themeClasses.textLight} flex-shrink-0`} />
                </div>

                {/* Post Meta */}
                <div className={`flex items-center space-x-4 text-sm ${themeClasses.textLight} mb-4`}>
                  {!customizations.hideDate && item.published && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(item.published).toLocaleDateString()}
                    </div>
                  )}
                  {!customizations.hideAuthor && item.author && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {item.author}
                    </div>
                  )}
                </div>

                {/* Post Image */}
                {!customizations.hideImages && item.images && item.images.length > 0 && (
                  <div className="mb-4">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Post Content */}
                {!customizations.hideDescription && (
                  <div className={`${themeClasses.textMuted} leading-relaxed`}>
                    {customizations.showFullContent && item.content ? (
                      <div className="prose prose-sm max-w-none">
                        {stripHtmlTags(item.content)}
                      </div>
                    ) : (
                      <p className="text-sm">
                        {truncateText(stripHtmlTags(item.description), 200)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Embed Attribution */}
        <div className="mt-8 text-center">
          <p className={`text-sm ${themeClasses.textLight}`}>
            Powered by{' '}
            <a 
              href={`${window.location.origin}/feed/${feedUrl}`}
              target="_parent"
              className={themeClasses.link}
            >
              RSS Feed Parser
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlogEmbed;