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
import WidgetModal from './WidgetModal';

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
  const [partnerConnected, setPartnerConnected] = useState(room?.members?.length > 1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Sync partner presence
  useEffect(() => {
    if (room?.members) {
      setPartnerConnected(room.members.length > 1);
    }

    const onPartnerJoined = () => setPartnerConnected(true);
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
        {/* Left: Brand & Live Sync Badge */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#ff5722] to-[#ff6b35] flex items-center justify-center shadow-sm text-white flex-shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-zinc-400 hidden sm:inline">Duo Studio</span>
            <span className="text-xs text-zinc-300 hidden sm:inline">&rsaquo;</span>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900">
              Partner Play
            </h1>
            
            {/* Live Sync Pill */}
            <div className="badge-mint rounded-full px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Sync</span>
            </div>
          </div>
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
            <Paintbrush className="w-3.5 h-3.5" />
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
            <Music className="w-3.5 h-3.5" />
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
            <StickyNote className="w-3.5 h-3.5" />
            <span>Notes</span>
            {notesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc] text-[10px] font-bold">
                {notesCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Room Code, Install Button, Presence & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 relative" ref={menuRef}>
          {/* Android Widget Quick Button */}
          <button
            onClick={() => setIsWidgetModalOpen(true)}
            title="Android Home Screen Widget"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#fff3ef] to-[#ffece6] hover:bg-[#ffe8e0] text-[#ff5722] border border-[#ffcdbc] shadow-xs text-xs font-semibold transition-all"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Widget</span>
          </button>

          {/* Install App Quick Button */}
          <button
            onClick={onInstallApp}
            title="Download/Install App on Phone"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-white hover:bg-[#f4efe8] text-zinc-700 hover:text-[#ff5722] border border-[#ede8e1] shadow-xs text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#ff5722]" />
            <span className="hidden min-[480px]:inline">Install</span>
          </button>

          {/* Room Code Pill */}
          {room?.code ? (
            <div className="flex items-center gap-1 bg-white border border-[#e2ddd5] rounded-xl px-2 sm:px-2.5 py-1 shadow-xs">
              <button
                onClick={copyRoomCode}
                title="Click to copy studio code"
                className="flex items-center gap-1 text-xs font-mono font-bold text-zinc-800 hover:text-[#ff5722] transition-colors"
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

          {/* Partner Status Dot */}
          <div 
            className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1.5 ${
              partnerConnected
                ? 'badge-mint'
                : 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]'
            }`}
            title={partnerConnected ? 'Partner is in the studio!' : 'Waiting for partner to open the app...'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${partnerConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span className="hidden min-[380px]:inline">
              {partnerConnected ? 'Ready' : 'Waiting'}
            </span>
          </div>

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
                <Smartphone className="w-4 h-4" />
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

              {/* Remote Play Note */}
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-800 leading-tight">
                ✨ <strong>Remote Jukebox:</strong> As long as both phones have the studio open, whatever you play streams live to both phones!
              </div>

              {/* Disconnect / Switch Studio Button */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  if (window.confirm('Disconnect from this private studio and pair with a new one?')) {
                    onUnpair();
                  }
                }}
                className="w-full py-1.5 px-2.5 rounded-xl text-zinc-500 hover:text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors text-[11px] font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch Studio / Unpair</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb-friendly Studio Bar on <640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-[#ede8e1] z-40 flex items-center justify-around px-2 shadow-lg">
        {/* Canvas Button */}
        <button
          id="mobile-nav-canvas"
          onClick={() => onSelectTab('canvas')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'canvas' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Paintbrush className="w-4 h-4 mb-0.5" />
          <span className="text-[10px]">Canvas</span>
        </button>

        {/* Music Lounge Button */}
        <button
          id="mobile-nav-music"
          onClick={() => onSelectTab('music')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'music' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <div className="relative">
            <Music className="w-4 h-4 mb-0.5" />
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
          onClick={() => onSelectTab('notes')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'notes' ? 'text-[#ff5722] font-bold' : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <div className="relative">
            <StickyNote className="w-4 h-4 mb-0.5" />
            {notesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-[#ff5722] text-white text-[8px] font-bold flex items-center justify-center">
                {notesCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">Notes</span>
        </button>
      </nav>

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
