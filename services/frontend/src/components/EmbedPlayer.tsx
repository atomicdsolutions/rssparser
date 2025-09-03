import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CustomizablePodcastPlayer from './CustomizablePodcastPlayer.tsx';

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

interface CustomizationOptions {
  theme: 'light' | 'dark';
  hideThumbnail: boolean;
  hideDescription: boolean;
  singlePlayer: boolean;
  hideDate: boolean;
  hideAuthor: boolean;
  hideDuration: boolean;
  backgroundGradient: string;
  episodeIndex?: number;
  itemCount?: number;
}

const EmbedPlayer: React.FC = () => {
  const { feedUrl } = useParams<{ feedUrl: string }>();
  const location = useLocation();
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Parse URL parameters for customization
  const customizations = useMemo((): CustomizationOptions => {
    const params = new URLSearchParams(location.search);
    return {
      theme: (params.get('theme') as 'light' | 'dark') || 'dark',
      hideThumbnail: params.get('hideThumbnail') === 'true',
      hideDescription: params.get('hideDescription') === 'true',
      singlePlayer: params.get('singlePlayer') === 'true',
      hideDate: params.get('hideDate') === 'true',
      hideAuthor: params.get('hideAuthor') === 'true',
      hideDuration: params.get('hideDuration') === 'true',
      backgroundGradient: params.get('backgroundGradient') || 'gray-900',
      episodeIndex: params.get('episodeIndex') ? parseInt(params.get('episodeIndex')!) : undefined,
      itemCount: params.get('itemCount') ? parseInt(params.get('itemCount')!) : undefined
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
    if (!currentFeed || currentFeed.type !== 'podcast') {
      setError('Invalid or unsupported feed for podcast embedding');
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
      setError('Failed to load podcast feed');
      console.error('Error loading feed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading podcast...</p>
        </div>
      </div>
    );
  }

  if (error || !currentFeed || !feedData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Podcast not found'}</p>
          <p className="text-gray-400 text-sm">Please check the embed URL</p>
        </div>
      </div>
    );
  }

  const itemsToShow = feedData?.items.slice(0, customizations.itemCount || 10) || [];

  const backgroundClass = customizations.theme === 'light' 
    ? 'bg-gray-100' 
    : 'bg-gray-900';

  return (
    <div className={`min-h-screen ${backgroundClass} p-4`}>
      <div className="max-w-4xl mx-auto">
        {/* Embedded Player */}
        <CustomizablePodcastPlayer
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
          customizations={customizations}
        />
        
        {/* Embed Attribution */}
        <div className="mt-6 text-center">
          <p className={`text-sm ${customizations.theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>
            Powered by{' '}
            <a 
              href={`${window.location.origin}/feed/${feedUrl}`}
              target="_parent"
              className={`transition-colors ${
                customizations.theme === 'light' 
                  ? 'text-blue-600 hover:text-blue-800' 
                  : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              RSS Feed Parser
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmbedPlayer;