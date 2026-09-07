import React, { useRef, useEffect, useState, useCallback } from 'react';
import { socket, getServerUrl } from '../services/socket';
import { playPop, playChime } from '../services/sound';
import { 
  Paintbrush, 
  Sparkles, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Download, 
  Highlighter, 
  Heart, 
  Check, 
  X, 
  AlertTriangle, 
  MousePointer2, 
  ImagePlus, 
  Moon, 
  Sun, 
  Loader2,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw as ResetIcon
} from 'lucide-react';

const LIGHT_PALETTE = [
  { name: 'Coral', color: '#ff5722' },
  { name: 'Charcoal', color: '#18181b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Purple', color: '#7c3aed' },
  { name: 'Sky', color: '#0284c7' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Slate', color: '#94a3b8' },
];

const MIDNIGHT_PALETTE = [
  { name: 'Neon Coral', color: '#ff5722' },
  { name: 'Moonlight White', color: '#ffffff' },
  { name: 'Neon Rose', color: '#ff2d75' },
  { name: 'Neon Violet', color: '#b55fe6' },
  { name: 'Electric Cyan', color: '#00f0ff' },
  { name: 'Emerald Glow', color: '#10b981' },
  { name: 'Starlight Gold', color: '#ffd15c' },
  { name: 'Starlight Silver', color: '#94a3b8' },
];

const SIZES = [3, 5, 8, 14, 24];

const STAMPS = [
  { icon: '❤️', label: 'Heart' },
  { icon: '👑', label: 'President / Crown' },
  { icon: '🌹', label: 'Rose' },
  { icon: '✨', label: 'Sparkle' },
  { icon: '💖', label: 'Sparkling Heart' },
  { icon: '💍', label: 'Diamond Ring' },
  { icon: '💌', label: 'Love Letter' },
  { icon: '⭐', label: 'Star' },
];

// Helper to compute exact rendered bounding box for a photo stroke
export function getPhotoBounds(stroke, width, height) {
  if (!stroke || stroke.type !== 'photo') return null;
  const aspect = stroke.aspectRatio || 1;
  const scale = stroke.scale || 1.0;
  const centerX = (stroke.x ?? 0.5) * width;
  const centerY = (stroke.y ?? 0.5) * height;

  if (stroke.mode === 'backdrop') {
    const baseW = width * 0.85;
    const cardW = baseW * scale;
    const cardH = cardW / aspect;
    const x = centerX - cardW / 2;
    const y = centerY - cardH / 2;
    return {
      x,
      y,
      width: cardW,
      height: cardH,
      centerX,
      centerY,
      scale,
    };
  }

  // Polaroid mode
  const baseCardW = Math.min(width * 0.55, Math.max(210, width * 0.38));
  const cardW = baseCardW * scale;
  const photoW = cardW - 22 * scale;
  const photoH = Math.max(80 * scale, photoW / aspect);
  const bottomChin = (stroke.caption ? 44 : 32) * scale;
  const cardH = photoH + (22 * scale) + bottomChin;
  const x = centerX - cardW / 2;
  const y = centerY - cardH / 2;

  return {
    x,
    y,
    width: cardW,
    height: cardH,
    centerX,
    centerY,
    scale,
    photoX: x + 11 * scale,
    photoY: y + 11 * scale,
    photoW,
    photoH,
    bottomChin,
  };
}

// Helper to compute bounding box for a voice sticker stroke
export function getVoiceBounds(stroke, width, height) {
  if (!stroke || stroke.type !== 'voice') return null;
  const pillW = Math.min(185, Math.max(140, width * 0.34));
  const pillH = 44;
  const centerX = (stroke.x ?? 0.5) * width;
  const centerY = (stroke.y ?? 0.5) * height;
  const x = centerX - pillW / 2;
  const y = centerY - pillH / 2;
  return {
    x,
    y,
    width: pillW,
    height: pillH,
    centerX,
    centerY,
  };
}

export default function CanvasBoard({ room, user, isActive = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const strokeHistoryRef = useRef([]);
  const redoStackRef = useRef([]);
  const initializedRoomRef = useRef(null);
  const pointerDownInfoRef = useRef({ time: 0, px: 0, py: 0 });

  // Theme: 'light' (Warm Paper #fbf9f6) vs 'midnight' (Dark Obsidian #121216)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('partner_canvas_theme') || 'light';
    }
    return 'light';
  });
  const isDark = theme === 'midnight';
  const currentPalette = isDark ? MIDNIGHT_PALETTE : LIGHT_PALETTE;

  // Active tool settings: 'brush' | 'glow' | 'highlighter' | 'eraser' | 'stamp'
  const [tool, setTool] = useState('brush');
  const [selectedColor, setSelectedColor] = useState('#ff5722');
  const [brushSize, setBrushSize] = useState(8); // Default medium/slightly large
  const [selectedStamp, setSelectedStamp] = useState('❤️');

  // Photo Selection state
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);

  // In-App Dialog & Toast states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [downloadToast, setDownloadToast] = useState(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Partner live cursor
  const [partnerCursor, setPartnerCursor] = useState(null);
  const partnerCursorTimerRef = useRef(null);

  // Photo Doodle states
  const fileInputRef = useRef(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoMode, setPhotoMode] = useState('polaroid');
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // --- Voice Whispers States ---
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const previewPlayerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Audio Playback for Voice Stickers on Canvas
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const activeAudioRef = useRef(null);

  // Dragging voice stickers
  const draggingVoiceRef = useRef(null);

  // Image Element Cache: url -> HTMLImageElement
  const imageMapRef = useRef(new Map());

  // Image loader helper
  const getLoadedImage = useCallback((url) => {
    if (!url) return null;
    const existing = imageMapRef.current.get(url);
    if (existing) {
      return (existing.complete && existing.naturalWidth > 0) ? existing : null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      redrawCanvas();
    };
    img.src = url;
    imageMapRef.current.set(url, img);
    return null;
  }, []);

  // Play voice whisper on canvas
  const playVoiceWhisper = useCallback((stroke) => {
    if (!stroke?.url) return;

    // If already playing this sticker, pause/stop it
    if (playingVoiceId === stroke.id && activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
      setPlayingVoiceId(null);
      redrawCanvas();
      return;
    }

    // Stop any other currently playing voice whisper
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const audio = new Audio(stroke.url);
    activeAudioRef.current = audio;
    setPlayingVoiceId(stroke.id);
    redrawCanvas();

    audio.onended = () => {
      setPlayingVoiceId(null);
      activeAudioRef.current = null;
      redrawCanvas();
    };

    audio.onerror = () => {
      setPlayingVoiceId(null);
      activeAudioRef.current = null;
      redrawCanvas();
    };

    audio.play().catch(() => {
      setPlayingVoiceId(null);
      activeAudioRef.current = null;
      redrawCanvas();
    });
  }, [playingVoiceId]);

  // Sync canvas theme with room state if provided
  useEffect(() => {
    if (room?.canvasTheme && (room.canvasTheme === 'light' || room.canvasTheme === 'midnight')) {
      setTheme(room.canvasTheme);
      localStorage.setItem('partner_canvas_theme', room.canvasTheme);
    }
  }, [room?.canvasTheme]);

  // Listen for real-time theme changes from partner
  useEffect(() => {
    const handleRemoteTheme = ({ theme: remoteTheme }) => {
      if (remoteTheme && (remoteTheme === 'light' || remoteTheme === 'midnight')) {
        setTheme(remoteTheme);
        localStorage.setItem('partner_canvas_theme', remoteTheme);
        playPop();
      }
    };

    socket.on('canvas:theme', handleRemoteTheme);
    return () => {
      socket.off('canvas:theme', handleRemoteTheme);
    };
  }, []);

  // Theme toggle action
  const toggleTheme = () => {
    const nextTheme = theme === 'midnight' ? 'light' : 'midnight';
    setTheme(nextTheme);
    localStorage.setItem('partner_canvas_theme', nextTheme);
    playPop();
    socket.emit('canvas:theme', { theme: nextTheme });
    setDownloadToast(nextTheme === 'midnight' ? 'Midnight Romance mode enabled 🌙' : 'Warm Paper mode enabled ☀️');
    setTimeout(() => setDownloadToast(null), 2500);
  };

  // Helper to render one stroke (normalized -> canvas pixels)
  const renderSingleStroke = useCallback((ctx, stroke, width, height) => {
    if (!stroke) return;

    // 1. Voice Whisper Sticker
    if (stroke.type === 'voice') {
      const bounds = getVoiceBounds(stroke, width, height);
      if (!bounds) return;
      const { x, y, width: pillW, height: pillH, centerY } = bounds;
      const isPlaying = playingVoiceId === stroke.id;

      ctx.save();
      // If playing, draw pulsing audio wave rings
      if (isPlaying) {
        ctx.strokeStyle = stroke.color || '#ff5722';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - 6, y - 6, pillW + 12, pillH + 12, 28);
        else ctx.rect(x - 6, y - 6, pillW + 12, pillH + 12);
        ctx.stroke();

        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - 12, y - 12, pillW + 24, pillH + 24, 32);
        else ctx.rect(x - 12, y - 12, pillW + 24, pillH + 24);
        ctx.stroke();
      }

      // Pill Shadow
      ctx.globalAlpha = 1.0;
      ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 87, 34, 0.2)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      // Pill Background
      ctx.fillStyle = isDark ? '#1a1a24' : '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, pillW, pillH, 22);
      } else {
        ctx.rect(x, y, pillW, pillH);
      }
      ctx.fill();

      // Pill Border
      ctx.strokeStyle = isPlaying ? (stroke.color || '#ff5722') : (isDark ? '#2e2e3e' : '#ffcdbc');
      ctx.lineWidth = isPlaying ? 2 : 1.5;
      ctx.stroke();
      ctx.restore();

      // Avatar / Play circle button on the left
      const btnCenterX = x + 22;
      const btnCenterY = centerY;
      ctx.save();
      ctx.fillStyle = stroke.color || '#ff5722';
      ctx.beginPath();
      ctx.arc(btnCenterX, btnCenterY, 13, 0, Math.PI * 2);
      ctx.fill();

      // Icon inside circle: Play triangle or Pause bars
      ctx.fillStyle = '#ffffff';
      if (isPlaying) {
        ctx.fillRect(btnCenterX - 4, btnCenterY - 5, 3, 10);
        ctx.fillRect(btnCenterX + 1, btnCenterY - 5, 3, 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(btnCenterX - 3, btnCenterY - 5);
        ctx.lineTo(btnCenterX + 5, btnCenterY);
        ctx.lineTo(btnCenterX - 3, btnCenterY + 5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Author & Duration Text
      ctx.save();
      ctx.fillStyle = isDark ? '#f4f4f5' : '#18181b';
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const authorLabel = stroke.author ? `${stroke.author}` : 'Whisper';
      ctx.fillText(authorLabel, x + 42, centerY - 6);

      // Duration / Status
      ctx.fillStyle = isDark ? '#a1a1aa' : '#71717a';
      ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
      const durationLabel = isPlaying ? 'Playing whisper…' : `Voice • 0:${String(stroke.duration || 5).padStart(2, '0')}`;
      ctx.fillText(durationLabel, x + 42, centerY + 8);
      ctx.restore();

      // Mic badge on right
      ctx.save();
      ctx.font = '12px "Segoe UI Emoji", Apple Color Emoji, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎙️', x + pillW - 14, centerY);
      ctx.restore();
      return;
    }

    // 2. Photo Stroke (Polaroid or Backdrop)
    if (stroke.type === 'photo') {
      const img = getLoadedImage(stroke.url);
      const bounds = getPhotoBounds(stroke, width, height);
      if (!bounds) return;

      const { x, y, width: cardW, height: cardH, scale } = bounds;

      if (stroke.mode === 'backdrop') {
        ctx.save();
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 24 * Math.min(scale, 1.5);
        ctx.shadowOffsetY = 6 * Math.min(scale, 1.5);

        if (img) {
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(x, y, cardW, cardH, 16 * Math.min(scale, 1.5));
          } else {
            ctx.rect(x, y, cardW, cardH);
          }
          ctx.clip();
          ctx.drawImage(img, x, y, cardW, cardH);
        } else {
          ctx.fillStyle = isDark ? '#1f1f28' : '#ede8e1';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, cardW, cardH, 16 * Math.min(scale, 1.5));
          else ctx.rect(x, y, cardW, cardH);
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      // Default: Polaroid Memory Card Mode
      const { photoX, photoY, photoW, photoH, bottomChin, centerX } = bounds;

      ctx.save();
      ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = (isDark ? 24 : 16) * Math.min(scale, 1.5);
      ctx.shadowOffsetY = 6 * Math.min(scale, 1.5);

      // Polaroid white card background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, cardW, cardH, 8 * Math.min(scale, 1.5));
      } else {
        ctx.rect(x, y, cardW, cardH);
      }
      ctx.fill();
      ctx.restore();

      // Photo inside card
      ctx.save();
      if (img) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(photoX, photoY, photoW, photoH, 4 * Math.min(scale, 1.5));
        else ctx.rect(photoX, photoY, photoW, photoH);
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoW, photoH);
      } else {
        ctx.fillStyle = '#f4efe8';
        ctx.fillRect(photoX, photoY, photoW, photoH);
      }
      ctx.restore();

      // Photo inner border
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = Math.max(1, 1 * scale);
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Cute pin on top
      ctx.font = `${Math.max(10, 14 * scale)}px "Segoe UI Emoji", Apple Color Emoji, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('📌', centerX, y + 7 * scale);

      // Handwritten caption at bottom chin
      if (stroke.caption) {
        ctx.font = `600 ${Math.max(10, 13 * scale)}px "Caveat", "Indie Flower", cursive, sans-serif`;
        ctx.fillStyle = '#44403c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stroke.caption, centerX, y + 11 * scale + photoH + bottomChin / 2);
      }
      ctx.restore();
      return;
    }

    // 3. Love Stamp
    if (stroke.type === 'stamp') {
      const x = stroke.x * width;
      const y = stroke.y * height;
      ctx.save();
      ctx.font = `${stroke.size * 5 + 22}px 'Segoe UI Emoji', Apple Color Emoji, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stroke.stamp, x, y);
      ctx.restore();
      return;
    }

    // 4. Vector Path (Brush, Neon Glow, Highlighter, Eraser)
    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const actualWidth = Math.max(2, stroke.width * Math.max(0.6, width / 750));

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = actualWidth * 1.5;
    } else if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = actualWidth * 3;
    } else if (stroke.tool === 'glow') {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = actualWidth;
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = isDark ? 22 : 14;
    } else {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = actualWidth;
    }

    const pts = stroke.points;
    if (pts.length === 1) {
      ctx.beginPath();
      ctx.arc(pts[0].x * width, pts[0].y * height, actualWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color;
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x * width, pts[0].y * height);

    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i - 1];
      const p2 = pts[i];
      const midX = ((p1.x + p2.x) / 2) * width;
      const midY = ((p1.y + p2.y) / 2) * height;
      ctx.quadraticCurveTo(p1.x * width, p1.y * height, midX, midY);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last.x * width, last.y * height);
    ctx.stroke();
    ctx.restore();
  }, [getLoadedImage, isDark, playingVoiceId]);

  // Redraw all strokes from normalized history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background texture dots
    const dotSpacing = isDark ? 32 : 28;
    for (let x = 14; x < width; x += dotSpacing) {
      for (let y = 14; y < height; y += dotSpacing) {
        if (isDark) {
          const isStar = ((x * 17 + y * 31) % 7 === 0);
          ctx.fillStyle = isStar ? 'rgba(255, 230, 140, 0.4)' : 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.arc(x, y, isStar ? 1.4 : 1.0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Render strokes
    strokeHistoryRef.current.forEach((stroke) => {
      renderSingleStroke(ctx, stroke, width, height);
    });

    setHasStrokes(strokeHistoryRef.current.length > 0);
  }, [isDark, renderSingleStroke]);

  // Resize canvas when container dimensions change
  const handleResize = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width;
    canvas.height = rect.height;

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Snapshot debouncer for Android Home Screen Widget
  const snapshotTimeoutRef = useRef(null);

  const scheduleWidgetSnapshot = useCallback(() => {
    if (!room?.code) return;
    if (snapshotTimeoutRef.current) {
      clearTimeout(snapshotTimeoutRef.current);
    }
    snapshotTimeoutRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = canvas.width;
        snapCanvas.height = canvas.height;
        const sCtx = snapCanvas.getContext('2d');
        sCtx.fillStyle = isDark ? '#121216' : '#fbf9f6';
        sCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
        sCtx.drawImage(canvas, 0, 0);

        const imageBase64 = snapCanvas.toDataURL('image/png', 0.85);
        fetch(`${getServerUrl()}/api/room/${room.code}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            authorName: user?.name || 'Partner',
          }),
        }).then(res => {
          if (res.ok && typeof window !== 'undefined' && window.Capacitor?.Plugins?.WidgetBridge) {
            window.Capacitor.Plugins.WidgetBridge.refreshWidget().catch(() => {});
          }
        }).catch(() => {});
      } catch (err) {}
    }, 750);
  }, [room?.code, user?.name, isDark]);

  // When switching back to canvas tab, re-measure dimensions
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        handleResize();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, handleResize]);

  // Load initial canvas state from room
  useEffect(() => {
    if (!room) {
      initializedRoomRef.current = null;
      return;
    }
    if (room.canvasState && initializedRoomRef.current !== room.code) {
      initializedRoomRef.current = room.code;
      strokeHistoryRef.current = [...room.canvasState];
      setHasStrokes(room.canvasState.length > 0);
      redrawCanvas();
      if (room.canvasState.length > 0) {
        scheduleWidgetSnapshot();
      }
    }
  }, [room, redrawCanvas, scheduleWidgetSnapshot]);

  // Request fresh canvas state on mount and whenever socket connects/reconnects
  useEffect(() => {
    const handleRequestSync = () => {
      if (room?.code) {
        socket.emit('canvas:request_sync', (res) => {
          if (res && res.success && res.canvasState) {
            strokeHistoryRef.current = res.canvasState;
            if (res.canvasTheme) {
              setTheme(res.canvasTheme);
              localStorage.setItem('partner_canvas_theme', res.canvasTheme);
            }
            setHasStrokes(res.canvasState.length > 0);
            redrawCanvas();
            scheduleWidgetSnapshot();
          }
        });
      }
    };

    handleRequestSync();
    socket.on('connect', handleRequestSync);
    return () => socket.off('connect', handleRequestSync);
  }, [room?.code, redrawCanvas, scheduleWidgetSnapshot]);

  // Socket listeners for partner canvas events
  useEffect(() => {
    const onIncomingStroke = (strokeData) => {
      strokeHistoryRef.current.push(strokeData);
      setHasStrokes(true);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        renderSingleStroke(ctx, strokeData, canvas.width, canvas.height);
      }
      scheduleWidgetSnapshot();
    };

    const onIncomingClear = () => {
      strokeHistoryRef.current = [];
      redoStackRef.current = [];
      setSelectedPhotoId(null);
      setHasStrokes(false);
      const canvas = canvasRef.current;
      if (canvas) {
        redrawCanvas();
      }
      scheduleWidgetSnapshot();
    };

    const onIncomingHistory = (newHistory) => {
      strokeHistoryRef.current = newHistory || [];
      setHasStrokes((newHistory || []).length > 0);
      redrawCanvas();
      scheduleWidgetSnapshot();
    };

    const onIncomingPhotoUpdate = (updateData) => {
      const idx = strokeHistoryRef.current.findIndex(s => s.id === updateData.id);
      if (idx !== -1) {
        strokeHistoryRef.current[idx] = {
          ...strokeHistoryRef.current[idx],
          x: typeof updateData.x === 'number' ? updateData.x : strokeHistoryRef.current[idx].x,
          y: typeof updateData.y === 'number' ? updateData.y : strokeHistoryRef.current[idx].y,
          scale: typeof updateData.scale === 'number' ? updateData.scale : strokeHistoryRef.current[idx].scale,
          mode: updateData.mode || strokeHistoryRef.current[idx].mode,
        };
        redrawCanvas();
        scheduleWidgetSnapshot();
      }
    };

    const onPartnerCursor = (cursorData) => {
      setPartnerCursor(cursorData);
      if (partnerCursorTimerRef.current) clearTimeout(partnerCursorTimerRef.current);
      partnerCursorTimerRef.current = setTimeout(() => {
        setPartnerCursor(null);
      }, 3000);
    };

    socket.on('canvas:stroke', onIncomingStroke);
    socket.on('canvas:clear', onIncomingClear);
    socket.on('canvas:history_sync', onIncomingHistory);
    socket.on('canvas:photo_update', onIncomingPhotoUpdate);
    socket.on('cursor:move', onPartnerCursor);

    return () => {
      socket.off('canvas:stroke', onIncomingStroke);
      socket.off('canvas:clear', onIncomingClear);
      socket.off('canvas:history_sync', onIncomingHistory);
      socket.off('canvas:photo_update', onIncomingPhotoUpdate);
      socket.off('cursor:move', onPartnerCursor);
      if (partnerCursorTimerRef.current) clearTimeout(partnerCursorTimerRef.current);
      if (snapshotTimeoutRef.current) clearTimeout(snapshotTimeoutRef.current);
    };
  }, [redrawCanvas, renderSingleStroke, scheduleWidgetSnapshot]);

  // Convert pointer event to normalized coordinates (0.0 - 1.0)
  const getNormalizedCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Pointer Down (Start stroke, stamp, or drag voice sticker / deselect photo)
  const handlePointerDown = (e) => {
    const { x, y } = getNormalizedCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const px = x * canvas.width;
    const py = y * canvas.height;

    pointerDownInfoRef.current = {
      time: Date.now(),
      px,
      py,
    };

    // Check if pointer hit a voice sticker to start dragging it
    const hitVoice = [...strokeHistoryRef.current].reverse().find(stroke => {
      if (stroke.type !== 'voice') return false;
      const b = getVoiceBounds(stroke, canvas.width, canvas.height);
      return b && px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
    });

    if (hitVoice) {
      draggingVoiceRef.current = {
        strokeId: hitVoice.id,
        startX: px,
        startY: py,
        initialX: hitVoice.x ?? 0.5,
        initialY: hitVoice.y ?? 0.5,
      };
      return;
    }

    // If an active photo was selected and user tapped outside of it, deselect it
    if (selectedPhotoId) {
      const activeStroke = strokeHistoryRef.current.find(s => s.id === selectedPhotoId);
      const b = getPhotoBounds(activeStroke, canvas.width, canvas.height);
      if (!b || px < b.x || px > b.x + b.width || py < b.y || py > b.y + b.height) {
        setSelectedPhotoId(null);
      }
    }

    e.preventDefault();

    // If stamp tool is selected, place stamp immediately
    if (tool === 'stamp') {
      const stampStroke = {
        id: Math.random().toString(36).substring(2, 9),
        type: 'stamp',
        stamp: selectedStamp,
        x,
        y,
        size: brushSize,
        author: user?.name,
      };
      strokeHistoryRef.current.push(stampStroke);
      redoStackRef.current = [];
      setHasStrokes(true);
      playPop();
      if (canvas) {
        renderSingleStroke(canvas.getContext('2d'), stampStroke, canvas.width, canvas.height);
      }
      socket.emit('canvas:stroke', stampStroke);
      scheduleWidgetSnapshot();
      return;
    }

    isDrawingRef.current = true;
    setHasStrokes(true);
    redoStackRef.current = [];
    currentStrokeRef.current = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'path',
      tool,
      color: selectedColor,
      width: brushSize,
      points: [{ x, y }],
      author: user?.name,
    };

    // Broadcast cursor position
    socket.emit('cursor:move', { x, y, isDrawing: true });
  };

  // Pointer Move (Collect points, live render, or drag voice sticker)
  const handlePointerMove = (e) => {
    const { x, y } = getNormalizedCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle dragging a voice sticker
    if (draggingVoiceRef.current) {
      const px = x * canvas.width;
      const py = y * canvas.height;
      const dx = px - draggingVoiceRef.current.startX;
      const dy = py - draggingVoiceRef.current.startY;

      const newX = Math.max(0.08, Math.min(0.92, draggingVoiceRef.current.initialX + dx / canvas.width));
      const newY = Math.max(0.08, Math.min(0.92, draggingVoiceRef.current.initialY + dy / canvas.height));

      const strokeIdx = strokeHistoryRef.current.findIndex(s => s.id === draggingVoiceRef.current.strokeId);
      if (strokeIdx !== -1) {
        strokeHistoryRef.current[strokeIdx].x = newX;
        strokeHistoryRef.current[strokeIdx].y = newY;
        redrawCanvas();
        socket.emit('canvas:photo_update', {
          id: draggingVoiceRef.current.strokeId,
          x: newX,
          y: newY,
        });
      }
      return;
    }

    // Throttle cursor broadcast
    socket.emit('cursor:move', { x, y, isDrawing: isDrawingRef.current });

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    currentStrokeRef.current.points.push({ x, y });

    // Immediate local render of new segment
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const actualWidth = Math.max(2, currentStrokeRef.current.width * Math.max(0.6, width / 750));

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = actualWidth * 1.5;
    } else if (tool === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = actualWidth * 3;
    } else if (tool === 'glow') {
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = actualWidth;
      ctx.shadowColor = currentStrokeRef.current.color;
      ctx.shadowBlur = isDark ? 22 : 14;
    } else {
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = actualWidth;
    }

    const pts = currentStrokeRef.current.points;
    if (pts.length >= 2) {
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Pointer Up (Finalize stroke or detect quick tap on photo or voice sticker)
  const handlePointerUp = () => {
    const canvas = canvasRef.current;

    // Reset voice dragging
    if (draggingVoiceRef.current) {
      const wasQuick = (Date.now() - pointerDownInfoRef.current.time) < 260;
      const strokeId = draggingVoiceRef.current.strokeId;
      draggingVoiceRef.current = null;

      // If it was a tap (not a drag), play the voice whisper
      if (wasQuick) {
        const stroke = strokeHistoryRef.current.find(s => s.id === strokeId);
        if (stroke) {
          playVoiceWhisper(stroke);
          playPop();
        }
      }
      scheduleWidgetSnapshot();
      return;
    }

    const isQuickTap = (Date.now() - pointerDownInfoRef.current.time) < 260;

    // Quick tap detection for photo selection
    if (isQuickTap && canvas) {
      const px = pointerDownInfoRef.current.px;
      const py = pointerDownInfoRef.current.py;

      // Check if user tapped a photo
      const hitPhoto = [...strokeHistoryRef.current].reverse().find(stroke => {
        if (stroke.type !== 'photo') return false;
        const b = getPhotoBounds(stroke, canvas.width, canvas.height);
        return b && px >= b.x && px <= b.x + b.width && py >= b.y && py <= b.y + b.height;
      });

      if (hitPhoto) {
        currentStrokeRef.current = null;
        isDrawingRef.current = false;
        setSelectedPhotoId(hitPhoto.id);
        playPop();
        redrawCanvas();
        return;
      }
    }

    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentStrokeRef.current;
    strokeHistoryRef.current.push(stroke);
    currentStrokeRef.current = null;

    // Emit completed stroke to partner
    socket.emit('canvas:stroke', stroke);
    socket.emit('cursor:move', { x: 0, y: 0, isDrawing: false });
    scheduleWidgetSnapshot();
  };

  // Undo
  const handleUndo = () => {
    if (strokeHistoryRef.current.length === 0) return;
    const popped = strokeHistoryRef.current.pop();
    if (popped) {
      redoStackRef.current.push(popped);
      if (selectedPhotoId === popped.id) {
        setSelectedPhotoId(null);
      }
    }
    playPop();
    redrawCanvas();
    socket.emit('canvas:undo');
    scheduleWidgetSnapshot();
  };

  // Redo
  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;
    const restored = redoStackRef.current.pop();
    if (restored) {
      strokeHistoryRef.current.push(restored);
      setHasStrokes(true);
      playPop();
      const canvas = canvasRef.current;
      if (canvas) {
        renderSingleStroke(canvas.getContext('2d'), restored, canvas.width, canvas.height);
      }
      socket.emit('canvas:stroke', restored);
      scheduleWidgetSnapshot();
    }
  };

  // Clear Canvas Trigger
  const confirmClearCanvas = () => {
    strokeHistoryRef.current = [];
    redoStackRef.current = [];
    setSelectedPhotoId(null);
    setHasStrokes(false);
    redrawCanvas();
    socket.emit('canvas:clear');
    scheduleWidgetSnapshot();
    setShowClearConfirm(false);
    playPop();
  };

  // Download drawing with feedback
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');

    // Fill background
    expCtx.fillStyle = isDark ? '#121216' : '#fbf9f6';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw canvas image
    expCtx.drawImage(canvas, 0, 0);

    // Add watermark
    expCtx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    expCtx.fillStyle = isDark ? '#ff784e' : '#ff5722';
    expCtx.textAlign = 'right';
    expCtx.fillText('Created together on Nikhana Play 🧡', exportCanvas.width - 20, exportCanvas.height - 20);

    const link = document.createElement('a');
    link.download = `nikhana-play-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    playPop();
    setDownloadToast('Studio canvas saved to your device! 🎨');
    setTimeout(() => setDownloadToast(null), 3000);
  };

  // --- Photo Upload Flow ---
  const handlePhotoFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1280;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedUrl = offscreen.toDataURL('image/jpeg', 0.85);

        setPendingPhoto({
          url: compressedUrl,
          aspectRatio: w / h,
          fileName: file.name,
          width: w,
          height: h,
        });
        setShowPhotoModal(true);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleConfirmAddPhoto = async () => {
    if (!pendingPhoto) return;
    setIsUploadingPhoto(true);

    let finalImageUrl = pendingPhoto.url;

    try {
      const res = await fetch(`${getServerUrl()}/api/canvas/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: pendingPhoto.url,
          fileName: pendingPhoto.fileName || 'photo.jpg',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          finalImageUrl = data.url;
        }
      }
    } catch (err) {
      console.warn('Using offline data URL for photo:', err);
    }

    const photoStroke = {
      id: 'photo_' + Math.random().toString(36).substring(2, 9),
      type: 'photo',
      url: finalImageUrl,
      mode: photoMode, // 'polaroid' | 'backdrop'
      caption: photoCaption.trim(),
      aspectRatio: pendingPhoto.aspectRatio,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      author: user?.name || 'Partner',
      timestamp: Date.now(),
    };

    strokeHistoryRef.current.push(photoStroke);
    redoStackRef.current = [];
    setHasStrokes(true);
    redrawCanvas();

    socket.emit('canvas:stroke', photoStroke);
    scheduleWidgetSnapshot();

    setIsUploadingPhoto(false);
    setShowPhotoModal(false);
    setPendingPhoto(null);
    setPhotoCaption('');
    playChime();

    // Immediately select the placed photo so user can position/minimize it with gestures
    setSelectedPhotoId(photoStroke.id);

    setDownloadToast('Drag photo to move, drag corners or pinch to resize 🖐️');
    setTimeout(() => setDownloadToast(null), 3500);
  };

  // --- Voice Whispers Recording Engine ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);
      playPop();

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 14) {
            stopRecording();
            return 15;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setDownloadToast('Microphone access needed to record voice whispers 🎙️');
      setTimeout(() => setDownloadToast(null), 3000);
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    playPop();
  };

  const togglePreviewPlay = () => {
    if (!previewUrl) return;
    if (isPlayingPreview && previewPlayerRef.current) {
      previewPlayerRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      const audio = new Audio(previewUrl);
      previewPlayerRef.current = audio;
      setIsPlayingPreview(true);
      audio.onended = () => setIsPlayingPreview(false);
      audio.onerror = () => setIsPlayingPreview(false);
      audio.play().catch(() => setIsPlayingPreview(false));
    }
  };

  const handleConfirmPinVoice = () => {
    if (!recordedAudioBlob) return;
    setIsUploadingPhoto(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = reader.result;
      let finalVoiceUrl = base64Audio;

      try {
        const res = await fetch(`${getServerUrl()}/api/voice/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            fileName: 'whisper.webm',
            duration: recordingSeconds || 5,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.url) {
            finalVoiceUrl = data.url;
          }
        }
      } catch (err) {
        console.warn('Using offline data URL for voice whisper:', err);
      }

      const voiceStroke = {
        id: 'voice_' + Math.random().toString(36).substring(2, 9),
        type: 'voice',
        url: finalVoiceUrl,
        duration: recordingSeconds || 5,
        x: 0.5,
        y: 0.5,
        author: user?.name || 'Partner',
        color: user?.color || '#ff5722',
        timestamp: Date.now(),
      };

      strokeHistoryRef.current.push(voiceStroke);
      redoStackRef.current = [];
      setHasStrokes(true);
      redrawCanvas();

      socket.emit('canvas:stroke', voiceStroke);
      scheduleWidgetSnapshot();

      setIsUploadingPhoto(false);
      setShowVoiceModal(false);
      setRecordedAudioBlob(null);
      setPreviewUrl(null);
      playChime();

      setDownloadToast('Voice whisper pinned! Tap to listen, or drag anywhere 🎙️');
      setTimeout(() => setDownloadToast(null), 3500);
    };
    reader.readAsDataURL(recordedAudioBlob);
  };

  // --- Buttonless Gesture Manipulation: Drag to Move & Radial Corner Drag / Pinch to Resize ---
  const activeSelectedStroke = selectedPhotoId 
    ? strokeHistoryRef.current.find(s => s.id === selectedPhotoId && s.type === 'photo')
    : null;

  const activePhotoBounds = (activeSelectedStroke && canvasRef.current) 
    ? getPhotoBounds(activeSelectedStroke, canvasRef.current.width, canvasRef.current.height)
    : null;

  // 1. Drag anywhere on photo to relocate
  const handlePhotoDragStart = (e) => {
    e.stopPropagation();
    if (e.touches && e.touches.length === 2) {
      handlePinchStart(e);
      return;
    }
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas || !selectedPhotoId) return;

    const currentStroke = strokeHistoryRef.current.find(s => s.id === selectedPhotoId);
    if (!currentStroke) return;

    const startClientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const startClientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    const initialX = currentStroke.x ?? 0.5;
    const initialY = currentStroke.y ?? 0.5;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const onPointerMove = (moveEvt) => {
      if (moveEvt.touches && moveEvt.touches.length === 2) {
        return;
      }
      const moveX = moveEvt.clientX ?? (moveEvt.touches && moveEvt.touches[0]?.clientX);
      const moveY = moveEvt.clientY ?? (moveEvt.touches && moveEvt.touches[0]?.clientY);
      if (moveX === undefined || moveY === undefined) return;

      const dx = moveX - startClientX;
      const dy = moveY - startClientY;

      const newX = Math.max(0.06, Math.min(0.94, initialX + dx / canvasWidth));
      const newY = Math.max(0.06, Math.min(0.94, initialY + dy / canvasHeight));

      const strokeIdx = strokeHistoryRef.current.findIndex(s => s.id === selectedPhotoId);
      if (strokeIdx !== -1) {
        strokeHistoryRef.current[strokeIdx].x = newX;
        strokeHistoryRef.current[strokeIdx].y = newY;
        redrawCanvas();

        socket.emit('canvas:photo_update', {
          id: selectedPhotoId,
          x: newX,
          y: newY,
          scale: strokeHistoryRef.current[strokeIdx].scale,
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      scheduleWidgetSnapshot();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // 2. Drag ANY corner handle inward (to minimize) or outward (to enlarge)
  const handleCornerResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || !selectedPhotoId) return;

    const currentStroke = strokeHistoryRef.current.find(s => s.id === selectedPhotoId);
    if (!currentStroke) return;

    const bounds = getPhotoBounds(currentStroke, canvas.width, canvas.height);
    if (!bounds) return;

    const startClientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const startClientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);

    const initialDist = Math.hypot(startClientX - bounds.centerX, startClientY - bounds.centerY) || 1;
    const initialScale = currentStroke.scale || 1.0;

    const onPointerMove = (moveEvt) => {
      const moveX = moveEvt.clientX ?? (moveEvt.touches && moveEvt.touches[0]?.clientX);
      const moveY = moveEvt.clientY ?? (moveEvt.touches && moveEvt.touches[0]?.clientY);
      if (moveX === undefined || moveY === undefined) return;

      const currentDist = Math.hypot(moveX - bounds.centerX, moveY - bounds.centerY);
      const ratio = currentDist / initialDist;
      const newScale = Math.max(0.25, Math.min(2.5, initialScale * ratio));

      const strokeIdx = strokeHistoryRef.current.findIndex(s => s.id === selectedPhotoId);
      if (strokeIdx !== -1) {
        strokeHistoryRef.current[strokeIdx].scale = newScale;
        redrawCanvas();

        socket.emit('canvas:photo_update', {
          id: selectedPhotoId,
          x: strokeHistoryRef.current[strokeIdx].x,
          y: strokeHistoryRef.current[strokeIdx].y,
          scale: newScale,
        });
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      scheduleWidgetSnapshot();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
  };

  // 3. Two-finger native pinch gesture on touch devices
  const handlePinchStart = (e) => {
    if (!e.touches || e.touches.length < 2 || !selectedPhotoId) return;
    const currentStroke = strokeHistoryRef.current.find(s => s.id === selectedPhotoId);
    if (!currentStroke) return;

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) || 1;
    const initialScale = currentStroke.scale || 1.0;

    const onTouchMove = (moveEvt) => {
      if (!moveEvt.touches || moveEvt.touches.length < 2) return;
      const mt1 = moveEvt.touches[0];
      const mt2 = moveEvt.touches[1];
      const currentDist = Math.hypot(mt1.clientX - mt2.clientX, mt1.clientY - mt2.clientY);
      const newScale = Math.max(0.25, Math.min(2.5, initialScale * (currentDist / initialDist)));

      const strokeIdx = strokeHistoryRef.current.findIndex(s => s.id === selectedPhotoId);
      if (strokeIdx !== -1) {
        strokeHistoryRef.current[strokeIdx].scale = newScale;
        redrawCanvas();

        socket.emit('canvas:photo_update', {
          id: selectedPhotoId,
          x: strokeHistoryRef.current[strokeIdx].x,
          y: strokeHistoryRef.current[strokeIdx].y,
          scale: newScale,
        });
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      scheduleWidgetSnapshot();
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  };

  return (
    <div className={`relative flex-1 flex flex-col h-full overflow-hidden select-none transition-colors duration-500 ${isDark ? 'bg-[#121216]' : 'bg-[#fbf9f6]'}`}>
      {/* Toast Feedback */}
      {downloadToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fadeIn">
          <div className={`border shadow-lg rounded-full px-4 py-2 flex items-center gap-2 text-xs font-bold backdrop-blur-md ${
            isDark 
              ? 'bg-[#1c1c24] text-zinc-100 border-zinc-700 shadow-black/40' 
              : 'bg-white text-zinc-900 border-[#ffcdbc] shadow-[0_8px_24px_rgba(255,87,34,0.18)]'
          }`}>
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{downloadToast}</span>
          </div>
        </div>
      )}

      {/* Hidden file input for Photo uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* Canvas Area */}
      <div 
        ref={containerRef} 
        className="relative flex-1 w-full h-full overflow-hidden touch-none cursor-crosshair"
      >
        <canvas
          id="collaborative-canvas"
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute inset-0 w-full h-full"
        />

        {/* First Stroke Guidance Greeting */}
        {!hasStrokes && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-opacity duration-300">
            <div className={`px-4 py-2 rounded-full backdrop-blur-md border shadow-sm flex items-center gap-2 text-xs font-semibold ${
              isDark 
                ? 'bg-[#18181b]/90 border-zinc-800 text-zinc-300' 
                : 'bg-white/95 border-[#ede8e1] text-zinc-600'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-[#ff5722]" />
              <span>Draw, add photos, or whisper voice notes together</span>
            </div>
          </div>
        )}

        {/* Live Partner Cursor Indicator */}
        {partnerCursor && (
          <div
            className="absolute pointer-events-none transition-all duration-75 z-20"
            style={{
              left: `${partnerCursor.x * 100}%`,
              top: `${partnerCursor.y * 100}%`,
              transform: 'translate(-4px, -4px)',
            }}
          >
            <div className="relative flex items-center space-x-1.5">
              <MousePointer2 
                className="w-5 h-5 drop-shadow-md animate-bounce" 
                style={{ color: partnerCursor.color || '#ff5722', fill: partnerCursor.color || '#ff5722' }} 
              />
              <span 
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-md whitespace-nowrap ${
                  isDark ? 'bg-[#1c1c24] border border-zinc-700 text-zinc-100' : 'bg-white border-[#ede8e1] text-[#18181b]'
                }`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: partnerCursor.color || '#ff5722' }} />
                {partnerCursor.userName} {partnerCursor.isDrawing ? '✏️' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Buttonless Direct-Manipulation Selection Frame with 4 Corner Handles */}
        {activePhotoBounds && (
          <div
            className="absolute z-20 pointer-events-auto select-none"
            style={{
              left: `${activePhotoBounds.x}px`,
              top: `${activePhotoBounds.y}px`,
              width: `${activePhotoBounds.width}px`,
              height: `${activePhotoBounds.height}px`,
            }}
          >
            {/* Direct Drag-to-Move Area (no buttons!) */}
            <div
              onPointerDown={handlePhotoDragStart}
              className="absolute inset-0 rounded-xl border-2 border-[#ff5722] border-dashed shadow-[0_0_18px_rgba(255,87,34,0.35)] cursor-grab active:cursor-grabbing transition-shadow"
              title="Drag photo to relocate • Tap canvas outside to lock and draw"
            />

            {/* 4 Corner Resize Handles */}
            <div
              onPointerDown={handleCornerResizeStart}
              title="Drag corner to resize / minimize"
              className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-white border-2 border-[#ff5722] shadow-md flex items-center justify-center cursor-nwse-resize hover:scale-125 transition-transform"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" />
            </div>

            <div
              onPointerDown={handleCornerResizeStart}
              title="Drag corner to resize / minimize"
              className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border-2 border-[#ff5722] shadow-md flex items-center justify-center cursor-nesw-resize hover:scale-125 transition-transform"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" />
            </div>

            <div
              onPointerDown={handleCornerResizeStart}
              title="Drag corner to resize / minimize"
              className="absolute -bottom-2.5 -left-2.5 w-6 h-6 rounded-full bg-white border-2 border-[#ff5722] shadow-md flex items-center justify-center cursor-nesw-resize hover:scale-125 transition-transform"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" />
            </div>

            <div
              onPointerDown={handleCornerResizeStart}
              title="Drag corner to resize / minimize"
              className="absolute -bottom-2.5 -right-2.5 w-6 h-6 rounded-full bg-white border-2 border-[#ff5722] shadow-md flex items-center justify-center cursor-nwse-resize hover:scale-125 transition-transform"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#ff5722]" />
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Toolbar */}
      <div className={`absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-16px)] max-w-xl flex items-center justify-start sm:justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl shadow-xl transition-all overflow-x-auto no-scrollbar ${
        isDark 
          ? 'bg-[#18181b]/95 border border-zinc-800 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
          : 'bg-white border border-[#ede8e1] text-[#18181b] shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
      }`}>
        {/* Tool Selectors */}
        <div className={`flex items-center gap-0.5 border-r pr-1.5 flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-[#ede8e1]'}`}>
          <button
            id="tool-brush"
            onClick={() => {
              setTool('brush');
              setSelectedPhotoId(null);
            }}
            title="Standard Brush"
            className={`p-2 rounded-xl transition-all ${
              tool === 'brush' 
                ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]') 
                : (isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]')
            }`}
          >
            <Paintbrush className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-glow"
            onClick={() => {
              setTool('glow');
              setSelectedPhotoId(null);
            }}
            title="Neon Glow Pen"
            className={`p-2 rounded-xl transition-all ${
              tool === 'glow' 
                ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]') 
                : (isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]')
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-highlighter"
            onClick={() => {
              setTool('highlighter');
              setSelectedPhotoId(null);
            }}
            title="Soft Highlighter"
            className={`p-2 rounded-xl transition-all ${
              tool === 'highlighter' 
                ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]') 
                : (isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]')
            }`}
          >
            <Highlighter className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-eraser"
            onClick={() => {
              setTool('eraser');
              setSelectedPhotoId(null);
            }}
            title="Eraser"
            className={`p-2 rounded-xl transition-all ${
              tool === 'eraser' 
                ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]') 
                : (isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]')
            }`}
          >
            <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-stamp"
            onClick={() => {
              setTool('stamp');
              setSelectedPhotoId(null);
            }}
            title="Love Stamp / Stickers"
            className={`p-2 rounded-xl transition-all ${
              tool === 'stamp' 
                ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]') 
                : (isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]')
            }`}
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Photo Doodle Tool */}
          <button
            id="tool-photo"
            onClick={() => fileInputRef.current?.click()}
            title="Add Photo to Doodle Over"
            className={`p-2 rounded-xl transition-all ${
              isDark 
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' 
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-[#0284c7]" />
          </button>

          {/* Voice Whisper Sticker Tool */}
          <button
            id="tool-voice"
            onClick={() => {
              setShowVoiceModal(true);
              playPop();
            }}
            title="Record Voice Whisper Sticker"
            className={`p-2 rounded-xl transition-all ${
              isDark 
                ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' 
                : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" />
          </button>
        </div>

        {/* Color Palette or Stamps Picker depending on tool */}
        {tool === 'stamp' ? (
          <div className={`flex items-center gap-1 px-1 border-r pr-1.5 flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-[#ede8e1]'}`}>
            {STAMPS.map((s) => (
              <button
                key={s.icon}
                onClick={() => {
                  setSelectedStamp(s.icon);
                  playPop();
                }}
                className={`w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-transform ${
                  selectedStamp === s.icon 
                    ? (isDark ? 'scale-110 bg-zinc-800 border border-zinc-700' : 'scale-110 bg-[#fff3ef] border border-[#ffcdbc]') 
                    : (isDark ? 'hover:scale-105 hover:bg-zinc-800/60' : 'hover:scale-105 hover:bg-[#f4efe8]')
                }`}
                title={s.label}
              >
                {s.icon}
              </button>
            ))}
          </div>
        ) : (
          <div className={`flex items-center gap-1 px-1 border-r pr-1.5 flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-[#ede8e1]'}`}>
            {currentPalette.map((p) => (
              <button
                key={p.color}
                onClick={() => {
                  setSelectedColor(p.color);
                  if (tool === 'eraser') setTool('brush');
                }}
                title={p.name}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border transition-all flex-shrink-0 ${
                  selectedColor === p.color && tool !== 'eraser'
                    ? 'ring-2 ring-[#ff5722] scale-110 ring-offset-2 ring-offset-transparent'
                    : 'hover:scale-105 opacity-85 hover:opacity-100'
                } ${isDark ? 'border-white/20' : 'border-black/10'}`}
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
        )}

        {/* Brush Size Selector */}
        <div className={`flex items-center gap-0.5 border-r pr-1.5 flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-[#ede8e1]'}`}>
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setBrushSize(s);
              }}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-semibold ${
                brushSize === s
                  ? (isDark ? 'bg-[#ff5722]/20 text-[#ff784e] font-bold border border-[#ff5722]/40' : 'bg-[#fff3ef] text-[#ff5722] font-bold border border-[#ffcdbc]') 
                  : (isDark ? 'text-zinc-400 hover:bg-zinc-800' : 'text-[#71717a] hover:bg-[#f4efe8]')
              }`}
            >
              <div 
                className="rounded-full bg-current" 
                style={{ width: Math.min(14, Math.max(3, s)), height: Math.min(14, Math.max(3, s)) }}
              />
            </button>
          ))}
        </div>

        {/* Actions: Undo, Redo, Theme Toggle, Clear, Save */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            id="canvas-undo-btn"
            onClick={handleUndo}
            title="Undo"
            className={`p-1.5 rounded-xl transition-all ${
              isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="canvas-redo-btn"
            onClick={handleRedo}
            title="Redo"
            className={`p-1.5 rounded-xl transition-all ${
              isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Midnight Romance Theme Toggle */}
          <button
            id="canvas-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? "Switch to Warm Paper (Light)" : "Switch to Midnight Romance (Dark)"}
            className={`p-1.5 rounded-xl transition-all ${
              isDark 
                ? 'text-amber-300 hover:bg-amber-400/10' 
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          <button
            id="canvas-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            title="Clear Board"
            className={`p-1.5 rounded-xl transition-all ${
              isDark 
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' 
                : 'text-[#ef4444] hover:text-[#dc2626] hover:bg-[#fee2e2]'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            id="canvas-download-btn"
            onClick={handleDownload}
            title="Save Drawing"
            className={`p-1.5 rounded-xl transition-all ${
              isDark 
                ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/10' 
                : 'text-[#0284c7] hover:text-[#0369a1] hover:bg-[#e0f2fe]'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Voice Whisper Recording Modal */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-5 text-center ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-[#ede8e1] text-[#18181b]'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <div className="flex items-center gap-2 text-left">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Voice Whisper</h3>
                  <p className="text-[11px] text-zinc-500">Record a voice sticker for the board</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  stopRecording();
                  setShowVoiceModal(false);
                  setRecordedAudioBlob(null);
                  setPreviewUrl(null);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Recorder Circle / Timer Display */}
            <div className="py-2 flex flex-col items-center justify-center space-y-3">
              {!recordedAudioBlob ? (
                <>
                  <div className="relative">
                    {isRecording && (
                      <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                        isRecording 
                          ? 'bg-red-600 text-white shadow-red-500/40 scale-105' 
                          : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30'
                      }`}
                    >
                      {isRecording ? <Square className="w-7 h-7 fill-white" /> : <Mic className="w-8 h-8" />}
                    </button>
                  </div>
                  <div>
                    <p className="text-xl font-bold font-mono tracking-wider text-rose-500">
                      0:{String(recordingSeconds).padStart(2, '0')} <span className="text-xs text-zinc-400 font-sans font-normal">/ 0:15</span>
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {isRecording ? 'Listening to your whisper… tap to finish' : 'Tap mic to start recording (up to 15s)'}
                    </p>
                  </div>
                </>
              ) : (
                /* Audio Preview Card */
                <div className={`w-full p-4 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#fbf9f6] border-[#ede8e1]'
                }`}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={togglePreviewPlay}
                      className="w-10 h-10 rounded-full bg-[#ff5722] hover:bg-[#f4511e] text-white flex items-center justify-center shadow-sm"
                    >
                      {isPlayingPreview ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>
                    <div className="flex-1 mx-3 text-left">
                      <p className="text-xs font-bold text-inherit">Voice Preview</p>
                      <p className="text-[11px] text-zinc-500">Duration: 0:{String(recordingSeconds).padStart(2, '0')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordedAudioBlob(null);
                        setPreviewUrl(null);
                        setRecordingSeconds(0);
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-black/5"
                      title="Re-record"
                    >
                      <ResetIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  stopRecording();
                  setShowVoiceModal(false);
                  setRecordedAudioBlob(null);
                  setPreviewUrl(null);
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-[#f4efe8] text-zinc-700 hover:bg-[#ede8e1]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPinVoice}
                disabled={!recordedAudioBlob || isUploadingPhoto}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Pinning...</span>
                  </>
                ) : (
                  <span>Pin on Canvas 🎙️💖</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Placement Modal */}
      {showPhotoModal && pendingPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border space-y-4 ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-[#ede8e1] text-[#18181b]'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-inherit">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#fff3ef] text-[#ff5722] flex items-center justify-center">
                  <ImagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Doodle on Photo</h3>
                  <p className="text-[11px] text-zinc-500">Draw together over memories</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowPhotoModal(false); setPendingPhoto(null); }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black/5 flex items-center justify-center max-h-52 border border-inherit">
              <img 
                src={pendingPhoto.url} 
                alt="Selected preview" 
                className="max-h-52 w-auto object-contain rounded-xl"
              />
            </div>

            {/* Placement Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Style</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoMode('polaroid')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    photoMode === 'polaroid' 
                      ? 'bg-[#ff5722]/10 border-[#ff5722] text-[#ff5722]' 
                      : (isDark ? 'border-zinc-800 hover:bg-zinc-800' : 'border-[#ede8e1] hover:bg-[#f4efe8]')
                  }`}
                >
                  <span>📷 Polaroid Card</span>
                  <span className="text-[10px] font-normal opacity-75">Card with caption</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPhotoMode('backdrop')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                    photoMode === 'backdrop' 
                      ? 'bg-[#ff5722]/10 border-[#ff5722] text-[#ff5722]' 
                      : (isDark ? 'border-zinc-800 hover:bg-zinc-800' : 'border-[#ede8e1] hover:bg-[#f4efe8]')
                  }`}
                >
                  <span>🖼️ Canvas Backdrop</span>
                  <span className="text-[10px] font-normal opacity-75">Full board backdrop</span>
                </button>
              </div>
            </div>

            {/* Optional Caption for Polaroid */}
            {photoMode === 'polaroid' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Polaroid Caption (Optional)</label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value.slice(0, 45))}
                  placeholder="e.g. Our date night ❤️"
                  className={`w-full text-xs p-2.5 rounded-xl border focus:outline-none focus:border-[#ff5722] transition-colors ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600' : 'bg-[#fbf9f6] border-[#ede8e1] text-[#18181b] placeholder:text-zinc-400'
                  }`}
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setShowPhotoModal(false); setPendingPhoto(null); }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-[#f4efe8] text-zinc-700 hover:bg-[#ede8e1]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddPhoto}
                disabled={isUploadingPhoto}
                className="flex-1 py-2.5 rounded-xl bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-50 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Placing...</span>
                  </>
                ) : (
                  <span>Place on Board 💖</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom In-App Clear Board Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className={`w-full max-w-sm rounded-3xl p-6 shadow-2xl border space-y-4 ${
            isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-100' : 'bg-white border-[#ede8e1] text-zinc-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center border border-red-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Clear Canvas?</h3>
                <p className="text-xs text-zinc-500">This will clear the drawing, photos, and voice whispers for both of you.</p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-[#f4efe8] text-zinc-800 hover:bg-[#ede8e1]'
                }`}
              >
                Keep Drawing
              </button>
              <button
                onClick={confirmClearCanvas}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                Clear for Both
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
