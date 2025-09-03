import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  User, 
  RefreshCw,
  Clock,
  Code,
  Copy,
  Check
} from 'lucide-react';
import PodcastPlayer from './PodcastPlayer.tsx';

interface FeedItem {
  title: string;
  description: string;
  content?: string;
  link: string;
  published?: string;
  author?: string;
  media_urls?: string[];
  images?: string[];
  duration?: string;
  episode_number?: number;
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

const FeedDetail: React.FC = () => {
  const { feedUrl } = useParams<{ feedUrl: string }>();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEmbedModal, setShowEmbedModal] = useState(false);
  const [showBlogEmbedModal, setShowBlogEmbedModal] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [podcastEmbedCustomizations, setPodcastEmbedCustomizations] = useState({
    theme: 'dark' as 'light' | 'dark',
    hideThumbnail: false,
    hideDescription: false,
    singlePlayer: false,
    hideDate: false,
    hideAuthor: false,
    hideDuration: false,
    backgroundGradient: 'gray-900',
    episodeIndex: 0,
    itemCount: 10
  });
  
  const [blogEmbedCustomizations, setBlogEmbedCustomizations] = useState({
    theme: 'light' as 'light' | 'dark',
    hideDescription: false,
    hideDate: false,
    hideAuthor: false,
    hideImages: false,
    backgroundGradient: 'blue-50',
    itemCount: 5,
    showFullContent: false
  });

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
    if (!currentFeed) {
      setError('Feed not found');
      setLoading(false);
      return;
    }

