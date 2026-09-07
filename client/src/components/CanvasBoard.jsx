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
  Loader2
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

export default function CanvasBoard({ room, user, isActive = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const strokeHistoryRef = useRef([]);
  const redoStackRef = useRef([]);
  const initializedRoomRef = useRef(null);

  // Theme: 'light' (Warm Paper #fbf9f6) vs 'midnight' (Dark Obsidian #121216)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('partner_canvas_theme') || 'light';
    }
    return 'light';
  });
  const isDark = theme === 'midnight';
  const currentPalette = isDark ? MIDNIGHT_PALETTE : LIGHT_PALETTE;

  // Active tool settings
  const [tool, setTool] = useState('brush'); // 'brush' | 'glow' | 'highlighter' | 'eraser' | 'stamp'
  const [selectedColor, setSelectedColor] = useState('#ff5722');
  const [brushSize, setBrushSize] = useState(8); // Default medium/slightly large
  const [selectedStamp, setSelectedStamp] = useState('❤️');

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
  const [pendingPhoto, setPendingPhoto] = useState(null); // { url, aspectRatio, fileName, width, height }
  const [photoMode, setPhotoMode] = useState('polaroid'); // 'polaroid' | 'backdrop'
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

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

    // 1. Photo Stroke (Polaroid or Backdrop)
    if (stroke.type === 'photo') {
      const img = getLoadedImage(stroke.url);
      const aspect = stroke.aspectRatio || 1;

      if (stroke.mode === 'backdrop') {
        // Full Canvas Backdrop Mode: fits nicely inside canvas with margins
        const maxW = width * 0.92;
        const maxH = height * 0.88;
        let drawW = maxW;
        let drawH = drawW / aspect;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * aspect;
        }
        const startX = (width - drawW) / 2;
        const startY = (height - drawH) / 2;

        ctx.save();
        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.16)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;

        if (img) {
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(startX, startY, drawW, drawH, 16);
          } else {
            ctx.rect(startX, startY, drawW, drawH);
          }
          ctx.clip();
          ctx.drawImage(img, startX, startY, drawW, drawH);
        } else {
          // Placeholder while image is loading
          ctx.fillStyle = isDark ? '#1f1f28' : '#ede8e1';
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(startX, startY, drawW, drawH, 16);
          else ctx.rect(startX, startY, drawW, drawH);
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      // Default: Polaroid Memory Card Mode
      const cardW = Math.min(width * 0.55, Math.max(210, width * 0.38));
      const photoW = cardW - 22;
      const photoH = Math.max(90, Math.min(height * 0.52, photoW / aspect));
      const bottomChin = stroke.caption ? 44 : 32;
      const cardH = photoH + 22 + bottomChin;

      const centerX = (stroke.x || 0.5) * width;
      const centerY = (stroke.y || 0.5) * height;
      const cardX = centerX - cardW / 2;
      const cardY = centerY - cardH / 2;

      ctx.save();
      // Drop shadow
      ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.18)';
      ctx.shadowBlur = isDark ? 24 : 16;
      ctx.shadowOffsetY = 6;

      // Polaroid white card background
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();
      ctx.restore();

      // Photo inside card
      ctx.save();
      const photoX = cardX + 11;
      const photoY = cardY + 11;

      if (img) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(photoX, photoY, photoW, photoH, 4);
        else ctx.rect(photoX, photoY, photoW, photoH);
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoW, photoH);
      } else {
        // Loading placeholder
        ctx.fillStyle = '#f4efe8';
        ctx.fillRect(photoX, photoY, photoW, photoH);
      }
      ctx.restore();

      // Photo inner border
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(photoX, photoY, photoW, photoH);

      // Cute pin / heart on top
      ctx.font = '14px "Segoe UI Emoji", Apple Color Emoji, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📌', centerX, cardY + 7);

      // Handwritten caption at bottom chin
      if (stroke.caption) {
        ctx.font = '600 13px "Caveat", "Indie Flower", cursive, sans-serif';
        ctx.fillStyle = '#44403c';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stroke.caption, centerX, cardY + 11 + photoH + bottomChin / 2);
      }
      ctx.restore();
      return;
    }

    // 2. Love Stamp
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

    // 3. Vector Path (Brush, Neon Glow, Highlighter, Eraser)
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
      // Normal brush
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
  }, [getLoadedImage, isDark]);

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
        // Create composite snapshot with current theme background
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
    socket.on('cursor:move', onPartnerCursor);

    return () => {
      socket.off('canvas:stroke', onIncomingStroke);
      socket.off('canvas:clear', onIncomingClear);
      socket.off('canvas:history_sync', onIncomingHistory);
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

  // Pointer Down (Start stroke or stamp)
  const handlePointerDown = (e) => {
    e.preventDefault();
    const { x, y } = getNormalizedCoordinates(e);

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
      const canvas = canvasRef.current;
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

  // Pointer Move (Collect points and draw live)
  const handlePointerMove = (e) => {
    const { x, y } = getNormalizedCoordinates(e);

    // Throttle cursor broadcast
    socket.emit('cursor:move', { x, y, isDrawing: isDrawingRef.current });

    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    currentStrokeRef.current.points.push({ x, y });

    // Immediate local render of new segment
    const canvas = canvasRef.current;
    if (!canvas) return;
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

  // Pointer Up (Finalize stroke and emit to partner)
  const handlePointerUp = () => {
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

    // Create a composite export with clean studio background
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

  // --- Photo Upload & Doodle on Photos ---
  const handlePhotoFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        // Compress image using offscreen canvas to max 1280px dimension
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
    e.target.value = ''; // Reset input so same file can be selected again
  };

  const handleConfirmAddPhoto = async () => {
    if (!pendingPhoto) return;
    setIsUploadingPhoto(true);

    let finalImageUrl = pendingPhoto.url;

    // Upload to server for low-latency partner sync & persistence
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

    setDownloadToast('Photo placed! You can both doodle over it now 📸');
    setTimeout(() => setDownloadToast(null), 3500);
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
        className="relative flex-1 w-full h-full cursor-crosshair overflow-hidden touch-none"
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
              <span>Draw, add photos, or place stamps together in real-time</span>
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
                  isDark ? 'bg-[#1c1c24] border border-zinc-700 text-zinc-100' : 'bg-white border border-[#ede8e1] text-[#18181b]'
                }`}
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: partnerCursor.color || '#ff5722' }} />
                {partnerCursor.userName} {partnerCursor.isDrawing ? '✏️' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Toolbar (Mobile-first responsive pill with smooth scroll & safe area) */}
      <div className={`absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-16px)] max-w-2xl flex items-center justify-start sm:justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl shadow-xl transition-all overflow-x-auto no-scrollbar ${
        isDark 
          ? 'bg-[#18181b]/95 border border-zinc-800 text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
          : 'bg-white border border-[#ede8e1] text-[#18181b] shadow-[0_4px_24px_rgba(0,0,0,0.08)]'
      }`}>
        {/* Tool Selectors */}
        <div className={`flex items-center gap-0.5 border-r pr-1.5 flex-shrink-0 ${isDark ? 'border-zinc-800' : 'border-[#ede8e1]'}`}>
          <button
            id="tool-brush"
            onClick={() => setTool('brush')}
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
            onClick={() => setTool('glow')}
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
            onClick={() => setTool('highlighter')}
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
            onClick={() => setTool('eraser')}
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
            onClick={() => setTool('stamp')}
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
            title="Doodle on Photo (Polaroid / Backdrop)"
            className={`p-2 rounded-xl transition-all ${
              isDark 
                ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80' 
                : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <ImagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-[#0284c7]" />
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
              onClick={() => setBrushSize(s)}
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

        {/* Actions: Undo, Redo, Clear, Theme Toggle, Save */}
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
                  <span className="text-[10px] font-normal opacity-75">Full board doodle</span>
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
                <p className="text-xs text-zinc-500">This will clear the drawing and photos for both of you.</p>
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
