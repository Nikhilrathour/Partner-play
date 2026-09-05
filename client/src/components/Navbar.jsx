import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Copy, 
  Check, 
  StickyNote, 
  Music, 
  Share2, 
  Paintbrush,
  Download,
  Smartphone,
  LogOut,
  ChevronDown,
  Sparkles,
  Radio
} from 'lucide-react';
import { socket } from '../services/socket';
import { playChime, playPop } from '../services/sound';
import WidgetModal from './WidgetModal';
import AppIcon from './AppIcon';

export default function Navbar({ 
  room, 
  user, 
  activeTab, 
  onSelectTab, 
  notesCount, 
  isPlaying, 
  onOpenRoomModal,
  onUnpair,
  onInstallApp,
  canInstallPwa
}) {
  const [copied, setCopied] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);
  const [partnerConnected, setPartnerConnected] = useState((room?.members?.length || 0) > 1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const menuRef = useRef(null);

  // Monitor socket connection state
  useEffect(() => {
    const handleConnect = () => setIsSocketConnected(true);
    const handleDisconnect = () => setIsSocketConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  // Sync partner presence
  useEffect(() => {
    if (room?.members) {
      setPartnerConnected(room.members.length > 1);
    }

    const onPartnerJoined = (data) => {
      setPartnerConnected(true);
      playChime();
    };
    const onPartnerLeft = () => setPartnerConnected(false);

    socket.on('room:partner_joined', onPartnerJoined);
    socket.on('room:partner_left', onPartnerLeft);

    return () => {
      socket.off('room:partner_joined', onPartnerJoined);
      socket.off('room:partner_left', onPartnerLeft);
    };
  }, [room]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isMenuOpen]);

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = () => {
    if (!room?.code) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* TOP BAR (Creator Studio Warm Theme) */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between border-b border-[#ede8e1] bg-white/80 backdrop-blur-md relative z-30 flex-shrink-0 w-full max-w-full box-border">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          <AppIcon name="app" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs" alt="Nikhana Play" />
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900">
            Nikhana Play
          </h1>
        </div>

        {/* Center: Segmented Navigation Pills on screens >= 640px */}
        <div className="hidden sm:flex items-center gap-1 bg-[#f4efe8]/70 p-1 rounded-2xl border border-[#e8e2d8]">
          {/* Canvas Tab */}
          <button
            id="desktop-tab-canvas"
            onClick={() => onSelectTab('canvas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'canvas'
                ? 'bg-white text-[#ff5722] shadow-sm border border-[#ffcdbc]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <AppIcon name="paintbrush" className="w-4 h-4" />
            <span>Canvas</span>
          </button>

          {/* Music Lounge Tab */}
          <button
            id="desktop-tab-music"
            onClick={() => onSelectTab('music')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'music'
                ? 'bg-white text-[#ff5722] shadow-sm border border-[#ffcdbc]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <AppIcon name="music" className="w-4 h-4" />
            <span>Music Lounge</span>
            {isPlaying && (
              <span className="flex items-center gap-0.5 ml-0.5">
                <span className="w-0.5 h-2 bg-[#ff5722] animate-pulse rounded-full" />
                <span className="w-0.5 h-3 bg-[#ff5722] animate-pulse delay-75 rounded-full" />
              </span>
            )}
          </button>

          {/* Whisper Notes Tab */}
          <button
            id="desktop-tab-notes"
            onClick={() => onSelectTab('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'notes'
                ? 'bg-white text-[#ff5722] shadow-sm border border-[#ffcdbc]'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/50'
            }`}
          >
            <AppIcon name="stickynote" className="w-4 h-4" />
            <span>Notes</span>
            {notesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc] text-[10px] font-bold">
                {notesCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Room Code, Presence & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0 relative" ref={menuRef}>
          {/* Room Code Pill */}
          {room?.code ? (
            <div className="flex items-center gap-1 bg-white border border-[#e2ddd5] rounded-xl px-2.5 sm:px-3 py-1 shadow-xs">
              <button
                onClick={copyRoomCode}
                title="Click to copy studio code"
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-800 hover:text-[#ff5722] transition-colors"
              >
                <span>{room.code}</span>
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              </button>

              <button
                onClick={copyInviteLink}
                title="Share direct invite link"
                className="p-0.5 text-zinc-400 hover:text-zinc-700 transition-colors ml-0.5"
              >
                <Share2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenRoomModal}
              className="studio-btn-primary px-3 py-1.5 rounded-xl text-xs font-semibold"
            >
              + Join Studio
            </button>
          )}

          {/* Connection & Partner Presence Badge */}
          {!isSocketConnected ? (
            <div 
              className="px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]"
              title="Connecting to studio server..."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span>Connecting...</span>
            </div>
          ) : partnerConnected ? (
            <div 
              className="badge-mint px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 shadow-xs"
              title="Your partner is connected in the studio!"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>Connected</span>
            </div>
          ) : (
            <button
              onClick={copyInviteLink}
              className="px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 bg-[#fffbeb] hover:bg-[#fef3c7] text-[#b45309] border border-[#fde68a] transition-all cursor-pointer shadow-xs active:scale-95"
              title="Click to copy invite link for your partner"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>{copied ? 'Link Copied! 💌' : 'Invite Partner 💌'}</span>
            </button>
          )}

          {/* User Profile Avatar with Dropdown Toggle */}
          {user && (
            <div 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform bg-gradient-to-tr from-[#ff5722] to-[#ff7a45]"
              title={`Studio Settings: ${user.name}`}
            >
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
          )}

          {/* Studio Profile & Settings Popover Dropdown */}
          {isMenuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl bg-white border border-[#ede8e1] shadow-2xl p-3 z-50 animate-fadeIn space-y-2.5 text-xs text-[#18181b]">
              {/* Profile Header */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-[#ede8e1]">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: user?.color || '#ff5722' }}
                >
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-zinc-900 truncate">{user?.name}</p>
                  <p className="text-[10px] text-zinc-500">Permanent Couple Studio</p>
                </div>
              </div>

              {/* Room Code & Invite info */}
              <div className="p-2.5 rounded-xl bg-[#fbf9f6] border border-[#ede8e1] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Studio Key:</span>
                  <span className="font-mono font-bold text-[#ff5722]">{room?.code}</span>
                </div>
                <button
                  onClick={copyInviteLink}
                  className="w-full mt-1.5 py-1 px-2 rounded-lg bg-white border border-[#ede8e1] text-[11px] font-semibold text-zinc-700 hover:text-[#ff5722] flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Copy Partner Invite Link</span>
                </button>
              </div>

              {/* Android Home Screen Widget Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsWidgetModalOpen(true);
                }}
                className="w-full py-2 px-2.5 rounded-xl bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc] font-bold flex items-center gap-2 hover:bg-[#ffe8e0] transition-colors"
              >
                <AppIcon name="smartphone" className="w-4 h-4" />
                <span>Android Home Screen Widget</span>
              </button>

              {/* Install PWA Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onInstallApp();
                }}
                className="w-full py-2 px-2.5 rounded-xl bg-white text-zinc-700 border border-[#ede8e1] font-semibold flex items-center gap-2 hover:bg-[#fbf9f6] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Install Web App (PWA)</span>
              </button>



              {/* Disconnect / Switch Studio Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowUnpairModal(true);
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors text-[11px] font-medium"
              >
                <AppIcon name="logout" className="w-4 h-4" />
                <span>Switch Studio / Unpair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly Studio Bar on <640px with Safe Area) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-white/95 backdrop-blur-md border-t border-[#ede8e1] z-40 flex items-center justify-around px-2 shadow-lg">
        {/* Canvas Button */}
        <button
          id="mobile-nav-canvas"
          onClick={() => {
            onSelectTab('canvas');
            playPop();
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'canvas' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <AppIcon name="paintbrush" className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Canvas</span>
        </button>

        {/* Music Lounge Button */}
        <button
          id="mobile-nav-music"
          onClick={() => {
            onSelectTab('music');
            playPop();
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'music' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <div className="relative">
            <AppIcon name="music" className="w-5 h-5 mb-0.5" />
            {isPlaying && (
              <span className="absolute -top-1 -right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff5722] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff5722]"></span>
              </span>
            )}
          </div>
          <span className="text-[10px] flex items-center gap-0.5">
            Music
            {isPlaying && (
              <span className="w-1 h-1 rounded-full bg-[#ff5722] animate-pulse" />
            )}
          </span>
        </button>

        {/* Notes Button */}
        <button
          id="mobile-nav-notes"
          onClick={() => {
            onSelectTab('notes');
            playPop();
          }}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'notes' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <div className="relative">
            <AppIcon name="stickynote" className="w-5 h-5 mb-0.5" />
            {notesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-[#ff5722] text-white text-[8px] font-bold flex items-center justify-center">
                {notesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Notes</span>
        </button>
      </nav>

      {/* In-App Unpair Confirmation Modal */}
      {showUnpairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#ede8e1] space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <AppIcon name="logout" className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Switch Private Studio?</h3>
                <p className="text-xs text-zinc-500">You will disconnect from studio {room?.code} and can join another.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowUnpairModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#f4efe8] hover:bg-[#ede8e1] text-zinc-800 text-xs font-semibold transition-colors"
              >
                Stay Here
              </button>
              <button
                onClick={() => {
                  setShowUnpairModal(false);
                  onUnpair();
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] text-white text-xs font-bold transition-colors shadow-xs"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Android Widget Modal */}
      <WidgetModal 
        isOpen={isWidgetModalOpen}
        onClose={() => setIsWidgetModalOpen(false)}
        room={room}
        user={user}
      />
    </>
  );
}
