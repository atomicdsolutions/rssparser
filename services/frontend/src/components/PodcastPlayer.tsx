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

interface PodcastPlayerProps {
  episodes: Episode[];
  podcastTitle: string;
  podcastDescription?: string;
  podcastImage?: string;
}

const PodcastPlayer: React.FC<PodcastPlayerProps> = ({
  episodes,
  podcastTitle,
  podcastDescription,
  podcastImage
}) => {
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');

  const currentEpisodeData = episodes[currentEpisode];
  const audioUrl = currentEpisodeData?.media_urls?.[0];

  const containerRef = useRef<HTMLDivElement>(null);
  
  const { wavesurfer, isReady } = useWavesurfer({
    container: containerRef,
    height: 80,
    waveColor: '#6366f1',
    progressColor: '#4f46e5',
    cursorColor: '#ffffff',
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
    } else if (repeatMode === 'all' || currentEpisode < episodes.length - 1) {
      if (isShuffled) {
        const randomIndex = Math.floor(Math.random() * episodes.length);
        setCurrentEpisode(randomIndex);
      } else {
        setCurrentEpisode((prev) => (prev + 1) % episodes.length);
      }
      setIsPlaying(false);
      // Auto-play next episode
      setTimeout(() => {
        if (wavesurfer) {
          wavesurfer.play();
          setIsPlaying(true);
        }
      }, 100);
    }
  }, [repeatMode, wavesurfer, currentEpisode, episodes.length, isShuffled]);

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
    if (isShuffled) {
      const randomIndex = Math.floor(Math.random() * episodes.length);
      setCurrentEpisode(randomIndex);
    } else {
      setCurrentEpisode((prev) => (prev + 1) % episodes.length);
    }
    setIsPlaying(false);
  };

  const previousEpisode = () => {
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
    setIsShuffled(!isShuffled);
  };

  const toggleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % modes.length]);
  };

  if (!currentEpisodeData || !audioUrl) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <p className="text-gray-500">No audio available for this podcast.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl shadow-2xl overflow-hidden">
      {/* Main Player */}
      <div className="p-8">
        {/* Podcast Header with Large Thumbnail */}
        <div className="flex items-start space-x-8 mb-8">
          {podcastImage && (
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
            <h2 className="text-2xl font-bold text-white mb-2">{podcastTitle}</h2>
            {podcastDescription && (
              <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">{podcastDescription}</p>
            )}
          </div>
        </div>

        {/* Current Episode Info */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-3 leading-tight">
            {currentEpisodeData.title}
          </h3>
          <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
            {currentEpisodeData.published && (
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {new Date(currentEpisodeData.published).toLocaleDateString()}
              </div>
            )}
            {currentEpisodeData.author && (
              <div className="flex items-center">
                <User className="h-4 w-4 mr-1" />
                {currentEpisodeData.author}
              </div>
            )}
            {currentEpisodeData.duration && (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatDuration(currentEpisodeData.duration)}
              </div>
            )}
          </div>
          <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
            {currentEpisodeData.description}
          </p>
        </div>

        {/* Waveform Visualization */}
        <div className="mb-8 bg-black bg-opacity-30 rounded-xl p-6">
          <div ref={containerRef} className="w-full" style={{ height: '80px' }} />
          <div className="flex justify-between text-sm text-gray-400 mt-3">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleShuffle}
              className={`p-3 rounded-full transition-all duration-200 ${
                isShuffled ? 'text-indigo-400 bg-indigo-500 bg-opacity-20' : 'text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`relative p-3 rounded-full transition-all duration-200 ${
                repeatMode !== 'none' ? 'text-indigo-400 bg-indigo-500 bg-opacity-20' : 'text-gray-400 hover:text-white hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <Repeat className="h-4 w-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-xs bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">1</span>
              )}
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={previousEpisode}
              className="p-3 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
            >
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              onClick={togglePlay}
              className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
            </button>
            <button
              onClick={nextEpisode}
              className="p-3 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110"
            >
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleMute} 
              className="p-3 text-gray-400 hover:text-white transition-colors duration-200 rounded-full hover:bg-white hover:bg-opacity-10"
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

        {/* Playlist Toggle */}
        <div className="border-t border-gray-700 pt-6">
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className="flex items-center space-x-3 text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200 group"
          >
            <List className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
            <span>{showPlaylist ? 'Hide' : 'Show'} Episodes ({episodes.length})</span>
          </button>
        </div>
      </div>

      {/* Playlist */}
      {showPlaylist && (
        <div className="border-t border-gray-700 bg-gray-800 bg-opacity-50">
          <div className="max-h-96 overflow-y-auto">
            {episodes.map((episode, index) => (
              <div
                key={index}
                onClick={() => selectEpisode(index)}
                className={`p-6 border-b border-gray-700 cursor-pointer transition-all duration-200 ${
                  index === currentEpisode
                    ? 'bg-indigo-500 bg-opacity-20 border-l-4 border-l-indigo-400'
                    : 'hover:bg-white hover:bg-opacity-5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-sm mb-2 leading-tight ${
                      index === currentEpisode ? 'text-indigo-300' : 'text-white'
                    }`}>
                      {episode.title}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                      {episode.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {episode.published && (
                        <span>{new Date(episode.published).toLocaleDateString()}</span>
                      )}
                      {episode.duration && (
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

export default PodcastPlayer;