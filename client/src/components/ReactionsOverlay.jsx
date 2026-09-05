import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { playChime, playPop, triggerHaptic } from '../services/sound';
import { Heart, X } from 'lucide-react';

const REACTION_ITEMS = [
  { emoji: '🧡', label: 'Orange Heart' },
  { emoji: '👑', label: 'President / Queen' },
  { emoji: '💖', label: 'Sparkle Heart' },
  { emoji: '💋', label: 'Kiss' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '🌹', label: 'Rose' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🎉', label: 'Party' },
];

export default function ReactionsOverlay({ user }) {
  const [activeReactions, setActiveReactions] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when tapping outside
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

  // Listen for incoming partner reactions
  useEffect(() => {
    const handleIncomingReaction = (reaction) => {
      playChime();
      if (reaction.emoji === '🧡' || reaction.emoji === '💖' || reaction.emoji === '❤️' || reaction.emoji === '👑') {
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { x: reaction.x || 0.5, y: reaction.y || 0.5 },
          colors: ['#ff5722', '#ff8a65', '#ffd54f', '#ec4899', '#7c3aed'],
        });
      } else if (reaction.emoji === '🎉') {
        confetti({
          particleCount: 45,
          spread: 85,
          origin: { x: reaction.x || 0.5, y: reaction.y || 0.5 },
        });
      }

      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2800);
    };

    socket.on('reaction:send', handleIncomingReaction);
    return () => {
      socket.off('reaction:send', handleIncomingReaction);
    };
  }, []);

  // Send reaction
  const triggerReaction = (emoji) => {
    playPop();
    triggerHaptic(25);
    const randomX = 0.25 + Math.random() * 0.5;
    const randomY = 0.6 + Math.random() * 0.2;

    const reaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      x: randomX,
      y: randomY,
      sender: user?.name || 'You',
    };

    if (emoji === '🧡' || emoji === '💖' || emoji === '❤️' || emoji === '👑') {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x: randomX, y: randomY },
        colors: ['#ff5722', '#ff8a65', '#ffd54f', '#ec4899', '#7c3aed'],
      });
    }

    setActiveReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2800);

    socket.emit('reaction:send', { emoji, x: randomX, y: randomY });
  };

  return (
    <>
      {/* Floating Animated Emojis on Screen with organic sway */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'floatUpAndSway 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
            }}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-md filter">{r.emoji}</span>
            <span className="text-[10px] font-bold text-[#18181b] px-2.5 py-0.5 rounded-full bg-white shadow-md border border-[#ede8e1] mt-1">
              {r.sender}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile-First Reaction FAB with safe area (floats above the canvas drawing toolbar) */}
      <div 
        ref={menuRef} 
        className="fixed right-3 bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 z-30 flex items-center"
      >
        {/* Expanded horizontal emoji tray */}
        {isMenuOpen && (
          <div className="flex items-center gap-1 p-1.5 mr-2 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-[#ede8e1] animate-fadeIn">
            {REACTION_ITEMS.map((item) => (
              <button
                key={item.emoji}
                onClick={() => {
                  triggerReaction(item.emoji);
                  setIsMenuOpen(false);
                }}
                title={item.label}
                className="w-8 h-8 flex items-center justify-center text-base rounded-xl hover:bg-[#f4efe8] active:scale-95 transition-all"
              >
                {item.emoji}
              </button>
            ))}
          </div>
        )}

        {/* Main Floating Trigger Button */}
        <button
          onClick={() => {
            playPop();
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            isMenuOpen 
              ? 'bg-white text-[#18181b] border border-[#ede8e1]' 
              : 'bg-[#ff5722] hover:bg-[#f4511e] text-white shadow-[#ff5722]/30 hover:scale-105'
          }`}
          title="Send Reaction"
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Heart className="w-5 h-5 fill-current" />}
        </button>
      </div>
    </>
  );
}