    loadFeed();
  }, [feedUrl]);

  const loadFeed = async () => {
    if (!currentFeed) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8001/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: currentFeed.url })
      });
      const data = await response.json();
      setFeedData(data);
    } catch (err) {
      setError('Failed to load feed');
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  };


  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
  };

  const formatDuration = (duration: string) => {
    if (!duration) return '';
    // If duration is in seconds, convert to MM:SS format
    const seconds = parseInt(duration);
    if (!isNaN(seconds)) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return duration;
  };

  const generatePodcastEmbedCode = (width = '100%', height = '600') => {
    const params = new URLSearchParams();
    if (podcastEmbedCustomizations.theme !== 'dark') params.set('theme', podcastEmbedCustomizations.theme);
    if (podcastEmbedCustomizations.hideThumbnail) params.set('hideThumbnail', 'true');
    if (podcastEmbedCustomizations.hideDescription) params.set('hideDescription', 'true');
    if (podcastEmbedCustomizations.singlePlayer) params.set('singlePlayer', 'true');
    if (podcastEmbedCustomizations.hideDate) params.set('hideDate', 'true');
    if (podcastEmbedCustomizations.hideAuthor) params.set('hideAuthor', 'true');
    if (podcastEmbedCustomizations.hideDuration) params.set('hideDuration', 'true');
    if (podcastEmbedCustomizations.backgroundGradient !== 'gray-900') params.set('backgroundGradient', podcastEmbedCustomizations.backgroundGradient);
    if (podcastEmbedCustomizations.singlePlayer && podcastEmbedCustomizations.episodeIndex > 0) params.set('episodeIndex', podcastEmbedCustomizations.episodeIndex.toString());
    if (podcastEmbedCustomizations.itemCount !== 10) params.set('itemCount', podcastEmbedCustomizations.itemCount.toString());

    const queryString = params.toString();
    const embedUrl = `${window.location.origin}/embed/${feedUrl}${queryString ? '?' + queryString : ''}`;
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;
  };
  
  const generateBlogEmbedCode = (width = '100%', height = '600') => {
    const params = new URLSearchParams();
    if (blogEmbedCustomizations.theme !== 'light') params.set('theme', blogEmbedCustomizations.theme);
    if (blogEmbedCustomizations.hideDescription) params.set('hideDescription', 'true');
    if (blogEmbedCustomizations.hideDate) params.set('hideDate', 'true');
    if (blogEmbedCustomizations.hideAuthor) params.set('hideAuthor', 'true');
    if (blogEmbedCustomizations.hideImages) params.set('hideImages', 'true');
    if (blogEmbedCustomizations.backgroundGradient !== 'blue-50') params.set('backgroundGradient', blogEmbedCustomizations.backgroundGradient);
    if (blogEmbedCustomizations.itemCount !== 5) params.set('itemCount', blogEmbedCustomizations.itemCount.toString());
    if (blogEmbedCustomizations.showFullContent) params.set('showFullContent', 'true');

    const queryString = params.toString();
    const embedUrl = `${window.location.origin}/blog-embed/${feedUrl}${queryString ? '?' + queryString : ''}`;
    return `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen></iframe>`;
  };

  const copyPodcastEmbedCode = async () => {
    const embedCode = generatePodcastEmbedCode();
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      console.error('Failed to copy podcast embed code:', err);
    }
  };
  
  const copyBlogEmbedCode = async () => {
    const embedCode = generateBlogEmbedCode();
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    } catch (err) {
      console.error('Failed to copy blog embed code:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading feed content...</p>
        </div>
      </div>
    );
  }

  if (error || !currentFeed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Feed not found'}</p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPodcast = currentFeed.type === 'podcast';
  const itemsToShow = feedData?.items.slice(0, 10) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-start space-x-6">
              {feedData?.image && (
                <img 
                  src={feedData.image} 
                  alt={feedData.feed_title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {feedData?.feed_title || currentFeed.name}
                </h1>
                {feedData?.feed_description && (
                  <p className="text-gray-600 mb-4">
                    {stripHtmlTags(feedData.feed_description)}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isPodcast ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {isPodcast ? 'Podcast' : 'Blog'}
                  </span>
                  <span>{itemsToShow.length} items</span>
                  {isPodcast ? (
                    <button
                      onClick={() => setShowEmbedModal(true)}
                      className="inline-flex items-center font-medium text-purple-600 hover:text-purple-800"
                    >
                      <Code className="mr-1 h-3 w-3" />
                      Embed Player
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowBlogEmbedModal(true)}
                      className="inline-flex items-center font-medium text-green-600 hover:text-green-800"
                    >
                      <Code className="mr-1 h-3 w-3" />
                      Embed Blog
                    </button>
                  )}
                  <a 
                    href={currentFeed.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    Original Feed <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {isPodcast ? (
          /* Podcast Player */
          <PodcastPlayer
            episodes={itemsToShow.map(item => ({
              title: item.title,
              description: item.description,
              link: item.link,
              published: item.published,
              author: item.author,
              media_urls: item.media_urls || [],
              duration: item.duration
            }))}
            podcastTitle={feedData?.feed_title || currentFeed.name}
            podcastDescription={feedData?.feed_description}
            podcastImage={feedData?.image}
          />
        ) : (
          /* Blog Posts */
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Latest Articles
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Dive deep into our curated collection of thoughtful articles and insights
              </p>
            </div>
            
            {itemsToShow.map((item, index) => (
            <article key={index} className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
              {/* Featured Image */}
              {item.images && item.images.length > 0 && (
                <div className="relative h-80 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="w-full h-full object-cover mix-blend-overlay"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                </div>
              )}
              
              <div className="p-8 lg:p-12">
                {/* Article Header */}
                <header className="mb-8">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                    {item.published && (
                      <time className="flex items-center font-medium">
                        <Calendar className="h-4 w-4 mr-2 text-blue-500" />
                        {new Date(item.published).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    )}
                    {item.author && (
                      <div className="flex items-center font-medium">
                        <User className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="text-gray-700">{item.author}</span>
                      </div>
                    )}
                    {item.duration && (
                      <div className="flex items-center font-medium">
                        <Clock className="h-4 w-4 mr-2 text-green-500" />
                        <span>{formatDuration(item.duration)} read</span>
                      </div>
                    )}
                  </div>
                  
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4 hover:text-blue-600 transition-colors">
                    {item.title}
                  </h1>
                  
                  {item.description && (
                    <p className="text-xl text-gray-600 leading-relaxed font-light">
                      {stripHtmlTags(item.description).substring(0, 200)}
                      {stripHtmlTags(item.description).length > 200 && '...'}
                    </p>
                  )}
                </header>

                {/* Additional Images Gallery */}
                {item.images && item.images.length > 1 && (
                  <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {item.images.slice(1, 7).map((image, imgIndex) => (
                        <div key={imgIndex} className="group relative overflow-hidden rounded-xl">
                          <img
                            src={image}
                            alt={`${item.title} gallery ${imgIndex + 2}`}
                            className="w-full h-48 object-cover transform group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Article Content */}
                <div className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-8 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-blockquote:border-blue-500 prose-blockquote:text-gray-600 prose-blockquote:font-medium prose-code:bg-gray-100 prose-code:text-gray-800 prose-pre:bg-gray-900">
                  {item.content ? (
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: item.content
                      }}
                    />
                  ) : (
                    <div className="text-gray-700 text-lg leading-8">
                      <p>{stripHtmlTags(item.description)}</p>
                    </div>
                  )}
                </div>

                {/* Article Tags/Categories */}
                {item.tags && item.tags.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      {item.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Article Footer */}
                <footer className="mt-12 pt-8 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-4">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        Read Original Article
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                      
                      <div className="flex items-center space-x-3 text-gray-500">
                        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Share article">
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 space-x-2">
                      <span>Article {index + 1} of {itemsToShow.length}</span>
                    </div>
                  </div>
                  
                  {/* Reading Progress Indicator */}
                  <div className="mt-6 flex items-center justify-center">
                    <div className="flex space-x-2">
                      {itemsToShow.map((_, dotIndex) => (
                        <div 
                          key={dotIndex} 
                          className={`w-2 h-2 rounded-full transition-colors ${
                            dotIndex === index ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </footer>
              </div>
            </article>
          ))}
          </div>
        )}

        {feedData && feedData.items.length > 10 && (
          <div className="mt-16 text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8">
            <p className="text-gray-600 text-lg mb-4">
              You've reached the end of our latest articles
            </p>
            <p className="text-gray-500 mb-6">
              Showing {itemsToShow.length} of {feedData.items.length} total articles
            </p>
            <a
              href={currentFeed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Browse All Articles
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </div>
        )}

        {/* Podcast Embed Modal */}
        {showEmbedModal && isPodcast && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Code className="mr-2 h-5 w-5" />
                    Embed Podcast Player
                  </h3>
                  <button
                    onClick={() => setShowEmbedModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  Customize and copy the podcast embed code for your website
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Customization Options */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Customization Options</h4>
                    
                    {/* Theme Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setPodcastEmbedCustomizations(prev => ({ ...prev, theme: 'dark' }))}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            podcastEmbedCustomizations.theme === 'dark'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          🌙 Dark Theme
                        </button>
                        <button
                          onClick={() => setPodcastEmbedCustomizations(prev => ({ ...prev, theme: 'light' }))}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            podcastEmbedCustomizations.theme === 'light'
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          ☀️ Light Theme
                        </button>
                      </div>
                    </div>

                    {/* Player Mode */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Player Mode</label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setPodcastEmbedCustomizations(prev => ({ ...prev, singlePlayer: false }))}
                          className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                            !podcastEmbedCustomizations.singlePlayer
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          🎵 Full Player (All Episodes)
                        </button>
                        <button
                          onClick={() => setPodcastEmbedCustomizations(prev => ({ ...prev, singlePlayer: true }))}
                          className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                            podcastEmbedCustomizations.singlePlayer
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          🎧 Single Episode Player
                        </button>
                      </div>
                    </div>

                    {/* Episode Selection for Single Player */}
                    {podcastEmbedCustomizations.singlePlayer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Episode</label>
                        <select
                          value={podcastEmbedCustomizations.episodeIndex}
                          onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, episodeIndex: parseInt(e.target.value) }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {itemsToShow.map((item, index) => (
                            <option key={index} value={index}>
                              {item.title.length > 50 ? item.title.substring(0, 50) + '...' : item.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Item Count for Multiple Episodes */}
                    {!podcastEmbedCustomizations.singlePlayer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">Number of Episodes</label>
                        <div className="flex items-center space-x-4">
                          <input
                            type="range"
                            min="1"
                            max="20"
                            value={podcastEmbedCustomizations.itemCount}
                            onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, itemCount: parseInt(e.target.value) }))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="w-12 text-center">
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={podcastEmbedCustomizations.itemCount}
                              onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, itemCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) }))}
                              className="w-full p-1 text-sm text-center border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Show 1-20 episodes in the embedded player</p>
                      </div>
                    )}

                    {/* Visibility Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Show/Hide Elements</label>
                      <div className="space-y-3">
                        {/* Podcast-specific options */}
                        {isPodcast && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!podcastEmbedCustomizations.hideThumbnail}
                              onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, hideThumbnail: !e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Thumbnail</span>
                          </label>
                        )}
                        
                        {/* Blog-specific options */}
                        {!isPodcast && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!blogEmbedCustomizations.hideImages}
                              onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, hideImages: !e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Post Images</span>
                          </label>
                        )}
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!podcastEmbedCustomizations.hideDescription}
                            onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, hideDescription: !e.target.checked }))}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show {isPodcast ? 'Description' : 'Post Content'}</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!podcastEmbedCustomizations.hideDate}
                            onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, hideDate: !e.target.checked }))}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Date</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!podcastEmbedCustomizations.hideAuthor}
                            onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, hideAuthor: !e.target.checked }))}
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Author</span>
                        </label>
                        
                        {isPodcast && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={!podcastEmbedCustomizations.hideDuration}
                              onChange={(e) => setPodcastEmbedCustomizations(prev => ({ ...prev, hideDuration: !e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Duration</span>
                          </label>
                        )}
                        
                        {/* Blog full content option */}
                        {!isPodcast && (
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={blogEmbedCustomizations.showFullContent}
                              onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, showFullContent: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Full Content (slower)</span>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Background Gradient */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Background Gradient</label>
                      <div className="grid grid-cols-3 gap-2">
                        {isPodcast 
                          ? ['gray-900', 'blue-900', 'purple-900', 'green-900', 'red-900', 'indigo-900'].map(color => (
                              <button
                                key={color}
                                onClick={() => setPodcastEmbedCustomizations(prev => ({ ...prev, backgroundGradient: color }))}
                                className={`h-10 rounded-lg border-2 transition-all bg-gradient-to-r from-${color} to-black ${
                                  podcastEmbedCustomizations.backgroundGradient === color
                                    ? 'border-white shadow-lg scale-105'
                                    : 'border-gray-300 hover:scale-102'
                                }`}
                                title={color.replace('-', ' ').toUpperCase()}
                              />
                            ))
                          : ['blue-50', 'green-50', 'purple-50', 'gray-50', 'yellow-50', 'pink-50'].map(color => (
                              <button
                                key={color}
                                onClick={() => setBlogEmbedCustomizations(prev => ({ ...prev, backgroundGradient: color }))}
                                className={`h-10 rounded-lg border-2 transition-all bg-gradient-to-r from-${color} to-white ${
                                  blogEmbedCustomizations.backgroundGradient === color
                                    ? 'border-blue-500 shadow-lg scale-105'
                                    : 'border-gray-300 hover:scale-102'
                                }`}
                                title={color.replace('-', ' ').toUpperCase()}
                              />
                            ))
                        }
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h4>
                    <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
                      <iframe
                        key={JSON.stringify(podcastEmbedCustomizations)} // Force reload on changes
                        src={`${window.location.origin}/embed/${feedUrl}?${new URLSearchParams(Object.entries(podcastEmbedCustomizations).reduce((acc, [key, value]) => {
                          if (value === true) acc[key] = 'true';
                          else if (value !== false && value !== 'dark' && value !== 0) acc[key] = value.toString();
                          return acc;
                        }, {} as Record<string, string>)).toString()}`}
                        width="100%"
                        height="500"
                        frameBorder="0"
                        title="Podcast Player Preview"
                        className="block"
                      />
                    </div>
                  </div>
                </div>

                {/* Embed Codes Section */}
                <div className="mt-8 space-y-6">
                  {/* Main Embed Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Embed Code (Responsive)
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={generatePodcastEmbedCode()}
                        className="w-full p-3 text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                      />
                      <button
                        onClick={copyPodcastEmbedCode}
                        className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedEmbed ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {copiedEmbed && (
                      <p className="text-green-600 text-sm mt-2 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Copied to clipboard!
                      </p>
                    )}
                  </div>

                  {/* Embed Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Embed Code
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={generatePodcastEmbedCode()}
                        className="w-full p-3 text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                      <button
                        onClick={copyPodcastEmbedCode}
                        className="absolute top-2 right-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedEmbed ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {copiedEmbed && (
                      <p className="text-green-600 text-sm mt-2 flex items-center">
                        <Check className="h-4 w-4 mr-1" />
                        Copied to clipboard!
                      </p>
                    )}
                  </div>

                  {/* Size Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Small (400px)
                      </label>
                      <textarea
                        readOnly
                        value={generatePodcastEmbedCode('400px', '400')}
                        className="w-full p-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded resize-none"
                        rows={3}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Medium (600px)
                      </label>
                      <textarea
                        readOnly
                        value={generatePodcastEmbedCode('600px', '500')}
                        className="w-full p-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded resize-none"
                        rows={3}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Large (800px)
                      </label>
                      <textarea
                        readOnly
                        value={generatePodcastEmbedCode('800px', '600')}
                        className="w-full p-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded resize-none"
                        rows={3}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <Code className="mr-2 h-5 w-5" />
                      How to embed your player:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                        Customize the player using the options on the left
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                        Copy the embed code (responsive version recommended)
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                        Paste it into your website's HTML where you want the player
                      </li>
                      <li className="flex items-start">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                        The player will load automatically with all your customizations
                      </li>
                    </ul>
                    <div className="mt-4 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        <strong>✨ Features:</strong> Waveform visualization • Episode playlist • Mobile responsive • Cross-browser compatible • No external dependencies required
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Embed Modal */}
        {showBlogEmbedModal && !isPodcast && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Code className="mr-2 h-5 w-5" />
                    Embed Blog Posts
                  </h3>
                  <button
                    onClick={() => setShowBlogEmbedModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-gray-600 mt-2">
                  Customize and copy the blog embed code for your website
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column: Blog Customization Options */}
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Blog Customization Options</h4>
                    
                    {/* Theme Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Theme</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setBlogEmbedCustomizations(prev => ({ ...prev, theme: 'light' }))}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            blogEmbedCustomizations.theme === 'light'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          ☀️ Light Theme
                        </button>
                        <button
                          onClick={() => setBlogEmbedCustomizations(prev => ({ ...prev, theme: 'dark' }))}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            blogEmbedCustomizations.theme === 'dark'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          🌙 Dark Theme
                        </button>
                      </div>
                    </div>

                    {/* Number of Posts */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Number of Posts</label>
                      <div className="flex items-center space-x-4">
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={blogEmbedCustomizations.itemCount}
                          onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, itemCount: parseInt(e.target.value) }))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #10b981 0%, #10b981 ${(blogEmbedCustomizations.itemCount / 20) * 100}%, #e5e7eb ${(blogEmbedCustomizations.itemCount / 20) * 100}%, #e5e7eb 100%)`
                          }}
                        />
                        <div className="w-12 text-center">
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={blogEmbedCustomizations.itemCount}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, itemCount: Math.max(1, Math.min(20, parseInt(e.target.value) || 1)) }))}
                            className="w-full p-1 text-sm text-center border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Show 1-20 blog posts in the embed</p>
                    </div>

                    {/* Visibility Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Show/Hide Elements</label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!blogEmbedCustomizations.hideImages}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, hideImages: !e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Post Images</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!blogEmbedCustomizations.hideDescription}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, hideDescription: !e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Post Content</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!blogEmbedCustomizations.hideDate}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, hideDate: !e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Date</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={!blogEmbedCustomizations.hideAuthor}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, hideAuthor: !e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Show Author</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={blogEmbedCustomizations.showFullContent}
                            onChange={(e) => setBlogEmbedCustomizations(prev => ({ ...prev, showFullContent: e.target.checked }))}
                            className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">Extract Full Content (slower)</span>
                        </label>
                      </div>
                    </div>

                    {/* Background Gradient */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Background Color</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['blue-50', 'green-50', 'purple-50', 'gray-50', 'yellow-50', 'pink-50'].map(color => (
                          <button
                            key={color}
                            onClick={() => setBlogEmbedCustomizations(prev => ({ ...prev, backgroundGradient: color }))}
                            className={`h-10 rounded-lg border-2 transition-all bg-gradient-to-r from-${color} to-white ${
                              blogEmbedCustomizations.backgroundGradient === color
                                ? 'border-green-500 shadow-lg scale-105'
                                : 'border-gray-300 hover:scale-102'
                            }`}
                            title={color.replace('-', ' ').toUpperCase()}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Preview and Embed Code */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h4>
                    <div className="mb-6 border rounded-lg overflow-hidden">
                      <iframe
                        key={JSON.stringify(blogEmbedCustomizations)} // Force reload on changes
                        src={`${window.location.origin}/blog-embed/${feedUrl}?${new URLSearchParams(Object.entries(blogEmbedCustomizations).reduce((acc, [key, value]) => {
                          if (value === true) acc[key] = 'true';
                          else if (value !== false && value !== (key === 'theme' ? 'light' : key === 'backgroundGradient' ? 'blue-50' : key === 'itemCount' ? 5 : false)) {
                            acc[key] = value.toString();
                          }
                          return acc;
                        }, {} as Record<string, string>)).toString()}`}
                        className="w-full h-64 border-0"
                        title="Blog Embed Preview"
                      />
                    </div>

                    {/* Embed Code */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Embed Code
                        </label>
                        <button
                          onClick={copyBlogEmbedCode}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                        >
                          {copiedEmbed ? (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-1" />
                              Copy Code
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        readOnly
                        value={generateBlogEmbedCode()}
                        className="w-full p-3 text-sm font-mono bg-gray-50 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={4}
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                      />
                    </div>

                    {/* Instructions */}
                    <div className="mt-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                      <h4 className="font-semibold text-green-900 mb-2 text-sm">
                        ✅ Blog Embed Features:
                      </h4>
                      <ul className="text-xs text-green-800 space-y-1">
                        <li>• 1500ms timeout protection</li>
                        <li>• Self-contained (works when source is down)</li>
                        <li>• Responsive design</li>
                        <li>• Clean, readable layout</li>
                        <li>• Optional full content extraction</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedDetail;