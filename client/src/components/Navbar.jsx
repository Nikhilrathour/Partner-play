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
      {/* TOP BAR (Creator Studio Warm Theme) with Notch & Safe Area Clearance */}
      <header className="pt-[max(env(safe-area-inset-top,0px),30px)] sm:pt-0 pb-2 sm:pb-0 min-h-[calc(3.75rem+max(env(safe-area-inset-top,0px),30px))] sm:min-h-[4rem] px-3 sm:px-6 flex items-center justify-between border-b border-[#ede8e1] bg-white/95 backdrop-blur-md relative z-30 flex-shrink-0 w-full max-w-full box-border">
        {/* Left: Brand & Studio Key Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <AppIcon name="app" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl shadow-xs shrink-0" alt="Nikhana Play" />
            <span className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 hidden min-[340px]:inline">
              Nikhana
            </span>
          </div>

          {/* Room / Studio Key Pill */}
          {room?.code ? (
            <button
              id="navbar-room-code-btn"
              onClick={copyRoomCode}
              title="Click to copy studio code"
              className="flex items-center gap-1 bg-[#fbf9f6] hover:bg-[#f4efe8] active:scale-95 border border-[#e2ddd5] rounded-xl px-2 sm:px-2.5 py-1 text-xs font-mono font-bold text-zinc-800 transition-all shadow-xs shrink-0"
            >
              <span className="text-[9px] text-zinc-400 font-sans font-semibold uppercase">Room</span>
              <span>{room.code}</span>
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            </button>
          ) : (
            <button
              onClick={onOpenRoomModal}
              className="studio-btn-primary px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0"
            >
              + Join
            </button>
          )}
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

        {/* Right: Unified Profile & Connectivity Icon (Placed at side) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            id="navbar-profile-connectivity-btn"
            onClick={() => {
              playPop();
              setIsMenuOpen(!isMenuOpen);
            }}
            title={
              !isSocketConnected
                ? 'Connecting to studio...'
                : partnerConnected
                ? `${user?.name || 'You'} & Partner Connected 💚 (Click for options)`
                : `${user?.name || 'You'} • Partner Offline (Click to invite)`
            }
            className="relative flex items-center justify-center p-0.5 rounded-full hover:scale-105 active:scale-95 transition-transform focus:outline-none"
          >
            {/* User Avatar Circle */}
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-sm border-2 border-white transition-all bg-gradient-to-tr from-[#ff5722] to-[#ff7a45]"
              style={{
                boxShadow: partnerConnected ? '0 0 10px rgba(16, 185, 129, 0.4)' : '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>

            {/* Live Connectivity Status Indicator Badge */}
            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
              {!isSocketConnected ? (
                // Reconnecting / Offline (Red Ping)
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white shadow-xs"></span>
                </span>
              ) : partnerConnected ? (
                // Partner Connected (Emerald Green Glow)
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white shadow-xs"></span>
                </span>
              ) : (
                // Waiting for Partner / Ready (Amber Dot)
                <span className="relative flex h-3.5 w-3.5">
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-400 border-2 border-white shadow-xs"></span>
                </span>
              )}
            </span>
          </button>

          {/* Profile & Connectivity Options Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white border border-[#ede8e1] shadow-2xl p-3.5 z-50 animate-fadeIn space-y-3 text-xs text-[#18181b]">
              {/* Profile Header */}
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-[#ede8e1]">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm bg-gradient-to-tr from-[#ff5722] to-[#ff7a45]"
                >
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-zinc-900 truncate">{user?.name || 'Partner'}</p>
                  <p className="text-[10px] text-zinc-500">Nikhana Couple Studio</p>
                </div>
              </div>

              {/* Live Connectivity Status Card */}
              {!isSocketConnected ? (
                <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs">Reconnecting...</p>
                    <p className="text-[10px] text-red-600">Connecting to live cloud server</p>
                  </div>
                </div>
              ) : partnerConnected ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs">Partner Connected 💚</p>
                    <p className="text-[10px] text-emerald-600">Both devices are in sync in real time</p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-amber-900">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs">Waiting for Partner 💌</p>
                      <p className="text-[10px] text-amber-700">Enter studio code on their device</p>
                    </div>
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="w-full py-1.5 px-2 rounded-lg bg-white border border-amber-200 text-xs font-bold text-amber-800 hover:bg-amber-100/60 transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>{copied ? 'Copied Invite Link! 💌' : 'Copy Partner Invite Link'}</span>
                  </button>
                </div>
              )}

              {/* Studio Key Card */}
              {room?.code && (
                <div className="p-2.5 rounded-xl bg-[#fbf9f6] border border-[#ede8e1] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Studio Key</p>
                    <p className="font-mono font-bold text-sm text-[#ff5722]">{room.code}</p>
                  </div>
                  <button
                    onClick={copyRoomCode}
                    className="py-1 px-2.5 rounded-lg bg-white border border-[#ede8e1] text-xs font-semibold text-zinc-700 hover:text-[#ff5722] flex items-center gap-1 shadow-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}

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
