import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../services/socket';
import { playPop } from '../services/sound';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Youtube, 
  Radio, 
  Disc3, 
  Sparkles, 
  Film, 
  RotateCcw,
  Headphones,
  Plus,
  Moon,
  CloudRain,
  Flame,
  Sunset,
  Coffee,
  Music,
  Heart,
  AlertCircle
} from 'lucide-react';

export const PRESET_TRACKS = [
  {
    id: 'ambient_1',
    title: 'Midnight Lo-Fi Romance',
    artist: 'Couple Beats',
    genre: 'Lo-Fi Chill',
    source: 'ambient',
    url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    icon: 'moon',
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    duration: 147,
  },
  {
    id: 'ambient_2',
    title: 'Gentle Rain & Sweet Piano',
    artist: 'Peaceful Moments',
    genre: 'Rain & Piano',
    source: 'ambient',
    url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=rain-and-nostalgia-20516.mp3',
    icon: 'rain',
    color: 'bg-sky-50 text-sky-600 border-sky-200',
    duration: 168,
  },
  {
    id: 'ambient_3',
    title: 'Starlit Acoustic Serenade',
    artist: 'Acoustic Dreams',
    genre: 'Acoustic Love',
    source: 'ambient',
    url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=sweet-love-112705.mp3',
    icon: 'sparkles',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    duration: 154,
  },
  {
    id: 'ambient_4',
    title: 'Warm Fireside Acoustic',
    artist: 'Cozy Moments',
    genre: 'Fireside Chill',
    source: 'ambient',
    url: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77c30.mp3?filename=relaxing-guitar-loop-124976.mp3',
    icon: 'flame',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
    duration: 120,
  },
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Girl - Relax & Study Beats',
    artist: 'Lofi Girl Live',
    genre: 'Lofi Live',
    source: 'youtube',
    videoId: 'jfKfPfyJRdk',
    icon: 'headphones',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    duration: 0,
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Sunset & Chill',
    artist: 'Lofi Sunset',
    genre: 'Synthwave',
    source: 'youtube',
    videoId: '4xDzrJKXOOY',
    icon: 'sunset',
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    duration: 0,
  },
  {
    id: '-5KAN9_CzSA',
    title: 'Cozy Coffee Shop & Rain Jazz',
    artist: 'Coffee Rain Beats',
    genre: 'Coffee Jazz',
    source: 'youtube',
    videoId: '-5KAN9_CzSA',
    icon: 'coffee',
    color: 'bg-stone-100 text-stone-700 border-stone-300',
    duration: 0,
  },
];

// Bespoke icon renderer for tracks
export function renderTrackIcon(iconName, className = 'w-4 h-4') {
  switch (iconName) {
    case 'moon': return <Moon className={className} />;
    case 'rain': return <CloudRain className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'flame': return <Flame className={className} />;
    case 'headphones': return <Headphones className={className} />;
    case 'sunset': return <Sunset className={className} />;
    case 'coffee': return <Coffee className={className} />;
    case 'heart': return <Heart className={className} />;
    default: return <Music className={className} />;
  }
}

