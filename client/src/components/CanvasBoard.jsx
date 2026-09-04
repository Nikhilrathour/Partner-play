import React, { useRef, useEffect, useState, useCallback } from 'react';
import { socket } from '../services/socket';
import { 
  Paintbrush, 
  Sparkles, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Download, 
  Highlighter, 
  Heart, 
  Smile, 
  MousePointer2 
} from 'lucide-react';

const PALETTE = [
  { name: 'Coral', color: '#ff5722' },
  { name: 'Charcoal', color: '#18181b' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Purple', color: '#7c3aed' },
  { name: 'Sky', color: '#0284c7' },
  { name: 'Emerald', color: '#059669' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Slate', color: '#94a3b8' },
];

const SIZES = [2, 4, 8, 14, 24];

const STAMPS = [
  { icon: '❤️', label: 'Heart' },
  { icon: '✨', label: 'Sparkle' },
  { icon: '💖', label: 'Sparkling Heart' },
  { icon: '💌', label: 'Love Letter' },
  { icon: '🌹', label: 'Rose' },
  { icon: '⭐', label: 'Star' },
];

export default function CanvasBoard({ room, user, isActive = true }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const strokeHistoryRef = useRef([]);

  // Active tool settings
  const [tool, setTool] = useState('brush'); // 'brush' | 'glow' | 'highlighter' | 'eraser' | 'stamp'
  const [selectedColor, setSelectedColor] = useState('#ff5722');
  const [brushSize, setBrushSize] = useState(4);
  const [selectedStamp, setSelectedStamp] = useState('❤️');

  // Partner live cursor
  const [partnerCursor, setPartnerCursor] = useState(null);
  const partnerCursorTimerRef = useRef(null);

  // Redraw all strokes from normalized history
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background texture grid dots
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    const dotSpacing = 28;
    for (let x = 14; x < width; x += dotSpacing) {
      for (let y = 14; y < height; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Render strokes
    strokeHistoryRef.current.forEach((stroke) => {
      renderSingleStroke(ctx, stroke, width, height);
    });
  }, []);

  // Helper to render one stroke (normalized -> canvas pixels)
  const renderSingleStroke = (ctx, stroke, width, height) => {
    if (!stroke) return;

    if (stroke.type === 'stamp') {
      const x = stroke.x * width;
      const y = stroke.y * height;
      ctx.save();
      ctx.font = `${stroke.size * 5 + 20}px 'Segoe UI Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(stroke.stamp, x, y);
      ctx.restore();
      return;
    }

    if (!stroke.points || stroke.points.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const actualWidth = Math.max(1, stroke.width * (width / 800));

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
      ctx.shadowBlur = 14;
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
  };

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
        const imageBase64 = canvas.toDataURL('image/png', 0.85);
        fetch(`/api/room/${room.code}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            authorName: user?.name || 'Partner',
          }),
        }).catch(() => {});
      } catch (err) {
        // Safe catch for canvas read errors
      }
    }, 750);
  }, [room?.code, user?.name]);

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
    if (room && room.canvasState) {
      strokeHistoryRef.current = [...room.canvasState];
      redrawCanvas();
      if (room.canvasState.length > 0) {
        scheduleWidgetSnapshot();
      }
    }
  }, [room, redrawCanvas, scheduleWidgetSnapshot]);

  // Socket listeners for partner canvas events
  useEffect(() => {
    const onIncomingStroke = (strokeData) => {
      strokeHistoryRef.current.push(strokeData);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        renderSingleStroke(ctx, strokeData, canvas.width, canvas.height);
      }
      scheduleWidgetSnapshot();
    };

    const onIncomingClear = () => {
      strokeHistoryRef.current = [];
      const canvas = canvasRef.current;
      if (canvas) {
        redrawCanvas();
      }
      scheduleWidgetSnapshot();
    };

    const onIncomingHistory = (newHistory) => {
      strokeHistoryRef.current = newHistory || [];
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
  }, [redrawCanvas, scheduleWidgetSnapshot]);

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
      const canvas = canvasRef.current;
      if (canvas) {
        renderSingleStroke(canvas.getContext('2d'), stampStroke, canvas.width, canvas.height);
      }
      socket.emit('canvas:stroke', stampStroke);
      scheduleWidgetSnapshot();
      return;
    }

    isDrawingRef.current = true;
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
    const actualWidth = Math.max(1, currentStrokeRef.current.width * (width / 800));

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
      ctx.shadowBlur = 14;
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
    socket.emit('canvas:undo');
    scheduleWidgetSnapshot();
  };

  // Clear Canvas
  const handleClear = () => {
    if (window.confirm('Clear canvas for both you and your partner?')) {
      strokeHistoryRef.current = [];
      redrawCanvas();
      socket.emit('canvas:clear');
      scheduleWidgetSnapshot();
    }
  };

  // Download drawing
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a composite export with clean studio background
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext('2d');

    // Fill background
    expCtx.fillStyle = '#fbf9f6';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw canvas image
    expCtx.drawImage(canvas, 0, 0);

    // Add watermark
    expCtx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    expCtx.fillStyle = '#ff5722';
    expCtx.textAlign = 'right';
    expCtx.fillText('Created together on Duo Studio • Partner Play 🧡', exportCanvas.width - 20, exportCanvas.height - 20);

    const link = document.createElement('a');
    link.download = `partner-play-studio-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="relative flex-1 flex flex-col h-full overflow-hidden select-none bg-[#fbf9f6]">
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
                className="px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-md bg-white border border-[#ede8e1] whitespace-nowrap text-[#18181b]"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: partnerCursor.color || '#ff5722' }} />
                {partnerCursor.userName} {partnerCursor.isDrawing ? '✏️' : ''}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Canvas Toolbar (Mobile-first responsive pill with smooth scroll) */}
      <div className="absolute bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-16px)] max-w-xl flex items-center justify-start sm:justify-center gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-[#ede8e1] overflow-x-auto no-scrollbar transition-all">
        {/* Tool Selectors */}
        <div className="flex items-center gap-0.5 border-r border-[#ede8e1] pr-1.5 flex-shrink-0">
          <button
            id="tool-brush"
            onClick={() => setTool('brush')}
            title="Standard Brush"
            className={`p-2 rounded-xl transition-all ${
              tool === 'brush' ? 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <Paintbrush className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-glow"
            onClick={() => setTool('glow')}
            title="Neon Glow Pen"
            className={`p-2 rounded-xl transition-all ${
              tool === 'glow' ? 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-highlighter"
            onClick={() => setTool('highlighter')}
            title="Soft Highlighter"
            className={`p-2 rounded-xl transition-all ${
              tool === 'highlighter' ? 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <Highlighter className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-eraser"
            onClick={() => setTool('eraser')}
            title="Eraser"
            className={`p-2 rounded-xl transition-all ${
              tool === 'eraser' ? 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="tool-stamp"
            onClick={() => setTool('stamp')}
            title="Love Stamp / Stickers"
            className={`p-2 rounded-xl transition-all ${
              tool === 'stamp' ? 'bg-[#fff3ef] text-[#ff5722] border border-[#ffcdbc]' : 'text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8]'
            }`}
          >
            <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Color Palette or Stamps Picker depending on tool */}
        {tool === 'stamp' ? (
          <div className="flex items-center gap-1 px-1 border-r border-[#ede8e1] pr-1.5 flex-shrink-0">
            {STAMPS.map((s) => (
              <button
                key={s.icon}
                onClick={() => setSelectedStamp(s.icon)}
                className={`w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-transform ${
                  selectedStamp === s.icon ? 'scale-110 bg-[#fff3ef] border border-[#ffcdbc]' : 'hover:scale-105 hover:bg-[#f4efe8]'
                }`}
                title={s.label}
              >
                {s.icon}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1 px-1 border-r border-[#ede8e1] pr-1.5 flex-shrink-0">
            {PALETTE.map((p) => (
              <button
                key={p.color}
                onClick={() => {
                  setSelectedColor(p.color);
                  if (tool === 'eraser') setTool('brush');
                }}
                title={p.name}
                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-black/10 transition-all flex-shrink-0 ${
                  selectedColor === p.color && tool !== 'eraser'
                    ? 'ring-2 ring-[#ff5722] scale-110 ring-offset-2'
                    : 'hover:scale-105 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
        )}

        {/* Brush Size Selector */}
        <div className="flex items-center gap-0.5 border-r border-[#ede8e1] pr-1.5 flex-shrink-0">
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-semibold ${
                brushSize === s ? 'bg-[#fff3ef] text-[#ff5722] font-bold border border-[#ffcdbc]' : 'text-[#71717a] hover:bg-[#f4efe8]'
              }`}
            >
              <div 
                className="rounded-full bg-current" 
                style={{ width: Math.min(14, Math.max(3, s)), height: Math.min(14, Math.max(3, s)) }}
              />
            </button>
          ))}
        </div>

        {/* Actions: Undo, Clear, Save */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            id="canvas-undo-btn"
            onClick={handleUndo}
            title="Undo"
            className="p-1.5 text-[#71717a] hover:text-[#18181b] hover:bg-[#f4efe8] rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="canvas-clear-btn"
            onClick={handleClear}
            title="Clear Board"
            className="p-1.5 text-[#ef4444] hover:text-[#dc2626] hover:bg-[#fee2e2] rounded-xl transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            id="canvas-download-btn"
            onClick={handleDownload}
            title="Save Drawing"
            className="p-1.5 text-[#0284c7] hover:text-[#0369a1] hover:bg-[#e0f2fe] rounded-xl transition-all"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
