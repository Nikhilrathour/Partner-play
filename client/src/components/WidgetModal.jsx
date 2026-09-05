import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Copy, 
  Check, 
  ExternalLink, 
  Heart, 
  Sparkles, 
  X, 
  Layers, 
  RefreshCw, 
  Download,
  Flame,
  Info
} from 'lucide-react';
import { getServerUrl } from '../services/socket';
import { playPop } from '../services/sound';

export default function WidgetModal({ isOpen, onClose, room, user }) {
  const [copied, setCopied] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [webPinNotice, setWebPinNotice] = useState(false);
  const [widgetMeta, setWidgetMeta] = useState(null);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const roomCode = room?.code || 'STUDIO1';
  const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

  // Poll widget metadata
  useEffect(() => {
    if (!isOpen || !room?.code) return;

    const fetchMeta = async () => {
      try {
        const res = await fetch(`${getServerUrl()}/api/room/${room.code}/widget.json`);
        if (res.ok) {
          const data = await res.json();
          setWidgetMeta(data);
        }
      } catch (err) {
        // Silent fail
      }
    };

    fetchMeta();
    const interval = setInterval(fetchMeta, 4000);
    return () => clearInterval(interval);
  }, [isOpen, room?.code, refreshKey]);

  if (!isOpen) return null;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    playPop();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePinWidget = async () => {
    setIsPinning(true);
    try {
      if (isCapacitor && window.Capacitor?.Plugins?.WidgetBridge) {
        await window.Capacitor.Plugins.WidgetBridge.requestPinWidget({ 
          roomCode, 
          serverUrl: getServerUrl() 
        });
        setPinSuccess(true);
        playPop();
      } else {
        setWebPinNotice(true);
      }
    } catch (err) {
      console.error('Widget pin failed:', err);
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="relative w-full max-w-lg bg-[#fffdfa] rounded-3xl border border-[#ede8e1] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-[#ede8e1] flex items-center justify-between bg-white/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff5722] to-[#ff8a65] flex items-center justify-center text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-1.5">
                Android Home Screen Widget
                <span className="badge-mint text-[10px] px-2 py-0.5 rounded-full font-semibold">Live Sync</span>
              </h2>
              <p className="text-xs text-zinc-500">See your partner's drawings on your home screen</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Interactive Widget Mockup Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-[#1e1e24] via-[#2d2226] to-[#18181b] p-4 text-white shadow-lg overflow-hidden border border-zinc-800">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-zinc-300">Live Widget Preview (2x2 / 3x3)</span>
              </div>
              <button 
                onClick={() => setRefreshKey(Date.now())}
                className="hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                title="Refresh preview"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sync</span>
              </button>
            </div>

            {/* Widget Container Mockup */}
            <div className="w-full aspect-[4/3] max-h-52 rounded-xl bg-[#fbf9f6] text-zinc-800 p-2.5 relative shadow-inner overflow-hidden border-2 border-white/20 flex flex-col justify-between">
              {/* Image Preview or Decorative Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                {widgetMeta?.hasDrawing ? (
                  <img 
                    key={refreshKey}
                    src={`${getServerUrl()}/api/room/${roomCode}/widget.png?t=${refreshKey}`}
                    alt="Live Canvas Widget"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Heart className="w-8 h-8 text-[#ff5722] fill-[#ff5722]/20 mb-1.5 animate-pulse" />
                    <p className="text-xs font-bold text-zinc-700">Studio Widget Preview</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Draw together on the canvas to see your live sketches appear here!</p>
                  </div>
                )}
              </div>

              {/* Top Widget Bar */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-zinc-200/80 shadow-xs text-[10px] font-bold text-zinc-800">
                  <Heart className="w-3 h-3 text-[#ff5722] fill-[#ff5722]" />
                  <span>{roomCode}</span>
                </div>
                <div className="bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-zinc-200/80 shadow-xs text-[9px] font-medium text-zinc-500">
                  {widgetMeta?.hasDrawing ? 'Updated just now' : 'Waiting for sketch...'}
                </div>
              </div>

              {/* Bottom Widget Bar */}
              <div className="relative z-10 flex items-center justify-between text-[10px]">
                <span className="bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[9px]">
                  Partner Play ❤️
                </span>
                <span className="text-zinc-500 font-mono text-[9px]">
                  Tap to draw
                </span>
              </div>
            </div>
          </div>

          {/* Web Pin Notice Callout */}
          {webPinNotice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-fadeIn">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Android Home Screen Widget</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  To pin the widget directly in 1 tap, open Partner Play inside the Android APK app. On regular mobile browsers, long press your phone home screen and select Widgets &rarr; Partner Play.
                </p>
              </div>
            </div>
          )}

          {/* Quick Room Code Box */}
          <div className="p-3.5 rounded-2xl bg-[#f7f5f0] border border-[#ede8e1] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-zinc-500 block">Your Studio Room Key:</span>
              <span className="text-base sm:text-lg font-mono font-black text-[#ff5722] tracking-wider">{roomCode}</span>
            </div>
            <button
              onClick={copyRoomCode}
              className="py-1.5 px-3 rounded-xl bg-white border border-[#ede8e1] text-xs font-semibold text-zinc-700 hover:text-[#ff5722] hover:border-[#ff5722] flex items-center gap-1.5 transition-all shadow-xs shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Key'}</span>
            </button>
          </div>

          {/* Action Button: Pin or Instructions */}
          {isCapacitor ? (
            <button
              onClick={handlePinWidget}
              disabled={isPinning || pinSuccess}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#ff5722] to-[#ff7043] text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>{pinSuccess ? '✓ Widget Pinned to Home Screen!' : isPinning ? 'Requesting Android Pin...' : '📌 Pin Widget to Android Home Screen'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                How to get the widget on Android:
              </h3>
              <ol className="space-y-2 text-xs text-zinc-700 list-decimal list-inside bg-white p-3.5 rounded-2xl border border-[#ede8e1] leading-relaxed">
                <li>
                  <strong>Install the Android App:</strong> Build or install the Partner Play Android APK on your phone.
                </li>
                <li>
                  <strong>Add the Widget:</strong> On your Android home screen, <em>long press on an empty space</em> &rarr; tap <strong>Widgets</strong> &rarr; find <strong>Partner Play</strong>.
                </li>
                <li>
                  <strong>Place & Resize:</strong> Drag it to your home screen (it can be 2x2, 3x3, or 4x4).
                </li>
                <li>
                  <strong>Auto-Syncs:</strong> Whenever your partner draws or sends a stamp, the widget refreshes automatically! Tapping it opens the studio instantly.
                </li>
              </ol>
            </div>
          )}

          {/* Direct Widget Feed URL Link for Testing */}
          <div className="pt-2 border-t border-[#ede8e1] flex items-center justify-between text-[11px] text-zinc-500">
            <span>Direct Widget Feed URL:</span>
            <a 
              href={`${getServerUrl()}/api/room/${roomCode}/widget.png`}
              target="_blank" 
              rel="noreferrer"
              className="text-[#ff5722] hover:underline font-mono flex items-center gap-1"
            >
              <span>{getServerUrl()}/api/room/{roomCode}/widget.png</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
