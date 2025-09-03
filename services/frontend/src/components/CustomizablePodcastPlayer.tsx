import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWavesurfer } from '@wavesurfer/react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  Clock,
  Calendar,
  User,
  List,
  Shuffle,
  Repeat
} from 'lucide-react';

interface Episode {
  title: string;
  description: string;
  link: string;
  published?: string;
  author?: string;
  media_urls: string[];
  duration?: string;
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

interface CustomizablePodcastPlayerProps {
  episodes: Episode[];
  podcastTitle: string;
  podcastDescription?: string;
  podcastImage?: string;
  customizations: CustomizationOptions;
}

const CustomizablePodcastPlayer: React.FC<CustomizablePodcastPlayerProps> = ({
  episodes,
  podcastTitle,
  podcastDescription,
  podcastImage,
  customizations
}) => {
  const [currentEpisode, setCurrentEpisode] = useState(
    customizations.singlePlayer && customizations.episodeIndex !== undefined 
      ? Math.min(customizations.episodeIndex, episodes.length - 1)
      : 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(!customizations.singlePlayer);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');

  const currentEpisodeData = episodes[currentEpisode];
  const audioUrl = currentEpisodeData?.media_urls?.[0];

  const containerRef = useRef<HTMLDivElement>(null);
  
  const { wavesurfer, isReady } = useWavesurfer({
    container: containerRef,
    height: 80,
    waveColor: customizations.theme === 'light' ? '#3b82f6' : '#6366f1',
    progressColor: customizations.theme === 'light' ? '#1d4ed8' : '#4f46e5',
    cursorColor: customizations.theme === 'light' ? '#000000' : '#ffffff',
    barWidth: 2,
    barRadius: 2,
    responsive: true,
    url: audioUrl,
  });

  useEffect(() => {
    if (wavesurfer && isReady) {
      wavesurfer.setVolume(isMuted ? 0 : volume);
    }
  }, [wavesurfer, isReady, volume, isMuted]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    
    if (repeatMode === 'one') {
      if (wavesurfer) {
        wavesurfer.seekTo(0);
        wavesurfer.play();
        setIsPlaying(true);
      }
    } else if ((repeatMode === 'all' || currentEpisode < episodes.length - 1) && !customizations.singlePlayer) {
      if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * episodes.length);
        setCurrentEpisode(randomIndex);
      } else {
        setCurrentEpisode((prev) => (prev + 1) % episodes.length);
      }
      setIsPlaying(false);
      setTimeout(() => {
        if (wavesurfer) {
          wavesurfer.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  }, [repeatMode, wavesurfer, currentEpisode, episodes.length, isShuffled, customizations.singlePlayer]);

  useEffect(() => {
    if (wavesurfer && isReady) {
      const unsubscribePlay = wavesurfer.on('play', () => setIsPlaying(true));
      const unsubscribePause = wavesurfer.on('pause', () => setIsPlaying(false));
      const unsubscribeTimeUpdate = wavesurfer.on('timeupdate', (currentTime: number) => setCurrentTime(currentTime));
      const unsubscribeReady = wavesurfer.on('ready', () => setDuration(wavesurfer.getDuration()));
      const unsubscribeFinish = wavesurfer.on('finish', handleEnded);

      return () => {
        unsubscribePlay();
        unsubscribePause();
        unsubscribeTimeUpdate();
        unsubscribeReady();
        unsubscribeFinish();
      };
    }
  }, [wavesurfer, isReady, handleEnded]);

  const togglePlay = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
    }
  };

  const nextEpisode = () => {
    if (customizations.singlePlayer) return;
    if (isShuffled) {
      const randomIndex = Math.floor(Math.random() * episodes.length);
      setCurrentEpisode(randomIndex);
    } else {
      setCurrentEpisode((prev) => (prev + 1) % episodes.length);
    }
    setIsPlaying(false);
  };

  const previousEpisode = () => {
    if (customizations.singlePlayer) return;
    setCurrentEpisode((prev) => (prev - 1 + episodes.length) % episodes.length);
    setIsPlaying(false);
  };

  const selectEpisode = (index: number) => {
    setCurrentEpisode(index);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (duration: string) => {
    return duration || '0:00';
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleShuffle = () => {
    if (customizations.singlePlayer) return;
    setIsShuffled(!isShuffled);
  };

  const toggleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  if (!currentEpisodeData || !audioUrl) {
    return (
      <div className={`min-h-screen ${
        customizations.theme === 'light' ? 'bg-gray-100' : 'bg-gray-900'
      } flex items-center justify-center`}>
        <div className="text-center">
          <p className={customizations.theme === 'light' ? 'text-gray-600' : 'text-gray-300'}>
            No audio available for this podcast.
          </p>
        </div>
      </div>
    );
  }

  const themeClasses = customizations.theme === 'light' 
    ? {
        bg: 'bg-white',
        bgGradient: `bg-gradient-to-br from-${customizations.backgroundGradient} via-gray-50 to-white`,
        text: 'text-gray-900',
        textMuted: 'text-gray-600',
        textLight: 'text-gray-500',
        border: 'border-gray-200',
        buttonBg: 'bg-gray-100 hover:bg-gray-200',
        primary: 'text-blue-600',
        primaryBg: 'bg-blue-500 hover:bg-blue-600'
      }
    : {
        bg: 'bg-gray-800',
        bgGradient: `bg-gradient-to-br from-${customizations.backgroundGradient} via-gray-800 to-black`,
        text: 'text-white',
        textMuted: 'text-gray-300',
        textLight: 'text-gray-400',
        border: 'border-gray-700',
        buttonBg: 'bg-white bg-opacity-10 hover:bg-white hover:bg-opacity-20',
        primary: 'text-indigo-400',
        primaryBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
      };

  const episodesToShow = customizations.singlePlayer ? [currentEpisodeData] : episodes;

  return (
    <div className={`${themeClasses.bgGradient} rounded-2xl shadow-2xl overflow-hidden`}>
      <div className="p-8">
        {/* Podcast Header with Large Thumbnail */}
        {(!customizations.hideThumbnail || !customizations.hideDescription) && (
          <div className="flex items-start space-x-8 mb-8">
            {!customizations.hideThumbnail && podcastImage && (
              <div className="relative group">
                <img
                  src={podcastImage}
                  alt={podcastTitle}
                  className="w-32 h-32 rounded-2xl object-cover shadow-2xl transform transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            )}
            <div className="flex-1">
              <h2 className={`text-2xl font-bold ${themeClasses.text} mb-2`}>{podcastTitle}</h2>
              {!customizations.hideDescription && podcastDescription && (
                <p className={`${themeClasses.textMuted} text-sm line-clamp-3 leading-relaxed`}>
                  {podcastDescription}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Current Episode Info */}
        <div className="mb-8">
          <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3 leading-tight`}>
            {currentEpisodeData.title}
          </h3>
          <div className={`flex items-center space-x-6 text-sm ${themeClasses.textLight} mb-4`}>
            {!customizations.hideDate && currentEpisodeData.published && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(currentEpisodeData.published).toLocaleDateString()}
              </div>
            )}
            {!customizations.hideAuthor && currentEpisodeData.author && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {currentEpisodeData.author}
              </div>
            )}
            {!customizations.hideDuration && currentEpisodeData.duration && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatDuration(currentEpisodeData.duration)}
              </div>
            )}
          </div>
          {!customizations.hideDescription && (
            <p className={`${themeClasses.textMuted} text-sm line-clamp-2 leading-relaxed`}>
              {currentEpisodeData.description}
            </p>
          )}
        </div>

        {/* Waveform Visualization */}
        <div className={`mb-8 ${themeClasses.bg} bg-opacity-30 rounded-xl p-6`}>
          <div ref={containerRef} className="w-full" style={{ height: '80px' }} />
          <div className={`flex justify-between text-sm ${themeClasses.textLight} mt-3`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between mb-8">
          {!customizations.singlePlayer && (
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleShuffle}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isShuffled ? `${themeClasses.primary} ${themeClasses.buttonBg}` : `${themeClasses.textLight} ${themeClasses.buttonBg}`
                }`}
              >
                <Shuffle className="h-4 w-4" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`relative p-3 rounded-full transition-all duration-200 ${
                  repeatMode !== 'none' ? `${themeClasses.primary} ${themeClasses.buttonBg}` : `${themeClasses.textLight} ${themeClasses.buttonBg}`
                }`}
              >
                <Repeat className="h-4 w-4" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-xs bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">1</span>
                )}
              </button>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {!customizations.singlePlayer && (
              <button
                onClick={previousEpisode}
                className={`p-3 ${themeClasses.textLight} hover:${themeClasses.text} transition-all duration-200 hover:scale-110`}
              >
                <SkipBack className="h-6 w-6" />
              </button>
            )}
            <button
              onClick={togglePlay}
              className={`p-4 ${themeClasses.primaryBg} text-white rounded-full transition-all duration-200 transform hover:scale-105 shadow-lg`}
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </button>
            {!customizations.singlePlayer && (
              <button
                onClick={nextEpisode}
                className={`p-3 ${themeClasses.textLight} hover:${themeClasses.text} transition-all duration-200 hover:scale-110`}
              >
                <SkipForward className="h-6 w-6" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleMute} 
              className={`p-3 ${themeClasses.textLight} hover:${themeClasses.text} transition-colors duration-200 rounded-full ${themeClasses.buttonBg}`}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <div className="relative">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(isMuted ? 0 : volume) * 100}%, #374151 ${(isMuted ? 0 : volume) * 100}%, #374151 100%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Playlist Toggle - Only show if not single player */}
        {!customizations.singlePlayer && (
          <div className={`border-t ${themeClasses.border} pt-6`}>
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`flex items-center space-x-3 ${themeClasses.textLight} hover:${themeClasses.text} text-sm font-medium transition-colors duration-200 group`}
            >
              <List className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              <span>{showPlaylist ? 'Hide' : 'Show'} Episodes ({episodes.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Playlist - Only show if not single player */}
      {showPlaylist && !customizations.singlePlayer && (
        <div className={`border-t ${themeClasses.border} ${themeClasses.bg} bg-opacity-50`}>
          <div className="max-h-96 overflow-y-auto">
            {episodesToShow.map((episode, index) => (
              <div
                key={index}
                onClick={() => selectEpisode(index)}
                className={`p-6 border-b ${themeClasses.border} cursor-pointer transition-all duration-200 ${
                  index === currentEpisode
                    ? `${themeClasses.primary} bg-opacity-20 border-l-4 border-l-indigo-400`
                    : `hover:${themeClasses.buttonBg}`
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm mb-2 leading-tight ${
                      index === currentEpisode ? themeClasses.primary : themeClasses.text
                    }`}>
                      {episode.title}
                    </h4>
                    {!customizations.hideDescription && (
                      <p className={`text-xs ${themeClasses.textLight} line-clamp-2 mb-3 leading-relaxed`}>
                        {episode.description}
                      </p>
                    )}
                    <div className={`flex items-center space-x-4 text-xs ${themeClasses.textLight}`}>
                      {!customizations.hideDate && episode.published && (
                        <span>{new Date(episode.published).toLocaleDateString()}</span>
                      )}
                      {!customizations.hideDuration && episode.duration && (
                        <span className="font-medium">{formatDuration(episode.duration)}</span>
                      )}
                    </div>
                  </div>
                  {index === currentEpisode && isPlaying && (
                    <div className="ml-4">
                      <div className="flex space-x-1 items-center">
                        <div className="w-1 h-5 bg-indigo-400 animate-pulse rounded-full"></div>
                        <div className="w-1 h-6 bg-indigo-400 animate-pulse rounded-full" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-1 h-4 bg-indigo-400 animate-pulse rounded-full" style={{animationDelay: '0.4s'}}></div>
                        <div className="w-1 h-5 bg-indigo-400 animate-pulse rounded-full" style={{animationDelay: '0.6s'}}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomizablePodcastPlayer;