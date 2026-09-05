import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CanvasBoard from './components/CanvasBoard';
import AudioPlayer from './components/AudioPlayer';
import RoomModal from './components/RoomModal';
import ReactionsOverlay from './components/ReactionsOverlay';
import WhisperNotes from './components/WhisperNotes';
import { socket, socketJoinRoom } from './services/socket';
import { Download, X, Smartphone, ArrowRight } from 'lucide-react';

const STORAGE_ROOM_KEY = 'duo_partner_room_code';
const STORAGE_NAME_KEY = 'duo_partner_user_name';
const STORAGE_COLOR_KEY = 'duo_partner_user_color';

export default function App() {
  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' | 'music' | 'notes'
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentPlayingTrack, setCurrentPlayingTrack] = useState(null);

  // PWA Install Prompt State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // 1. Silent Auto-Pairing on App Launch:
  // Remembers your private studio permanently across browser sessions and phone app opens!
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const savedRoom = localStorage.getItem(STORAGE_ROOM_KEY);
    const savedName = localStorage.getItem(STORAGE_NAME_KEY) || 'Partner';
    const savedColor = localStorage.getItem(STORAGE_COLOR_KEY) || '#ff5722';

    const targetRoom = (roomParam || savedRoom || '').trim().toUpperCase();

    if (targetRoom) {
      // Connect silently to permanent couple room
      socketJoinRoom(targetRoom, savedName, savedColor).then((res) => {
        if (res && res.success) {
          setRoom(res.room);
          setUser(res.room.user);
          setIsRoomModalOpen(false);
          localStorage.setItem(STORAGE_ROOM_KEY, res.room.code);
          localStorage.setItem(STORAGE_NAME_KEY, res.room.user.name);
          localStorage.setItem(STORAGE_COLOR_KEY, res.room.user.color);

          const url = new URL(window.location.href);
          url.searchParams.set('room', res.room.code);
          window.history.replaceState({}, '', url);
        } else {
          setIsRoomModalOpen(true);
        }
      }).catch(() => {
        setIsRoomModalOpen(true);
      });
    } else {
      setIsRoomModalOpen(true);
    }
  }, []);

  // 2. Listen for browser PWA install capability
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
      setCanInstallPwa(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // 3. Listen for partner presence
  useEffect(() => {
    const handlePartnerJoined = ({ user: newPartner, members }) => {
      setRoom((prev) => prev ? { ...prev, members } : prev);
    };

    const handlePartnerLeft = ({ members }) => {
      setRoom((prev) => prev ? { ...prev, members } : prev);
    };

    socket.on('room:partner_joined', handlePartnerJoined);
    socket.on('room:partner_left', handlePartnerLeft);

    return () => {
      socket.off('room:partner_joined', handlePartnerJoined);
      socket.off('room:partner_left', handlePartnerLeft);
    };
  }, []);

  // 4. Auto-resync when mobile socket reconnects
  useEffect(() => {
    const handleReconnect = () => {
      if (room?.code && user?.name) {
        socket.emit('room:join', {
          code: room.code,
          userName: user.name,
          userColor: user.color,
        });
      }
    };

    socket.on('connect', handleReconnect);
    return () => socket.off('connect', handleReconnect);
  }, [room?.code, user?.name, user?.color]);

  const handleRoomJoined = (roomData) => {
    setRoom(roomData);
    setUser(roomData.user);
    setIsRoomModalOpen(false);
    // Save to permanent couple memory
    localStorage.setItem(STORAGE_ROOM_KEY, roomData.code);
    localStorage.setItem(STORAGE_NAME_KEY, roomData.user.name);
    localStorage.setItem(STORAGE_COLOR_KEY, roomData.user.color);
  };

  const handleUnpair = () => {
    localStorage.removeItem(STORAGE_ROOM_KEY);
    setRoom(null);
    setUser(null);
    setIsRoomModalOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url);
  };

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallPwa(false);
      }
      setDeferredInstallPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  const handlePlayStateChange = (playing, track) => {
    setIsMusicPlaying(playing);
    setCurrentPlayingTrack(track);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#fbf9f6] text-[#18181b] selection:bg-[#ff5722]/20 selection:text-[#ff5722]">
      {/* Top Navigation Bar with Segmented Tabs */}
      <Navbar
        room={room}
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        notesCount={room?.notes?.length || 0}
        isPlaying={isMusicPlaying}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
        onUnpair={handleUnpair}
        onInstallApp={handleInstallApp}
        canInstallPwa={canInstallPwa}
      />

      {/* Main Workspace with Tab Visibility Preservation */}
      <main className="relative flex-1 flex flex-col overflow-hidden pb-14 min-[460px]:pb-0 w-full max-w-full">
        
        {/* Tab 1: Collaborative Canvas (Unobstructed Full Screen) */}
        <div className={`flex-1 flex relative overflow-hidden ${activeTab === 'canvas' ? 'flex' : 'hidden'}`}>
          <CanvasBoard room={room} user={user} isActive={activeTab === 'canvas'} />
        </div>

        {/* Tab 2 & Audio Engine: Music Lounge & Persistent Audio Stream */}
        {/* AudioPlayer is always kept mounted so playback NEVER interrupts or reloads across tabs */}
        <AudioPlayer 
          room={room} 
          user={user} 
          activeTab={activeTab} 
          onSwitchTab={setActiveTab}
          onPlayStateChange={handlePlayStateChange}
        />

        {/* Tab 3: Dedicated Whisper Notes Bulletin Board */}
        <div className={`flex-1 flex relative overflow-hidden ${activeTab === 'notes' ? 'flex' : 'hidden'}`}>
          <WhisperNotes room={room} user={user} asTab={true} />
        </div>

      </main>

      {/* Floating Reactions Bar & Particle Bursts */}
      <ReactionsOverlay user={user} />

      {/* Room Creation & Pairing Modal */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          // Only allow closing if already in a room
          if (room) setIsRoomModalOpen(false);
        }}
        onJoined={handleRoomJoined}
        currentRoomCode={room?.code}
      />

      {/* PWA Phone Installation Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-[#ede8e1] relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede8e1]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#fff3ef] border border-[#ffcdbc] flex items-center justify-center text-[#ff5722]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#18181b]">Install on Phone</h3>
                  <p className="text-[11px] text-[#71717a]">Use as a standalone app</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="p-1.5 text-[#71717a] hover:text-[#18181b] rounded-lg hover:bg-[#f4efe8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-[#18181b]">
              <div className="p-3.5 rounded-2xl bg-[#fbf9f6] border border-[#ede8e1] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-[#ff5722]">
                  <span>🍏 iPhone / iPad (Safari)</span>
                </p>
                <p className="text-zinc-600 leading-relaxed">
                  1. Tap the <strong>Share</strong> button (square with arrow) at the bottom.<br />
                  2. Scroll down and tap <strong>"Add to Home Screen"</strong>.<br />
                  3. Tap <strong>Add</strong> in the top right.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#fbf9f6] border border-[#ede8e1] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-emerald-600">
                  <span>🤖 Android (Chrome)</span>
                </p>
                <p className="text-zinc-600 leading-relaxed">
                  1. Tap the <strong>three dots (⋮)</strong> in Chrome.<br />
                  2. Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.<br />
                  3. The app icon will appear on your phone home screen!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs shadow-sm transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
