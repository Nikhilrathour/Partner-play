import React, { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import { StickyNote, Trash2, X, Send, Heart, MessageSquareHeart } from 'lucide-react';

const NOTE_COLORS = [
  { hex: '#fffbeb', border: '#fde68a', text: '#451a03', label: 'Warm Honey' },
  { hex: '#fff7ed', border: '#fed7aa', text: '#7c2d12', label: 'Coral Peach' },
  { hex: '#faf5ff', border: '#e9d5ff', text: '#3b0764', label: 'Lavender' },
  { hex: '#ecfdf5', border: '#a7f3d0', text: '#064e3b', label: 'Mint Dew' },
  { hex: '#f0f9ff', border: '#bae6fd', text: '#0c4a6e', label: 'Sky Blue' },
];

export default function WhisperNotes({ room, user, isOpen, onClose, asTab = false }) {
  const [notes, setNotes] = useState(room?.notes || []);
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].hex);

  // Sync incoming notes from server
  useEffect(() => {
    const handleNoteAdded = (newNote) => {
      setNotes((prev) => [...prev, newNote]);
    };

    const handleNoteDeleted = (noteId) => {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    };

    socket.on('note:added', handleNoteAdded);
    socket.on('note:deleted', handleNoteDeleted);

    return () => {
      socket.off('note:added', handleNoteAdded);
      socket.off('note:deleted', handleNoteDeleted);
    };
  }, []);

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    socket.emit('note:add', {
      text: newNoteText.trim(),
      color: selectedColor,
    });

    setNewNoteText('');
  };

  const handleDeleteNote = (id) => {
    socket.emit('note:delete', id);
  };

  // Helper to get border/text style based on hex
  const getColorStyle = (hex) => {
    const found = NOTE_COLORS.find((c) => c.hex === hex);
    return found || { border: '#ede8e1', text: '#18181b' };
  };

  // 1. FULL DEDICATED TAB VIEW
  if (asTab) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn max-w-5xl mx-auto w-full bg-[#fbf9f6]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#ede8e1]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#fff3ef] border border-[#ffcdbc] flex items-center justify-center text-[#ff5722] shadow-sm">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181b] flex items-center gap-2.5">
                Whisper Notes & Letters
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc] font-semibold">
                  {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[#71717a] mt-0.5">
                Leave cute thoughts, doodle reminders, and sweet letters for your partner
              </p>
            </div>
          </div>
        </div>

        {/* Compose Card */}
        <div className="my-6 p-5 rounded-2xl bg-white border border-[#ede8e1] shadow-[0_2px_12px_rgba(0,0,0,0.03)] max-w-2xl">
          <form onSubmit={handleAddNote} className="space-y-3.5">
            <label className="block text-xs font-bold text-[#18181b]">
              Pin a New Note to the Board
            </label>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write a sweet whisper or loving thought for your partner..."
              rows={3}
              className="w-full bg-[#fbf9f6] text-sm p-3.5 rounded-xl border border-[#ede8e1] focus:outline-none focus:border-[#ff5722] text-[#18181b] placeholder:text-[#a1a1aa] resize-none transition-colors"
            />
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[#71717a]">Color:</span>
                <div className="flex items-center gap-1.5">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-6 h-6 rounded-full border transition-transform ${
                        selectedColor === c.hex 
                          ? 'scale-125 ring-2 ring-[#ff5722] ring-offset-2 shadow-sm' 
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex, borderColor: c.border }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all"
              >
                <span>Pin Note</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Notes Grid / Wall */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-12">
          {notes.length === 0 ? (
            <div className="col-span-full text-center py-16 text-[#71717a] bg-white rounded-2xl border border-dashed border-[#ede8e1] p-8">
              <StickyNote className="w-12 h-12 mx-auto text-[#d4cfc7] mb-3 stroke-1" />
              <p className="text-sm font-bold text-[#18181b]">Your Love Board is Empty</p>
              <p className="text-xs text-[#71717a] mt-1">Write your very first whisper note above!</p>
            </div>
          ) : (
            notes.map((note) => {
              const style = getColorStyle(note.color);
              return (
                <div
                  key={note.id}
                  className="p-5 rounded-2xl shadow-sm border relative transition-all group hover:-translate-y-1 hover:shadow-md"
                  style={{ 
                    backgroundColor: note.color, 
                    borderColor: style.border,
                    color: style.text 
                  }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {note.text}
                  </p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/10 text-xs opacity-70">
                    <span className="font-bold flex items-center gap-1.5">
                      <Heart className="w-3 h-3 fill-[#ff5722] text-[#ff5722]" /> {note.author}
                    </span>
                    <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 p-1.5 text-black/40 hover:text-red-600 rounded-lg hover:bg-black/5 transition-all"
                    title="Remove note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // 2. DRAWER VIEW (if opened as floating drawer)
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 sm:w-96 z-40 bg-white p-5 shadow-2xl border-l border-[#ede8e1] flex flex-col animate-slideIn">
      <div className="flex items-center justify-between pb-4 border-b border-[#ede8e1]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#fff3ef] border border-[#ffcdbc] flex items-center justify-center text-[#ff5722]">
            <Heart className="w-4 h-4 fill-[#ff5722]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18181b]">Whisper Notes</h3>
            <p className="text-[11px] text-[#71717a]">Sweet thoughts & letters</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-[#71717a] hover:text-[#18181b] rounded-lg hover:bg-[#f4efe8] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-[#71717a]">
            <StickyNote className="w-10 h-10 mx-auto text-[#d4cfc7] mb-2 stroke-1" />
            <p className="text-xs font-semibold text-[#18181b]">No whisper notes yet.</p>
            <p className="text-[11px] text-[#71717a] mt-0.5">Leave a sweet message for your partner!</p>
          </div>
        ) : (
          notes.map((note) => {
            const style = getColorStyle(note.color);
            return (
              <div
                key={note.id}
                className="p-3.5 rounded-xl shadow-sm border relative transition-all group"
                style={{ 
                  backgroundColor: note.color, 
                  borderColor: style.border,
                  color: style.text 
                }}
              >
                <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                  {note.text}
                </p>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-black/10 text-[10px] opacity-70">
                  <span className="font-semibold">— {note.author}</span>
                  <span>{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1 text-black/40 hover:text-red-600 transition-opacity"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleAddNote} className="pt-3 border-t border-[#ede8e1] space-y-2.5">
        <textarea
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Leave a message for your partner..."
          rows={3}
          className="w-full bg-[#fbf9f6] text-xs p-3 rounded-xl border border-[#ede8e1] focus:outline-none focus:border-[#ff5722] text-[#18181b] placeholder:text-[#a1a1aa] resize-none"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setSelectedColor(c.hex)}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  selectedColor === c.hex 
                    ? 'scale-125 ring-2 ring-[#ff5722] ring-offset-1' 
                    : 'opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.hex, borderColor: c.border }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="px-3.5 py-1.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
          >
            <span>Pin</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </form>
    </div>
  );
}
