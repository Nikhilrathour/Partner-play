import React, { useState, useEffect } from 'react';
import { socketCreateRoom, socketJoinRoom } from '../services/socket';
import { Heart, Sparkles, Copy, Check, ArrowRight } from 'lucide-react';

const AVATAR_COLORS = ['#ff5722', '#7c3aed', '#0284c7', '#f43f5e', '#059669', '#f59e0b'];

export default function RoomModal({ isOpen, onClose, onJoined, currentRoomCode }) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [userName, setUserName] = useState('');
  const [userColor, setUserColor] = useState(AVATAR_COLORS[0]);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [customCreateCode, setCustomCreateCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Check URL query parameters for auto room code fill
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCodeInput(roomParam.toUpperCase());
      setActiveTab('join');
    }
  }, []);

  if (!isOpen) return null;

  // Handle room creation
  const handleCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const res = await socketCreateRoom(
      userName.trim() || 'Partner 1',
      userColor,
      customCreateCode.trim()
    );

    setIsLoading(false);
    if (res && res.success) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', res.room.code);
      window.history.replaceState({}, '', url);

      onJoined(res.room);
      onClose();
    } else {
      setErrorMessage(res?.error || 'Failed to create room. Try again.');
    }
  };

  // Handle joining room
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a 6-character room code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const res = await socketJoinRoom(
      roomCodeInput.trim(),
      userName.trim() || 'Partner 2',
      userColor
    );

    setIsLoading(false);
    if (res && res.success) {
      const url = new URL(window.location.href);
      url.searchParams.set('room', res.room.code);
      window.history.replaceState({}, '', url);

      onJoined(res.room);
      onClose();
    } else {
      setErrorMessage(res?.error || 'Could not join room. Check code!');
    }
  };

  // Copy shareable link
  const copyInviteLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode || roomCodeInput}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-[#ede8e1] relative overflow-hidden">
        {/* Soft studio ambient light */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#fff3ef] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-[#f5f3ff] rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#fff3ef] border border-[#ffcdbc] text-[#ff5722] mb-3 shadow-sm">
            <Heart className="w-7 h-7 fill-[#ff5722] animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[#18181b]">
            Duo Studio • Partner Play
          </h2>
          <p className="text-sm text-[#71717a] mt-1">
            Real-time collaborative canvas & synchronized beats
          </p>
        </div>

        {/* Tabs: Create vs Join */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-2xl bg-[#f4efe8] border border-[#ede8e1]">
          <button
            id="tab-create-room"
            type="button"
            onClick={() => { setActiveTab('create'); setErrorMessage(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-white text-[#18181b] shadow-sm'
                : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            Create New Studio
          </button>
          <button
            id="tab-join-room"
            type="button"
            onClick={() => { setActiveTab('join'); setErrorMessage(''); }}
            className={`py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'join'
                ? 'bg-white text-[#18181b] shadow-sm'
                : 'text-[#71717a] hover:text-[#18181b]'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={activeTab === 'create' ? handleCreate : handleJoin} className="space-y-4">
          {/* User Nickname */}
          <div>
            <label className="block text-xs font-bold text-[#18181b] mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. My Love, Alex, Jordan"
              className="w-full px-4 py-2.5 rounded-xl bg-[#fbf9f6] border border-[#ede8e1] text-sm text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] transition-colors"
              maxLength={20}
              required
            />
          </div>

          {/* Color Badge Picker */}
          <div>
            <label className="block text-xs font-bold text-[#18181b] mb-1.5">
              Your Aura Color
            </label>
            <div className="flex items-center gap-2.5">
              {AVATAR_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setUserColor(c)}
                  className={`w-7 h-7 rounded-full border border-black/10 transition-transform ${
                    userColor === c
                      ? 'ring-2 ring-[#ff5722] ring-offset-2 ring-offset-white scale-110'
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Join Code Input (if Join Tab) */}
          {activeTab === 'join' && (
            <div>
              <label className="block text-xs font-bold text-[#18181b] mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="e.g. PAIR99"
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-xl bg-[#fbf9f6] border border-[#ede8e1] text-sm font-mono font-bold tracking-widest text-center text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#ff5722] focus:ring-1 focus:ring-[#ff5722] uppercase transition-colors"
                required
              />
            </div>
          )}

          {/* Custom Room Code (Optional in Create Tab) */}
          {activeTab === 'create' && (
            <div>
              <label className="block text-xs font-bold text-[#18181b] mb-1.5">
                Custom Studio Code <span className="text-[#a1a1aa] font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={customCreateCode}
                onChange={(e) => setCustomCreateCode(e.target.value.toUpperCase())}
                placeholder="Leave blank for auto-generated code"
                maxLength={8}
                className="w-full px-4 py-2.5 rounded-xl bg-[#fbf9f6] border border-[#ede8e1] text-xs text-[#18181b] placeholder:text-[#a1a1aa] focus:outline-none focus:border-[#ff5722] uppercase font-mono transition-colors"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <p className="text-xs text-[#dc2626] bg-[#fee2e2] border border-[#fca5a5] px-3 py-2 rounded-xl text-center font-medium">
              {errorMessage}
            </p>
          )}

          {/* Submit Button */}
          <button
            id="modal-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span>Connecting Studio...</span>
            ) : activeTab === 'create' ? (
              <>
                <span>Enter Studio</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Join Partner</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Current Room Link Share Helper */}
        {currentRoomCode && (
          <div className="mt-5 pt-4 border-t border-[#ede8e1] flex items-center justify-between">
            <div className="text-xs text-[#71717a]">
              Active Studio: <span className="font-mono text-[#ff5722] font-bold">{currentRoomCode}</span>
            </div>
            <button
              onClick={copyInviteLink}
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#f4efe8] text-[#18181b] border border-[#ede8e1] shadow-sm font-semibold transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied Link!' : 'Copy Invite'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