function extractYouTubeId(url) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : (url.length === 11 ? url : null);
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function AudioPlayer({ 
  room, 
  user, 
  activeTab, 
  onSwitchTab,
  onPlayStateChange 
}) {
  const [currentTrack, setCurrentTrack] = useState(room?.currentTrack || PRESET_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [syncStatus, setSyncStatus] = useState('In Sync');
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [youtubeError, setYoutubeError] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [showVideoEmbed, setShowVideoEmbed] = useState(false);

  const htmlAudioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isSelfTriggeredRef = useRef(false);
  const [remoteToast, setRemoteToast] = useState(null);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  const toastTimerRef = useRef(null);

  const DRIFT_THRESHOLD_SECONDS = 0.25;

  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying, currentTrack);
    }
  }, [isPlaying, currentTrack, onPlayStateChange]);

  // YouTube IFrame API Initialization (Target is ALWAYS present in DOM)
  useEffect(() => {
    let ytPlayer = null;

    const initYT = () => {
      if (window.YT && window.YT.Player && document.getElementById('youtube-hidden-player')) {
        ytPlayer = new window.YT.Player('youtube-hidden-player', {
          height: '100%',
          width: '100%',
          videoId: currentTrack.source === 'youtube' ? (currentTrack.videoId || currentTrack.id) : 'jfKfPfyJRdk',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            rel: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              ytPlayerRef.current = event.target;
              event.target.setVolume(volume * 100);
            },
            onStateChange: (event) => {
              if (event.data === 1 && !isPlaying && isSelfTriggeredRef.current) {
                setIsPlaying(true);
              } else if (event.data === 2 && isPlaying && isSelfTriggeredRef.current) {
                setIsPlaying(false);
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      window.onYouTubeIframeAPIReady = initYT;
    }

    return () => {
      if (ytPlayer && ytPlayer.destroy) {
        ytPlayer.destroy();
      }
    };
  }, []);

  // Sync listener from Socket.io
  useEffect(() => {
    const handleAudioSync = (data) => {
      const { action, track, currentTime: syncCurrentTime, sentAt } = data;
      const now = Date.now();

      const latencyCompensation = sentAt ? (now - sentAt) / 1000 : 0;
      const targetTime = (syncCurrentTime || 0) + latencyCompensation;

      setSyncStatus(`Synced (${(latencyCompensation * 1000).toFixed(0)}ms)`);
      setTimeout(() => setSyncStatus('In Sync'), 3500);

      if (track) {
        setCurrentTrack(track);
      }

      // Show toast if partner remotely triggered the music action!
      const actorName = data.initiatedBy || data.triggeredBy;
      if (actorName && actorName !== user?.name) {
        let msg = '';
        if (action === 'change_track' && track) {
          msg = `${actorName} queued "${track.title}" 🎵`;
        } else if (action === 'play') {
          msg = `${actorName} hit Play ▶️`;
        } else if (action === 'pause') {
          msg = `${actorName} paused music ⏸️`;
        }
        if (msg) {
          setRemoteToast(msg);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setRemoteToast(null), 3500);
        }
      }

      const activeSource = track?.source || currentTrack.source;

      if (action === 'play' || action === 'change_track') {
        setIsMiniPlayerDismissed(false);
      }

      if (action === 'play') {
        setIsPlaying(true);
        if (activeSource === 'youtube' && ytPlayerRef.current) {
          const currentYT = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
          if (Math.abs(currentYT - targetTime) >= DRIFT_THRESHOLD_SECONDS) {
            ytPlayerRef.current.seekTo(targetTime, true);
          }
          ytPlayerRef.current.playVideo();
        } else if (htmlAudioRef.current) {
          const currentAudio = htmlAudioRef.current.currentTime;
          if (Math.abs(currentAudio - targetTime) >= DRIFT_THRESHOLD_SECONDS) {
            htmlAudioRef.current.currentTime = targetTime;
          }
          htmlAudioRef.current.play().catch(() => {
            setSyncStatus('Tap Play to Tune In');
          });
        }
      } else if (action === 'pause') {
        setIsPlaying(false);
        if (activeSource === 'youtube' && ytPlayerRef.current) {
          ytPlayerRef.current.pauseVideo();
          if (typeof targetTime === 'number') {
            ytPlayerRef.current.seekTo(targetTime, true);
          }
        } else if (htmlAudioRef.current) {
          htmlAudioRef.current.pause();
          if (typeof targetTime === 'number') {
            htmlAudioRef.current.currentTime = targetTime;
          }
        }
      } else if (action === 'seek') {
        setCurrentTime(targetTime);
        if (activeSource === 'youtube' && ytPlayerRef.current) {
          ytPlayerRef.current.seekTo(targetTime, true);
        } else if (htmlAudioRef.current) {
          htmlAudioRef.current.currentTime = targetTime;
        }
      } else if (action === 'change_track') {
        setIsPlaying(true);
        setCurrentTime(0);
        if (track.source === 'youtube' && ytPlayerRef.current) {
          const vId = track.videoId || track.id;
          ytPlayerRef.current.loadVideoById(vId);
          ytPlayerRef.current.playVideo();
        } else if (htmlAudioRef.current) {
          htmlAudioRef.current.src = track.url;
          htmlAudioRef.current.currentTime = 0;
          htmlAudioRef.current.play().catch(() => {});
        }
      }
    };

    socket.on('audio:sync', handleAudioSync);
    return () => {
      socket.off('audio:sync', handleAudioSync);
    };
  }, [currentTrack]);

  // Playhead updater
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentTrack.source === 'youtube' && ytPlayerRef.current && isPlaying) {
        try {
          const time = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
          const dur = ytPlayerRef.current.getDuration ? ytPlayerRef.current.getDuration() : 0;
          setCurrentTime(time);
          if (dur > 0) setDuration(dur);
        } catch (err) {}
      } else if (currentTrack.source === 'ambient' && htmlAudioRef.current && isPlaying) {
        setCurrentTime(htmlAudioRef.current.currentTime);
        if (htmlAudioRef.current.duration) {
          setDuration(htmlAudioRef.current.duration);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [currentTrack, isPlaying]);

  const togglePlay = () => {
    isSelfTriggeredRef.current = true;
    const nextIsPlaying = !isPlaying;
    if (nextIsPlaying) setIsMiniPlayerDismissed(false);
    setIsPlaying(nextIsPlaying);

    let activeTime = currentTime;
    if (currentTrack.source === 'ambient' && htmlAudioRef.current) {
      if (nextIsPlaying) {
        htmlAudioRef.current.play().catch(() => {});
      } else {
        htmlAudioRef.current.pause();
      }
      activeTime = htmlAudioRef.current.currentTime;
    } else if (currentTrack.source === 'youtube' && ytPlayerRef.current) {
      if (nextIsPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
      activeTime = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime;
    }

    socket.emit('audio:sync', {
      action: nextIsPlaying ? 'play' : 'pause',
      track: currentTrack,
      currentTime: activeTime,
      sentAt: Date.now(),
    });

    setTimeout(() => {
      isSelfTriggeredRef.current = false;
    }, 300);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);

    if (currentTrack.source === 'ambient' && htmlAudioRef.current) {
      htmlAudioRef.current.currentTime = newTime;
    } else if (currentTrack.source === 'youtube' && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(newTime, true);
    }

    socket.emit('audio:sync', {
      action: 'seek',
      track: currentTrack,
      currentTime: newTime,
      sentAt: Date.now(),
    });
  };

  const handleSelectTrack = (track) => {
    isSelfTriggeredRef.current = true;
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsMiniPlayerDismissed(false);
    setCurrentTime(0);

    if (track.source === 'youtube') {
      if (htmlAudioRef.current) htmlAudioRef.current.pause();
      const vId = track.videoId || track.id;
      if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
        ytPlayerRef.current.loadVideoById(vId);
        ytPlayerRef.current.playVideo();
      }
    } else {
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        ytPlayerRef.current.pauseVideo();
      }
      if (htmlAudioRef.current) {
        htmlAudioRef.current.src = track.url;
        htmlAudioRef.current.currentTime = 0;
        htmlAudioRef.current.play().catch(() => {});
      }
    }

    socket.emit('audio:sync', {
      action: 'change_track',
      track,
      currentTime: 0,
      sentAt: Date.now(),
    });
  };

  const handleCustomYoutubeSubmit = (e) => {
    e.preventDefault();
    setYoutubeError('');
    const videoId = extractYouTubeId(customYoutubeUrl);
    if (!videoId) {
      setYoutubeError('Please enter a valid YouTube video link or ID');
      setTimeout(() => setYoutubeError(''), 4000);
      return;
    }

    const newTrack = {
      id: videoId,
      videoId,
      title: 'YouTube Stream',
      artist: 'Partner Request',
      genre: 'YouTube Video',
      icon: 'headphones',
      color: 'bg-rose-50 text-rose-600 border-rose-200',
      source: 'youtube',
      duration: 0,
    };

    selectTrack(newTrack);
    setCustomYoutubeUrl('');
    setShowVideoEmbed(true);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (htmlAudioRef.current) htmlAudioRef.current.volume = val;
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      ytPlayerRef.current.setVolume(val * 100);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const targetVol = nextMuted ? 0 : volume || 0.5;
    if (htmlAudioRef.current) htmlAudioRef.current.volume = targetVol;
    if (ytPlayerRef.current && ytPlayerRef.current.setVolume) {
      ytPlayerRef.current.setVolume(targetVol * 100);
    }
  };

  const filteredTracks = PRESET_TRACKS.filter((t) => {
    if (selectedGenre === 'ambient') return t.source === 'ambient';
    if (selectedGenre === 'youtube') return t.source === 'youtube';
    return true;
  });

  return (
    <>
      {/* Background HTML5 audio element */}
      <audio
        ref={htmlAudioRef}
        src={currentTrack.source === 'ambient' ? currentTrack.url : ''}
        preload="auto"
        onEnded={() => setIsPlaying(false)}
      />

      {/* Remote Jukebox Partner Activity Toast */}
      {remoteToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className="bg-white/95 text-[#18181b] border border-[#ffcdbc] shadow-[0_8px_24px_rgba(255,87,34,0.15)] rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#ff5722] animate-ping" />
            <span>{remoteToast}</span>
          </div>
        </div>
      )}

      {/* 1. MINI-PLAYER PILL (Appears on canvas ONLY when music is actively playing) */}
      {activeTab === 'canvas' && isPlaying && !isMiniPlayerDismissed && (
        <div className="absolute top-2.5 right-2.5 sm:right-4 z-20 pointer-events-auto max-w-[270px] sm:max-w-xs animate-fadeIn">
          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-2xl bg-white/95 backdrop-blur-md border border-[#ede8e1] shadow-md transition-all">
            <div 
              onClick={() => onSwitchTab('music')}
              className="flex items-center gap-2 cursor-pointer min-w-0 flex-1"
              title="Open Music Lounge"
            >
              <div className="w-6 h-6 rounded-lg bg-[#fff3ef] border border-[#ffcdbc] flex items-center justify-center flex-shrink-0 text-[#ff5722]">
                <Disc3 className="w-3.5 h-3.5 animate-spin-slow" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-zinc-900 truncate">
                  {currentTrack.title}
                </p>
                <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                  <span className="truncate max-w-[90px]">{currentTrack.artist}</span>
                  <span className="flex items-center gap-0.5 text-[#ff5722] flex-shrink-0">
                    <span className="w-0.5 h-1.5 bg-[#ff5722] animate-pulse rounded-full" />
                    <span className="w-0.5 h-2.5 bg-[#ff5722] animate-pulse delay-75 rounded-full" />
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                id="mini-play-btn"
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play"}
                className="w-6 h-6 rounded-lg bg-[#ff5722] hover:bg-[#f4511e] text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
              >
                {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
              </button>
              <button
                onClick={() => setIsMiniPlayerDismissed(true)}
                title="Hide overlay from canvas"
                className="w-5 h-5 rounded-md text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEDICATED MUSIC LOUNGE TAB (Creator Studio Clean Aesthetic) */}
      <div className={`w-full max-w-xl mx-auto flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3.5 pb-28 space-y-3.5 ${activeTab === 'music' ? 'block' : 'hidden'}`}>
        
        {/* Status Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1] w-full">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-orange-50 text-[#ff5722] border border-[#ffcdbc] flex-shrink-0">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 truncate">Music Lounge</h2>
              <p className="text-[11px] text-zinc-500 truncate">Listen together in real time</p>
            </div>
          </div>

          {isPlaying && (
            <div className="badge-mint rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Playing</span>
            </div>
          )}
        </div>

        {/* Master Player Card (Crisp White Card with Studio Styling) */}
        <div className="flex-shrink-0 w-full rounded-2xl sm:rounded-3xl studio-card p-5 sm:p-6 shadow-sm flex flex-col items-center box-border">
          
          {/* Toggle Video vs Vinyl */}
          {currentTrack.source === 'youtube' && (
            <div className="w-full flex justify-end mb-2">
              <button
                onClick={() => setShowVideoEmbed(!showVideoEmbed)}
                className="studio-btn-secondary flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold text-zinc-700"
              >
                {showVideoEmbed ? (
                  <>
                    <Disc3 className="w-3.5 h-3.5 text-[#ff5722] animate-spin-slow" />
                    <span>Switch to Vinyl View</span>
                  </>
                ) : (
                  <>
                    <Film className="w-3.5 h-3.5 text-[#ff5722]" />
                    <span>Watch Video Frame</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Media Center: YouTube Iframe Mount (ALWAYS in DOM) & Vinyl Platter */}
          <div className="w-full flex justify-center items-center my-2">
            {/* 1) YouTube video player container */}
            <div 
              className={`w-full aspect-video rounded-2xl overflow-hidden border border-[#ede8e1] shadow-sm bg-black ${
                showVideoEmbed && currentTrack.source === 'youtube' ? 'block' : 'hidden'
              }`}
            >
              <div id="youtube-hidden-player" className="w-full h-full" />
            </div>

            {/* 2) Spinning Vinyl Turntable (Visible when not in video mode) */}
            <div className={`w-full flex justify-center py-2 ${showVideoEmbed && currentTrack.source === 'youtube' ? 'hidden' : 'flex'}`}>
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#18181b] p-2 shadow-md border-4 border-[#f4efe8] flex items-center justify-center overflow-hidden">
                <div className={`w-full h-full rounded-full bg-[#1c1917] border border-white/10 flex items-center justify-center relative shadow-inner ${isPlaying ? 'animate-spin-slow' : ''}`}>
                  <div className="absolute inset-3 rounded-full border border-white/5" />
                  <div className="absolute inset-6 rounded-full border border-white/5" />
                  <div className="absolute inset-9 rounded-full border border-white/5" />
                  
                  {/* Center Label (Matches Studio Coral with Vector Icon) */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-[#ff5722] to-[#ff6b35] flex flex-col items-center justify-center text-white shadow-md border-2 border-white/20">
                    <div className="text-white drop-shadow-xs">
                      {renderTrackIcon(currentTrack.icon, 'w-6 h-6')}
                    </div>
                    <span className="text-[7px] font-bold uppercase opacity-90 mt-0.5 tracking-wider">DUO PLAY</span>
                  </div>

                  <div className="absolute w-3 h-3 rounded-full bg-zinc-900 border border-white/30" />
                </div>
              </div>
            </div>
          </div>

          {/* Track Details */}
          <div className="text-center mt-3 w-full px-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
              {currentTrack.artist} • <span className="text-[#ff5722] font-semibold">{currentTrack.genre || 'Synchronized'}</span>
            </p>
          </div>

          {/* Timeline Scrubber */}
          <div className="w-full mt-3.5 space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 180}
              step="0.5"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#ede8e1] rounded-lg appearance-none cursor-pointer accent-[#ff5722]"
            />
            <div className="flex justify-between text-[11px] text-zinc-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : 'Live Stream'}</span>
            </div>
          </div>

          {/* Play/Pause & Volume Controls */}
          <div className="w-full flex items-center justify-between mt-3 pt-3 border-t border-[#ede8e1]">
            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={toggleMute}
                className="text-zinc-400 hover:text-zinc-700"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-[#ff5722]" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 h-1 bg-[#ede8e1] rounded appearance-none cursor-pointer accent-[#ff5722]"
              />
            </div>

            {/* Play/Pause Button (Primary Coral Studio Button) */}
            <button
              id="master-play-btn"
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl studio-btn-primary flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Re-sync Button */}
            <button
              onClick={() => selectTrack(currentTrack)}
              title="Re-sync playback with partner"
              className="p-2 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-[#faf7f2] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom YouTube Stream Input Card (Matches Persona Fleet Search / New Persona style) */}
        <div className="flex-shrink-0 w-full rounded-2xl sm:rounded-3xl studio-card p-4 sm:p-5 shadow-sm box-border">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#ff5722]">
                <Youtube className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Stream Any Song from YouTube</h4>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium">Synced Video & Audio</span>
          </div>
          <form onSubmit={handleCustomYoutubeSubmit} className="flex gap-2 w-full">
            <input
              type="text"
              value={customYoutubeUrl}
              onChange={(e) => setCustomYoutubeUrl(e.target.value)}
              placeholder="Paste YouTube video URL or ID..."
              className="flex-1 min-w-0 bg-[#faf8f5] text-xs px-3.5 py-2.5 rounded-xl border border-[#e2ddd5] focus:outline-none focus:border-[#ff5722] text-zinc-900 placeholder:text-zinc-400 transition-colors"
            />
            <button
              type="submit"
              className="studio-btn-primary px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap active:scale-95 transition-transform flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Play for Both</span>
            </button>
          </form>
          {youtubeError && (
            <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{youtubeError}</span>
            </div>
          )}
        </div>

        {/* Curated Duo Stations Card (Matches Persona Fleet List in screenshot) */}
        <div className="flex-shrink-0 w-full rounded-2xl sm:rounded-3xl studio-card p-4 sm:p-5 shadow-sm box-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Curated Duo Stations</h4>
            </div>

            {/* Filter Pills (Matches Overview / Persona Fleet tabs) */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-[#f4efe8]/70 border border-[#e8e2d8]">
              <button
                onClick={() => setSelectedGenre('all')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition-all ${
                  selectedGenre === 'all' 
                    ? 'bg-white text-[#ff5722] shadow-xs border border-[#ffcdbc]' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedGenre('ambient')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition-all ${
                  selectedGenre === 'ambient' 
                    ? 'bg-white text-[#ff5722] shadow-xs border border-[#ffcdbc]' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Lo-Fi
              </button>
              <button
                onClick={() => setSelectedGenre('youtube')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg transition-all ${
                  selectedGenre === 'youtube' 
                    ? 'bg-white text-[#ff5722] shadow-xs border border-[#ffcdbc]' 
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                YouTube
              </button>
            </div>
          </div>

          {/* Station List (Matches Persona list rows) */}
          <div className="space-y-2 w-full">
            {filteredTracks.map((track) => {
              const isCurrent = currentTrack.id === track.id;
              return (
                <div
                  key={track.id}
                  onClick={() => selectTrack(track)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between w-full max-w-full ${
                    isCurrent
                      ? 'bg-[#fff5f2] border-[#ffcdbc] shadow-xs'
                      : 'bg-white hover:bg-[#fbf9f6] border-[#ede8e1]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 mr-2 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${track.color}`}>
                      {renderTrackIcon(track.icon, 'w-4 h-4')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isCurrent ? 'text-[#ff5722]' : 'text-zinc-900'}`}>
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 truncate">
                          {track.artist}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-[#f4efe8] text-zinc-600 border border-[#e4ded5]">
                          {track.source === 'youtube' ? 'YouTube' : 'Ambient'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-1">
                    {isCurrent && isPlaying ? (
                      <span className="flex items-center gap-0.5 text-[#ff5722]">
                        <span className="w-0.5 h-3 bg-[#ff5722] animate-pulse rounded-full" />
                        <span className="w-0.5 h-2 bg-[#ff5722] animate-pulse delay-75 rounded-full" />
                      </span>
                    ) : (
                      <div className="w-7 h-7 rounded-xl bg-[#f4efe8] hover:bg-[#ff5722] hover:text-white text-zinc-600 flex items-center justify-center transition-colors">
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Floating Mobile Autoplay Tune-In Prompt */}
      {syncStatus === 'Tap Play to Tune In' && (
        <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-auto">
          <button
            onClick={() => {
              togglePlay();
              setSyncStatus('In Sync');
            }}
            className="px-4 py-2 rounded-full bg-[#ff5722] hover:bg-[#f4511e] text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Partner started music • Tap to tune in</span>
          </button>
        </div>
      )}
    </>
  );
}
