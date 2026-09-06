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
  AlertCircle,
  Upload,
  HardDrive,
  Trash2,
  FileAudio,
  CheckCircle2
} from 'lucide-react';
import { 
  saveLocalTrackToDB, 
  getLocalTracksFromDB, 
  deleteLocalTrackFromDB 
} from '../services/localAudioDb';

const SILENT_AUDIO = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

export const DEFAULT_TRACK = {
  id: 'blue',
  url: '/music/blue.mp3',
  title: 'blue',
  artist: 'yung kai',
  genre: 'Love / Playlist',
  source: 'local',
  icon: 'heart',
  color: 'bg-blue-50 text-blue-600 border-blue-200',
  duration: 213,
};

export const PRESET_TRACKS = [
  DEFAULT_TRACK,
  {
    "id": "sunflower",
    "url": "/music/sunflower.mp3",
    "title": "Sunflower",
    "artist": "Post Malone",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "whistle",
    "url": "/music/whistle.mp3",
    "title": "Whistle",
    "artist": "BLACKPINK",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "you_never_know",
    "url": "/music/you_never_know.mp3",
    "title": "You Never Know",
    "artist": "BLACKPINK",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "secret_love_song",
    "url": "/music/secret_love_song.mp3",
    "title": "Secret Love Song",
    "artist": "Little Mix",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "despacito",
    "url": "/music/despacito.mp3",
    "title": "Despacito",
    "artist": "Luis Fonsi, Daddy Yankee",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "little_do_you_know",
    "url": "/music/little_do_you_know.mp3",
    "title": "Little Do You Know",
    "artist": "Alex & Sierra",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "cars_outside",
    "url": "/music/cars_outside.mp3",
    "title": "Car's Outside",
    "artist": "James Arthur",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "star_crossed",
    "url": "/music/star_crossed.mp3",
    "title": "Star-Crossed",
    "artist": "Peggy",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "worlds_smallest_violin",
    "url": "/music/worlds_smallest_violin.mp3",
    "title": "World's Smallest Violin",
    "artist": "AJR",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "dam",
    "url": "/music/dam.mp3",
    "title": "DAM",
    "artist": "SB19",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "diamonds",
    "url": "/music/diamonds.mp3",
    "title": "Diamonds",
    "artist": "Rihanna",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "yesterday_once_more",
    "url": "/music/yesterday_once_more.mp3",
    "title": "Yesterday Once More",
    "artist": "Carpenters",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "die_with_a_smile",
    "url": "/music/die_with_a_smile.mp3",
    "title": "Die With A Smile",
    "artist": "Lady Gaga, Bruno Mars",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "just_the_way_you_are",
    "url": "/music/just_the_way_you_are.mp3",
    "title": "Just The Way You Are",
    "artist": "Bruno Mars",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "marry_you",
    "url": "/music/marry_you.mp3",
    "title": "Marry You",
    "artist": "Bruno Mars",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "versace_on_the_floor",
    "url": "/music/versace_on_the_floor.mp3",
    "title": "Versace On The Floor",
    "artist": "Bruno Mars",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "grenade",
    "url": "/music/grenade.mp3",
    "title": "Grenade",
    "artist": "Bruno Mars",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "i_love_you_bodyguard",
    "url": "/music/i_love_you_bodyguard.mp3",
    "title": "I Love You",
    "artist": "Ash King, Clinton Cerejo (Bodyguard)",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "homage",
    "url": "/music/homage.mp3",
    "title": "Homage",
    "artist": "Mild High Club",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "finding_her",
    "url": "/music/finding_her.mp3",
    "title": "Finding Her",
    "artist": "Unknown",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "tum_hi_ho",
    "url": "/music/tum_hi_ho.mp3",
    "title": "Tum Hi Ho",
    "artist": "Arijit Singh",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  },
  {
    "id": "teri_baatein",
    "url": "/music/teri_baatein.mp3",
    "title": "Teri Baatein",
    "artist": "Unknown",
    "genre": "Love / Playlist",
    "source": "local",
    "icon": "heart",
    "color": "bg-pink-50 text-pink-600 border-pink-200"
  }
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
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  if (match && match[1]) return match[1];
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const v = parsed.searchParams.get('v');
    if (v && v.length === 11) return v;
    const parts = parsed.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && last.length === 11) return last;
  } catch (e) {}
  return null;
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
  const [currentTrack, setCurrentTrack] = useState(room?.currentTrack || DEFAULT_TRACK);
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
  const [localTracks, setLocalTracks] = useState([]);
  const [isUploadingLocal, setIsUploadingLocal] = useState(false);
  const fileInputRef = useRef(null);
  const activeBlobUrlsRef = useRef(new Map());

  // Load user's saved local storage tracks from IndexedDB
  useEffect(() => {
    getLocalTracksFromDB()
      .then((tracks) => {
        setLocalTracks(tracks || []);
      })
      .catch((err) => {
        console.warn('Failed to load local tracks from IndexedDB:', err);
      });
  }, []);

  const htmlAudioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const isSelfTriggeredRef = useRef(false);
  const currentTrackRef = useRef(currentTrack);
  const isPlayingRef = useRef(isPlaying);
  const volumeRef = useRef(volume);
  const pendingTrackRef = useRef(null);
  const [remoteToast, setRemoteToast] = useState(null);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const DRIFT_THRESHOLD_SECONDS = 0.25;

  useEffect(() => {
    if (onPlayStateChange) {
      onPlayStateChange(isPlaying, currentTrack);
    }
  }, [isPlaying, currentTrack, onPlayStateChange]);

  // Synchronize HTML5 audio element reliably without React DOM attribute collisions
  useEffect(() => {
    const audio = htmlAudioRef.current;
    if (!audio) return;

    if (currentTrack.source === 'youtube') {
      if (!audio.src || !audio.src.startsWith('data:audio/wav')) {
        audio.src = SILENT_AUDIO;
        audio.loop = true;
        if (isPlaying) {
          audio.play().catch(() => {});
        }
      }
      return;
    }

    audio.loop = false;
    const targetUrl = currentTrack.url;
    if (!targetUrl) return;

    const isSameSrc = audio.src && (audio.src === targetUrl || audio.src.endsWith(targetUrl));
    if (!isSameSrc) {
      audio.src = targetUrl;
      audio.load();
    }

    if (isPlaying) {
      const p = audio.play();
      if (p !== undefined) {
        p.catch((err) => {
          console.warn('Playback prevented or aborted:', err);
        });
      }
    } else {
      audio.pause();
    }
  }, [currentTrack.url, currentTrack.source, isPlaying]);

  // MediaSession API Integration for Android Lock Screen & Notification Controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Nikhana Couple Beats',
        artist: currentTrack.artist || 'Shared Studio',
        album: 'Nikhana Play',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!isPlaying) togglePlay();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (isPlaying) togglePlay();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          const allTracks = [DEFAULT_TRACK, ...localTracks];
          const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
          const nextTrack = allTracks[(currentIndex + 1) % allTracks.length];
          if (nextTrack) {
            if (nextTrack.isLocal || nextTrack.blob) {
              handlePlaySavedLocalTrack(nextTrack);
            } else {
              handleSelectTrack(nextTrack);
            }
          }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          const allTracks = [DEFAULT_TRACK, ...localTracks];
          const currentIndex = allTracks.findIndex((t) => t.id === currentTrack.id);
          const prevIndex = (currentIndex - 1 + allTracks.length) % allTracks.length;
          const prevTrack = allTracks[prevIndex];
          if (prevTrack) {
            if (prevTrack.isLocal || prevTrack.blob) {
              handlePlaySavedLocalTrack(prevTrack);
            } else {
              handleSelectTrack(prevTrack);
            }
          }
        });
      } catch (err) {
        console.log('MediaSession handlers not supported:', err);
      }
    }
  }, [currentTrack, isPlaying]);

  // Native Android Foreground Service integration for persistent background music
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Capacitor?.Plugins?.WidgetBridge) {
      if (isPlaying) {
        window.Capacitor.Plugins.WidgetBridge.startMusicForeground({
          title: currentTrack.title || 'Our Playlist',
          artist: currentTrack.artist || 'Partner Play',
        }).catch(() => {});
      } else {
        window.Capacitor.Plugins.WidgetBridge.stopMusicForeground().catch(() => {});
      }
    }
  }, [isPlaying, currentTrack.title, currentTrack.artist]);

  // YouTube IFrame API Initialization (Target is ALWAYS present in DOM)
  useEffect(() => {
    let ytPlayer = null;
    let pollInterval = null;

    const initYT = () => {
      if (ytPlayerRef.current) return;
      const mountEl = document.getElementById('youtube-hidden-player');
      if (!mountEl) return;

      if (window.YT && window.YT.Player) {
        try {
          ytPlayer = new window.YT.Player('youtube-hidden-player', {
            height: '100%',
            width: '100%',
            videoId: currentTrackRef.current?.source === 'youtube' 
              ? (currentTrackRef.current.videoId || currentTrackRef.current.id) 
              : 'jfKfPfyJRdk',
            playerVars: {
              autoplay: 0,
              controls: 1,
              disablekb: 0,
              fs: 1,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              enablejsapi: 1,
              ...(window.location.origin && window.location.origin !== 'null' ? { origin: window.location.origin } : {}),
            },
            events: {
              onReady: (event) => {
                ytPlayerRef.current = event.target;
                try {
                  event.target.setVolume(volumeRef.current * 100);
                } catch (err) {}

                if (pendingTrackRef.current) {
                  const targetTrack = pendingTrackRef.current;
                  pendingTrackRef.current = null;
                  if (targetTrack.source === 'youtube') {
                    const targetId = targetTrack.videoId || targetTrack.id;
                    event.target.loadVideoById(targetId);
                    if (isPlayingRef.current) {
                      event.target.playVideo();
                    }
                  }
                }
              },
              onStateChange: (event) => {
                if (event.data === 1) {
                  // Playing
                  if (!isPlayingRef.current) {
                    setIsPlaying(true);
                    isPlayingRef.current = true;
                    if (!isSelfTriggeredRef.current) {
                      socket.emit('audio:sync', {
                        action: 'play',
                        track: currentTrackRef.current,
                        currentTime: event.target.getCurrentTime ? event.target.getCurrentTime() : 0,
                        sentAt: Date.now(),
                        initiatedBy: user?.name || 'Partner',
                      });
                    }
                  }
                } else if (event.data === 2) {
                  // Paused
                  if (isPlayingRef.current) {
                    if (document.hidden && !isSelfTriggeredRef.current) {
                      // If YouTube pauses involuntarily when phone screen locks, auto-resume background playback
                      setTimeout(() => {
                        if (ytPlayerRef.current && isPlayingRef.current && ytPlayerRef.current.playVideo) {
                          ytPlayerRef.current.playVideo();
                        }
                      }, 250);
                    } else {
                      setIsPlaying(false);
                      isPlayingRef.current = false;
                      if (!isSelfTriggeredRef.current) {
                        socket.emit('audio:sync', {
                          action: 'pause',
                          track: currentTrackRef.current,
                          currentTime: event.target.getCurrentTime ? event.target.getCurrentTime() : 0,
                          sentAt: Date.now(),
                          initiatedBy: user?.name || 'Partner',
                        });
                      }
                    }
                  }
                } else if (event.data === 0) {
                  // Ended
                  setIsPlaying(false);
                  isPlayingRef.current = false;
                }
              },
              onError: (event) => {
                console.warn('YouTube Player error code:', event.data);
                let msg = 'YouTube playback encountered an issue.';
                if (event.data === 101 || event.data === 150) {
                  msg = 'This video owner has disabled playback in third-party embedded apps. Please try another link!';
                } else if (event.data === 100) {
                  msg = 'YouTube video not found or marked private.';
                } else if (event.data === 2) {
                  msg = 'Invalid YouTube video link or ID.';
                }
                setYoutubeError(msg);
                setIsPlaying(false);
                isPlayingRef.current = false;
              },
            },
          });
        } catch (err) {
          console.error('Error instantiating YouTube player:', err);
        }
      }
    };

    // Ensure script tag exists
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    if (window.YT && window.YT.Player) {
      initYT();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        initYT();
      };
      pollInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(pollInterval);
          initYT();
        }
      }, 500);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (ytPlayer && ytPlayer.destroy) {
        try {
          ytPlayer.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, []);

  // Screen-off & Visibility change listener: keep audio pipeline and YouTube alive
  useEffect(() => {
    let bgKeepAliveInterval = null;

    const tryResumeYT = () => {
      if (ytPlayerRef.current && isPlayingRef.current && ytPlayerRef.current.playVideo) {
        ytPlayerRef.current.playVideo();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isPlayingRef.current) {
        // Keep silent audio anchor active so Android audio hardware doesn't sleep
        if (htmlAudioRef.current) {
          htmlAudioRef.current.src = SILENT_AUDIO;
          htmlAudioRef.current.loop = true;
          htmlAudioRef.current.play().catch(() => {});
        }
        // Keep YouTube playing if active — retry multiple times because Android
        // may pause the WebView at various points after screen-off
        if (currentTrackRef.current?.source === 'youtube') {
          setTimeout(tryResumeYT, 200);
          setTimeout(tryResumeYT, 1000);
          setTimeout(tryResumeYT, 3000);
          // Poll every 5 seconds to catch late suspensions
          bgKeepAliveInterval = setInterval(() => {
            if (!isPlayingRef.current || !document.hidden) {
              clearInterval(bgKeepAliveInterval);
              bgKeepAliveInterval = null;
              return;
            }
            tryResumeYT();
            // Re-poke silent audio
            if (htmlAudioRef.current) {
              htmlAudioRef.current.play().catch(() => {});
            }
          }, 5000);
        }
      } else if (!document.hidden) {
        // Coming back to foreground — clear the background polling
        if (bgKeepAliveInterval) {
          clearInterval(bgKeepAliveInterval);
          bgKeepAliveInterval = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bgKeepAliveInterval) {
        clearInterval(bgKeepAliveInterval);
      }
    };
  }, []); // Use refs so no dependency on state

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
        isPlayingRef.current = true;
        if (activeSource === 'youtube') {
          if (ytPlayerRef.current && ytPlayerRef.current.playVideo) {
            const currentYT = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0;
            if (Math.abs(currentYT - targetTime) >= DRIFT_THRESHOLD_SECONDS) {
              ytPlayerRef.current.seekTo(targetTime, true);
            }
            ytPlayerRef.current.playVideo();
          } else {
            pendingTrackRef.current = track || currentTrack;
          }
          if (htmlAudioRef.current) {
            htmlAudioRef.current.src = SILENT_AUDIO;
            htmlAudioRef.current.loop = true;
            htmlAudioRef.current.play().catch(() => {});
          }
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
        isPlayingRef.current = false;
        if (activeSource === 'youtube' && ytPlayerRef.current) {
          if (ytPlayerRef.current.pauseVideo) {
            ytPlayerRef.current.pauseVideo();
          }
          if (typeof targetTime === 'number' && ytPlayerRef.current.seekTo) {
            ytPlayerRef.current.seekTo(targetTime, true);
          }
          if (htmlAudioRef.current) {
            htmlAudioRef.current.pause();
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
          if (ytPlayerRef.current.seekTo) {
            ytPlayerRef.current.seekTo(targetTime, true);
          }
        } else if (htmlAudioRef.current) {
          htmlAudioRef.current.currentTime = targetTime;
        }
      } else if (action === 'change_track') {
        setIsPlaying(true);
        isPlayingRef.current = true;
        setCurrentTime(0);
        if (track) {
          currentTrackRef.current = track;
        }
        if (track.source === 'youtube') {
          setShowVideoEmbed(true);
          const vId = track.videoId || track.id;
          if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
            ytPlayerRef.current.loadVideoById(vId);
            ytPlayerRef.current.playVideo();
          } else {
            pendingTrackRef.current = track;
          }
          // Start silent audio anchor for background keep-alive
          if (htmlAudioRef.current) {
            htmlAudioRef.current.src = SILENT_AUDIO;
            htmlAudioRef.current.loop = true;
            htmlAudioRef.current.play().catch(() => {});
          }
        } else if (htmlAudioRef.current) {
          setShowVideoEmbed(false);
          if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
            ytPlayerRef.current.pauseVideo();
          }
          htmlAudioRef.current.src = track.url;
          htmlAudioRef.current.currentTime = 0;
          htmlAudioRef.current.play().catch(() => {});
        }
      } else if (action === 'update_metadata' && track) {
        if (track.id === currentTrackRef.current?.id) {
          setCurrentTrack(track);
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
      } else if (currentTrack.source !== 'youtube' && htmlAudioRef.current && isPlaying) {
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
    if (currentTrack.source !== 'youtube' && htmlAudioRef.current) {
      if (nextIsPlaying) {
        htmlAudioRef.current.play().catch(() => {});
      } else {
        htmlAudioRef.current.pause();
      }
      activeTime = htmlAudioRef.current.currentTime;
    } else if (currentTrack.source === 'youtube' && ytPlayerRef.current) {
      if (nextIsPlaying) {
        ytPlayerRef.current.playVideo();
        if (htmlAudioRef.current) {
          htmlAudioRef.current.src = SILENT_AUDIO;
          htmlAudioRef.current.loop = true;
          htmlAudioRef.current.play().catch(() => {});
        }
      } else {
        ytPlayerRef.current.pauseVideo();
        if (htmlAudioRef.current) {
          htmlAudioRef.current.pause();
        }
      }
      activeTime = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime;
    }

    socket.emit('audio:sync', {
      action: nextIsPlaying ? 'play' : 'pause',
      track: currentTrack,
      currentTime: activeTime,
      sentAt: Date.now(),
      initiatedBy: user?.name,
    });

    setTimeout(() => {
      isSelfTriggeredRef.current = false;
    }, 500);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);

    if (currentTrack.source !== 'youtube' && htmlAudioRef.current) {
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
    currentTrackRef.current = track;
    setIsPlaying(true);
    isPlayingRef.current = true;
    setIsMiniPlayerDismissed(false);
    setCurrentTime(0);

    if (track.source === 'youtube') {
      setShowVideoEmbed(true);
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.src = SILENT_AUDIO;
        htmlAudioRef.current.loop = true;
        htmlAudioRef.current.play().catch(() => {});
      }
      const vId = track.videoId || track.id;
      if (ytPlayerRef.current && ytPlayerRef.current.loadVideoById) {
        try {
          ytPlayerRef.current.loadVideoById(vId);
          ytPlayerRef.current.playVideo();
        } catch (err) {
          console.warn('Error loading video by ID:', err);
        }
      } else {
        pendingTrackRef.current = track;
      }
    } else {
      setShowVideoEmbed(false);
      if (ytPlayerRef.current && ytPlayerRef.current.pauseVideo) {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (err) {}
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
      initiatedBy: user?.name || 'Partner',
    });

    setTimeout(() => {
      isSelfTriggeredRef.current = false;
    }, 500);
  };

  const handleCustomYoutubeSubmit = (e) => {
    e.preventDefault();
    setYoutubeError('');
    const trimmedUrl = (customYoutubeUrl || '').trim();
    if (!trimmedUrl) {
      setYoutubeError('Please enter a YouTube link or video ID.');
      setTimeout(() => setYoutubeError(''), 4000);
      return;
    }

    const videoId = extractYouTubeId(trimmedUrl);
    if (!videoId) {
      setYoutubeError('Could not recognize YouTube URL or ID. Try a link like https://youtube.com/watch?v=... or https://youtu.be/...');
      setTimeout(() => setYoutubeError(''), 5000);
      return;
    }

    const newTrack = {
      id: videoId,
      videoId,
      title: 'YouTube Stream',
      artist: user?.name ? `Requested by ${user.name}` : 'Shared Video',
      genre: 'YouTube',
      icon: 'headphones',
      color: 'bg-rose-50 text-rose-600 border-rose-200',
      source: 'youtube',
      duration: 0,
    };

    handleSelectTrack(newTrack);
    setCustomYoutubeUrl('');
    setShowVideoEmbed(true);

    // Fetch rich video title & artist asynchronously from YouTube oEmbed
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then((res) => {
        if (!res.ok) throw new Error('oEmbed error');
        return res.json();
      })
      .then((meta) => {
        if (meta && meta.title) {
          const updatedTrack = {
            ...newTrack,
            title: meta.title,
            artist: meta.author_name || 'YouTube',
          };
          setCurrentTrack((prev) => (prev.id === videoId ? updatedTrack : prev));
          socket.emit('audio:sync', {
            action: 'update_metadata',
            track: updatedTrack,
            currentTime: ytPlayerRef.current?.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : 0,
            sentAt: Date.now(),
            initiatedBy: user?.name,
          });
        }
      })
      .catch(() => {});
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

  const handleLocalFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    const trackId = `local_${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    activeBlobUrlsRef.current.set(trackId, localUrl);

    let dur = 0;
    try {
      dur = await new Promise((resolve) => {
        const tempAudio = new Audio();
        tempAudio.src = localUrl;
        tempAudio.onloadedmetadata = () => resolve(tempAudio.duration || 0);
        tempAudio.onerror = () => resolve(0);
      });
    } catch (err) {}

    const newTrack = {
      id: trackId,
      title: cleanTitle,
      artist: user?.name ? `${user.name}'s Device Audio` : 'Local Storage Audio',
      genre: 'Local Audio',
      source: 'local',
      url: localUrl,
      icon: 'music',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      duration: Math.round(dur),
      isLocal: true,
      filename: file.name,
    };

    // Save to user's IndexedDB storage
    try {
      await saveLocalTrackToDB(newTrack, file);
      const updated = await getLocalTracksFromDB();
      setLocalTracks(updated);
    } catch (err) {
      console.warn('Could not save to IndexedDB:', err);
    }

    // Play immediately locally
    handleSelectTrack(newTrack);

    // Reset input
    e.target.value = '';

    // Upload to server so partner can hear it in real-time
    if (file.size <= 45 * 1024 * 1024) {
      setIsUploadingLocal(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileData: reader.result,
              roomCode: room?.code,
            }),
          });
          const data = await res.json();
          if (data && data.url) {
            const syncedTrack = {
              ...newTrack,
              url: data.url,
            };
            setCurrentTrack(syncedTrack);
            socket.emit('audio:sync', {
              action: 'change_track',
              track: syncedTrack,
              currentTime: htmlAudioRef.current?.currentTime || 0,
              sentAt: Date.now(),
              initiatedBy: user?.name,
            });
          }
        } catch (uploadErr) {
          console.log('Audio file upload to server failed:', uploadErr);
        } finally {
          setIsUploadingLocal(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlaySavedLocalTrack = async (savedRecord) => {
    let playUrl = activeBlobUrlsRef.current.get(savedRecord.id);
    if (!playUrl && savedRecord.blob) {
      playUrl = URL.createObjectURL(savedRecord.blob);
      activeBlobUrlsRef.current.set(savedRecord.id, playUrl);
    }

    const track = {
      id: savedRecord.id,
      title: savedRecord.title,
      artist: savedRecord.artist || 'Local Device Audio',
      genre: 'Local Audio',
      source: 'local',
      url: playUrl || '',
      icon: 'music',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      duration: savedRecord.duration || 0,
      isLocal: true,
    };

    handleSelectTrack(track);

    // Upload & sync with partner if in a room
    if (savedRecord.blob && !savedRecord.serverUrl) {
      setIsUploadingLocal(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/audio/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: savedRecord.filename || `${savedRecord.title}.mp3`,
              fileData: reader.result,
              roomCode: room?.code,
            }),
          });
          const data = await res.json();
          if (data && data.url) {
            socket.emit('audio:sync', {
              action: 'change_track',
              track: { ...track, url: data.url },
              currentTime: htmlAudioRef.current?.currentTime || 0,
              sentAt: Date.now(),
              initiatedBy: user?.name,
            });
          }
        } catch (e) {
        } finally {
          setIsUploadingLocal(false);
        }
      };
      reader.readAsDataURL(savedRecord.blob);
    }
  };

  const handleDeleteLocalTrack = async (e, trackId) => {
    e.stopPropagation();
    try {
      await deleteLocalTrackFromDB(trackId);
      const updated = await getLocalTracksFromDB();
      setLocalTracks(updated);
      if (currentTrack.id === trackId) {
        handleSelectTrack(DEFAULT_TRACK);
      }
    } catch (err) {
      console.error('Failed to delete local track:', err);
    }
  };

  return (
    <>
      {/* Background HTML5 audio element (src managed via audio controller useEffect) */}
      <audio
        ref={htmlAudioRef}
        preload="auto"
        onEnded={() => {
          if (currentTrack.source !== 'youtube') setIsPlaying(false);
        }}
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

      {/* 2. DEDICATED MUSIC LOUNGE TAB (Creator Studio Clean Aesthetic, never display:none so audio doesn't suspend) */}
      <div className={`w-full max-w-xl mx-auto flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3.5 pb-28 space-y-3.5 ${activeTab === 'music' ? 'block' : 'invisible fixed -left-[9999px] -top-[9999px] pointer-events-none'}`}>
        
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
            {/* 1) YouTube video player container - never display:none so audio never stops */}
            <div 
              className={
                showVideoEmbed && currentTrack.source === 'youtube'
                  ? 'w-full aspect-video rounded-2xl overflow-hidden border border-[#ede8e1] shadow-sm bg-black'
                  : 'w-[1px] h-[1px] opacity-[0.01] pointer-events-none overflow-hidden absolute top-0 left-0'
              }
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
              onClick={() => handleSelectTrack(currentTrack)}
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

        {/* Local Storage & Device Audio Card */}
        <div className="flex-shrink-0 w-full rounded-2xl sm:rounded-3xl studio-card p-4 sm:p-5 shadow-sm box-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <HardDrive className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Play from Local Storage</h4>
            </div>

            {isUploadingLocal && (
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 animate-pulse">
                <span>Syncing with partner...</span>
              </span>
            )}
          </div>

          {/* Hidden File Input & Upload Action */}
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*"
            className="hidden"
            onChange={handleLocalFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 rounded-xl border border-dashed border-[#ede8e1] hover:border-emerald-400 bg-[#fbf9f6] hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 text-xs font-semibold text-zinc-700 hover:text-emerald-700 mb-3 active:scale-[0.99]"
          >
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Select Audio File from Your Device</span>
          </button>

          {/* Saved Local Tracks List */}
          <div className="space-y-2 w-full">
            {localTracks.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#faf8f5] border border-[#ede8e1] text-center">
                <Music className="w-6 h-6 text-zinc-300 mx-auto mb-1.5" />
                <p className="text-xs font-medium text-zinc-600">No local songs added yet</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  Pick any MP3, WAV, or audio file from your device storage to play and sync
                </p>
              </div>
            ) : (
              localTracks.map((track) => {
                const isCurrent = currentTrack.id === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => handlePlaySavedLocalTrack(track)}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between w-full max-w-full ${
                      isCurrent
                        ? 'bg-[#ecfdf5] border-emerald-300 shadow-xs'
                        : 'bg-white hover:bg-[#fbf9f6] border-[#ede8e1]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2 flex-1">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 bg-emerald-50 text-emerald-600 border-emerald-200">
                        <FileAudio className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isCurrent ? 'text-emerald-600' : 'text-zinc-900'}`}>
                          {track.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-zinc-500 truncate">
                            {track.duration > 0 ? formatTime(track.duration) : 'Local Storage'}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Local File
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                      {isCurrent && isPlaying ? (
                        <span className="flex items-center gap-0.5 text-emerald-600 mr-1">
                          <span className="w-0.5 h-3 bg-emerald-600 animate-pulse rounded-full" />
                          <span className="w-0.5 h-2 bg-emerald-600 animate-pulse delay-75 rounded-full" />
                        </span>
                      ) : (
                        <div className="w-7 h-7 rounded-xl bg-[#f4efe8] hover:bg-emerald-600 hover:text-white text-zinc-600 flex items-center justify-center transition-colors">
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </div>
                      )}
                      <button
                        onClick={(e) => handleDeleteLocalTrack(e, track.id)}
                        title="Remove from local list"
                        className="w-7 h-7 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Preloaded Playlist */}
        <div className="flex-shrink-0 w-full rounded-2xl sm:rounded-3xl studio-card p-4 sm:p-5 shadow-sm box-border flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between gap-2 mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600">
                <Heart className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-zinc-900">Our Playlist</h4>
            </div>
            <span className="text-[10px] text-pink-600 font-semibold px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200">
              {PRESET_TRACKS.length} Tracks
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
            {PRESET_TRACKS.map((track) => {
              const isCurrent = currentTrack.id === track.id;
              // Extract colors from track.color or use fallback
              const bgColorClass = track.color?.split(' ')[0] || 'bg-zinc-50';
              const textColorClass = track.color?.split(' ')[1] || 'text-zinc-600';
              const borderColorClass = track.color?.split(' ')[2] || 'border-zinc-200';

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelectTrack(track)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between w-full max-w-full ${
                    isCurrent
                      ? 'bg-[#eff6ff] border-blue-300 shadow-xs'
                      : 'bg-white hover:bg-[#fbf9f6] border-[#ede8e1]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 mr-2 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${bgColorClass} ${textColorClass} ${borderColorClass}`}>
                      {renderTrackIcon(track.icon, 'w-4 h-4 fill-current')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold truncate ${isCurrent ? 'text-blue-600' : 'text-zinc-900'}`}>
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 truncate">
                          {track.artist}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-1">
                    {isCurrent && isPlaying ? (
                      <span className="flex items-center gap-0.5 text-blue-600">
                        <span className="w-0.5 h-3 bg-blue-600 animate-pulse rounded-full" />
                        <span className="w-0.5 h-2 bg-blue-600 animate-pulse delay-75 rounded-full" />
                      </span>
                    ) : (
                      <div className={`w-7 h-7 rounded-xl bg-[#f4efe8] hover:bg-blue-600 hover:text-white text-zinc-600 flex items-center justify-center transition-colors`}>
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
