import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { socket } from '../services/socket';
import { Heart, X } from 'lucide-react';

const REACTION_ITEMS = [
  { emoji: '🧡', label: 'Orange Heart' },
  { emoji: '💖', label: 'Sparkle Heart' },
  { emoji: '💋', label: 'Kiss' },
  { emoji: '✨', label: 'Magic' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🥺', label: 'Aww' },
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
      if (reaction.emoji === '🧡' || reaction.emoji === '💖' || reaction.emoji === '❤️') {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { x: reaction.x || 0.5, y: reaction.y || 0.5 },
          colors: ['#ff5722', '#ff8a65', '#ffd54f', '#ec4899', '#7c3aed'],
        });
      } else if (reaction.emoji === '🎉') {
        confetti({
          particleCount: 40,
          spread: 80,
          origin: { x: reaction.x || 0.5, y: reaction.y || 0.5 },
        });
      }

      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 2500);
    };

    socket.on('reaction:send', handleIncomingReaction);
    return () => {
      socket.off('reaction:send', handleIncomingReaction);
    };
  }, []);

  // Send reaction
  const triggerReaction = (emoji) => {
    const randomX = 0.25 + Math.random() * 0.5;
    const randomY = 0.6 + Math.random() * 0.2;

    const reaction = {
      id: Math.random().toString(36).substring(2, 9),
      emoji,
      x: randomX,
      y: randomY,
      sender: user?.name || 'You',
    };

    if (emoji === '🧡' || emoji === '💖' || emoji === '❤️') {
      confetti({
        particleCount: 25,
        spread: 50,
        origin: { x: randomX, y: randomY },
        colors: ['#ff5722', '#ff8a65', '#ffd54f', '#ec4899', '#7c3aed'],
      });
    }

    setActiveReactions((prev) => [...prev, reaction]);
    setTimeout(() => {
      setActiveReactions((prev) => prev.filter((r) => r.id !== reaction.id));
    }, 2500);

    socket.emit('reaction:send', { emoji, x: randomX, y: randomY });
  };

  return (
    <>
      {/* Floating Animated Emojis on Screen */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={r.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${r.x * 100}%`,
              top: `${r.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              animation: 'floatUp 2.5s ease-out forwards',
            }}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-md filter">{r.emoji}</span>
            <span className="text-[10px] font-bold text-[#18181b] px-2.5 py-0.5 rounded-full bg-white shadow-md border border-[#ede8e1] mt-1">
              {r.sender}
            </span>
          </div>
        ))}
      </div>

      {/* Mobile-First Reaction FAB */}
      <div ref={menuRef} className="fixed right-3 bottom-20 min-[460px]:bottom-6 z-30 flex items-center">
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
          onClick={() => setIsMenuOpen(!isMenuOpen)}
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

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.6);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -20px) scale(1.15);
          }
          80% {
            opacity: 0.9;
            transform: translate(-50%, -100px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -150px) scale(0.8);
          }
        }
      `}</style>
    </>
  );
}
