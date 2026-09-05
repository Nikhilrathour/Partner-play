const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: 'Bad Request', details: err.message });
  }
  next();
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// In-memory room store
const rooms = new Map();

// In-memory widget thumbnail store (code -> { buffer, updatedAt, authorName })
const roomThumbnails = new Map();

// 1x1 transparent PNG fallback if room has no drawing yet
const DEFAULT_PLACEHOLDER_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

// Helper to generate a 6-character room code (e.g. "LOVE99", "HEART8")
const PREFIXES = ['LOVE', 'DUO', 'TWIN', 'SOUL', 'PAIR', 'MINT', 'PEACH', 'STAR'];
function generateRoomCode() {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const num = Math.floor(10 + Math.random() * 90);
  const code = `${prefix}${num}`;
  if (rooms.has(code)) {
    return generateRoomCode();
  }
  return code;
}

// REST health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    roomCodes: Array.from(rooms.keys()),
    timestamp: Date.now(),
  });
});

app.get('/api/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({
    code: room.code,
    memberCount: room.members.length,
    currentTrack: room.currentTrack,
  });
});

// REST failsafe for mobile apps: create room via HTTP
app.post('/api/room/create', (req, res) => {
  const { userName, userColor, requestedCode } = req.body;
  const code = (requestedCode && requestedCode.trim())
    ? requestedCode.trim().toUpperCase()
    : generateRoomCode();

  if (rooms.has(code)) {
    return res.status(400).json({ success: false, error: 'Room code already exists. Please join it or choose another.' });
  }

  const newUser = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: userName || 'Partner 1',
    color: userColor || '#ff5722',
    isHost: true,
    joinedAt: Date.now(),
  };

  const newRoom = {
    code,
    createdAt: Date.now(),
    members: [newUser],
    canvasState: [],
    currentTrack: {
      source: 'ambient',
      id: 'ambient_1',
      title: 'Midnight Lo-Fi Romance',
      artist: 'Couple Beats',
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      isPlaying: false,
      currentTime: 0,
      lastUpdated: Date.now(),
    },
    notes: [],
  };

  rooms.set(code, newRoom);
  return res.json({
    success: true,
    room: {
      code: newRoom.code,
      user: newUser,
      members: newRoom.members,
      canvasState: newRoom.canvasState,
      currentTrack: newRoom.currentTrack,
      notes: newRoom.notes,
    },
  });
});

// REST failsafe for mobile apps: join room via HTTP
app.post('/api/room/join', (req, res) => {
  const { code, userName, userColor } = req.body;
  const formattedCode = (code || '').trim().toUpperCase();
  let room = rooms.get(formattedCode);

  if (!room) {
    room = {
      code: formattedCode,
      createdAt: Date.now(),
      members: [],
      canvasState: [],
      currentTrack: {
        source: 'ambient',
        id: 'ambient_1',
        title: 'Midnight Lo-Fi Romance',
        artist: 'Couple Beats',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        isPlaying: false,
        currentTime: 0,
        lastUpdated: Date.now(),
      },
      notes: [],
    };
    rooms.set(formattedCode, room);
  }

  const trimmedName = (userName || '').trim();
  const existingIndex = room.members.findIndex(m => trimmedName && m.name.toLowerCase() === trimmedName.toLowerCase());
  let newUser;

  if (existingIndex !== -1) {
    newUser = {
      ...room.members[existingIndex],
      color: userColor || room.members[existingIndex].color,
    };
    room.members[existingIndex] = newUser;
  } else {
    newUser = {
      id: 'user_' + Math.random().toString(36).substring(2, 9),
      name: trimmedName || `Partner ${room.members.length + 1}`,
      color: userColor || (room.members.length === 1 ? '#7c3aed' : '#0284c7'),
      isHost: room.members.length === 0,
      joinedAt: Date.now(),
    };
    room.members.push(newUser);
  }

  return res.json({
    success: true,
    room: {
      code: room.code,
      user: newUser,
      members: room.members,
      canvasState: room.canvasState,
      currentTrack: room.currentTrack,
      notes: room.notes,
    },
  });
});

// Widget Snapshot Receiver: Client pushes rendered canvas PNG
app.post('/api/room/:code/snapshot', (req, res) => {
  const code = req.params.code.toUpperCase();
  const { imageBase64, authorName } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'Missing imageBase64 data' });
  }

  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    roomThumbnails.set(code, {
      buffer: imageBuffer,
      updatedAt: Date.now(),
      authorName: authorName || 'Partner',
    });

    return res.json({ success: true, code, updatedAt: Date.now() });
  } catch (err) {
    console.error('Error saving snapshot:', err);
    return res.status(500).json({ error: 'Failed to process snapshot' });
  }
});

// Android Widget PNG endpoint: Directly returns the crisp PNG image
app.get('/api/room/:code/widget.png', (req, res) => {
  const code = req.params.code.toUpperCase();
  const thumbnail = roomThumbnails.get(code);

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'image/png');

  if (thumbnail && thumbnail.buffer) {
    return res.send(thumbnail.buffer);
  }

  // If no snapshot yet, return default placeholder
  return res.send(DEFAULT_PLACEHOLDER_PNG);
});

// Android Widget JSON Metadata endpoint
app.get('/api/room/:code/widget.json', (req, res) => {
  const code = req.params.code.toUpperCase();
  const thumbnail = roomThumbnails.get(code);
  const room = rooms.get(code);

  return res.json({
    code,
    hasDrawing: !!thumbnail,
    updatedAt: thumbnail ? thumbnail.updatedAt : null,
    authorName: thumbnail ? thumbnail.authorName : null,
    memberCount: room ? room.members.length : 0,
  });
});

// Serve client dist static files
const path = require('path');
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));


io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUser = null;

  // Heartbeat / ping for latency measurement
  socket.on('latency:ping', (timestamp) => {
    socket.emit('latency:pong', timestamp);
  });

  // Create room
  socket.on('room:create', ({ userName, userColor, requestedCode }, callback) => {
    const code = (requestedCode && requestedCode.trim())
      ? requestedCode.trim().toUpperCase()
      : generateRoomCode();

    if (rooms.has(code)) {
      if (typeof callback === 'function') {
        return callback({ success: false, error: 'Room code already exists. Please join it or choose another.' });
      }
      return;
    }

    const newUser = {
      id: socket.id,
      name: userName || 'Partner 1',
      color: userColor || '#ff4081',
      isHost: true,
      joinedAt: Date.now(),
    };

    const newRoom = {
      code,
      createdAt: Date.now(),
      members: [newUser],
      canvasState: [], // stroke history
      currentTrack: {
        source: 'ambient',
        id: 'lofi_romance',
        title: 'Midnight Lo-fi & Rain',
        artist: 'Couple Beats',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        isPlaying: false,
        currentTime: 0,
        lastUpdated: Date.now(),
      },
      notes: [],
    };

    rooms.set(code, newRoom);
    socket.join(code);
    currentRoomCode = code;
    currentUser = newUser;

    if (typeof callback === 'function') {
      callback({
        success: true,
        room: {
          code: newRoom.code,
          user: newUser,
          members: newRoom.members,
          canvasState: newRoom.canvasState,
          currentTrack: newRoom.currentTrack,
          notes: newRoom.notes,
        },
      });
    }
  });

  // Join room
  socket.on('room:join', ({ code, userName, userColor }, callback) => {
    const formattedCode = (code || '').trim().toUpperCase();
    let room = rooms.get(formattedCode);

    if (!room) {
      // Auto-rehydrate persistent studio for returning couple
      room = {
        code: formattedCode,
        createdAt: Date.now(),
        members: [],
        canvasState: [],
        currentTrack: {
          source: 'ambient',
          id: 'ambient_1',
          title: 'Midnight Lo-Fi Romance',
          artist: 'Couple Beats',
          url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
          isPlaying: false,
          currentTime: 0,
          lastUpdated: Date.now(),
        },
        notes: [],
      };
      rooms.set(formattedCode, room);
    }

    if (room.members.length >= 6) {
      // Allow up to 6 for group couples / friends, but works primarily 1:1
      if (typeof callback === 'function') {
        return callback({ success: false, error: 'Room is at maximum capacity.' });
      }
      return;
    }

    const trimmedName = (userName || '').trim();
    const existingIndex = room.members.findIndex(
      (m) => (trimmedName && m.name.toLowerCase() === trimmedName.toLowerCase()) || m.id === socket.id
    );
    let newUser;

    if (existingIndex !== -1) {
      newUser = {
        ...room.members[existingIndex],
        id: socket.id,
        color: userColor || room.members[existingIndex].color,
      };
      room.members[existingIndex] = newUser;
    } else {
      newUser = {
        id: socket.id,
        name: trimmedName || `Partner ${room.members.length + 1}`,
        color: userColor || (room.members.length === 1 ? '#a855f7' : '#38bdf8'),
        isHost: room.members.length === 0,
        joinedAt: Date.now(),
      };
      room.members.push(newUser);
    }

    socket.join(formattedCode);
    currentRoomCode = formattedCode;
    currentUser = newUser;

    // Calculate current live playhead for audio
    const now = Date.now();
    let computedTime = room.currentTrack.currentTime;
    if (room.currentTrack.isPlaying) {
      computedTime += (now - room.currentTrack.lastUpdated) / 1000;
    }

    const initialSyncTrack = {
      ...room.currentTrack,
      currentTime: computedTime,
      sentAt: now,
    };

    // Notify others in room
    socket.to(formattedCode).emit('room:partner_joined', {
      user: newUser,
      members: room.members,
    });

    if (typeof callback === 'function') {
      callback({
        success: true,
        room: {
          code: room.code,
          user: newUser,
          members: room.members,
          canvasState: room.canvasState,
          currentTrack: initialSyncTrack,
          notes: room.notes,
        },
      });
    }
  });

  // Canvas: Stroke stream (batch or individual)
  socket.on('canvas:stroke', (strokeData) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    // Append to canvas history
    room.canvasState.push(strokeData);

    // Limit history length to prevent memory overload (last 1500 strokes)
    if (room.canvasState.length > 1500) {
      room.canvasState.shift();
    }

    // Broadcast stroke immediately to partner
    socket.to(currentRoomCode).emit('canvas:stroke', strokeData);
  });

  // Canvas: Clear
  socket.on('canvas:clear', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.canvasState = [];
    socket.to(currentRoomCode).emit('canvas:clear', { clearedBy: currentUser?.name });
  });

  // Canvas: Undo
  socket.on('canvas:undo', () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.canvasState.length === 0) return;

    // Remove the last stroke authored by anyone or this user
    room.canvasState.pop();
    io.in(currentRoomCode).emit('canvas:history_sync', room.canvasState);
  });

  // Canvas: Request full history sync (on mount or mobile reconnect)
  socket.on('canvas:request_sync', (callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    if (typeof callback === 'function') {
      callback({
        success: true,
        canvasState: room.canvasState || [],
        timestamp: Date.now(),
      });
    } else {
      socket.emit('canvas:history_sync', room.canvasState || []);
    }
  });

  // Live cursor position (normalized 0.0 - 1.0)
  socket.on('cursor:move', (position) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('cursor:move', {
      userId: socket.id,
      userName: currentUser?.name || 'Partner',
      color: currentUser?.color || '#ff4081',
      x: position.x,
      y: position.y,
      isDrawing: !!position.isDrawing,
    });
  });

  // Synchronized Audio Playback
  socket.on('audio:sync', (data) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const now = Date.now();
    const { action, track, currentTime } = data;

    // Update room audio state
    if (track) {
      room.currentTrack.source = track.source || room.currentTrack.source;
      room.currentTrack.id = track.id || room.currentTrack.id;
      room.currentTrack.title = track.title || room.currentTrack.title;
      room.currentTrack.artist = track.artist || room.currentTrack.artist;
      room.currentTrack.url = track.url || room.currentTrack.url;
    }

    if (action === 'play') {
      room.currentTrack.isPlaying = true;
      room.currentTrack.currentTime = typeof currentTime === 'number' ? currentTime : room.currentTrack.currentTime;
      room.currentTrack.lastUpdated = now;
    } else if (action === 'pause') {
      room.currentTrack.isPlaying = false;
      room.currentTrack.currentTime = typeof currentTime === 'number' ? currentTime : room.currentTrack.currentTime;
      room.currentTrack.lastUpdated = now;
    } else if (action === 'seek') {
      room.currentTrack.currentTime = currentTime;
      room.currentTrack.lastUpdated = now;
    } else if (action === 'change_track') {
      room.currentTrack.isPlaying = true;
      room.currentTrack.currentTime = 0;
      room.currentTrack.lastUpdated = now;
    }

    // Broadcast sync event to partner with server timestamp
    socket.to(currentRoomCode).emit('audio:sync', {
      action,
      track: room.currentTrack,
      currentTime: room.currentTrack.currentTime,
      isPlaying: room.currentTrack.isPlaying,
      sentAt: now,
      initiatedBy: currentUser?.name || data.initiatedBy || 'Your partner',
      triggeredBy: currentUser?.name || data.initiatedBy || 'Your partner',
    });
  });

  // Request latest playhead
  socket.on('audio:request_sync', (callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const now = Date.now();
    let computedTime = room.currentTrack.currentTime;
    if (room.currentTrack.isPlaying) {
      computedTime += (now - room.currentTrack.lastUpdated) / 1000;
    }

    if (typeof callback === 'function') {
      callback({
        ...room.currentTrack,
        currentTime: computedTime,
        sentAt: now,
      });
    }
  });

  // Floating live reactions (hearts, sparkles, etc.)
  socket.on('reaction:send', ({ emoji, x, y }) => {
    if (!currentRoomCode) return;
    socket.to(currentRoomCode).emit('reaction:send', {
      emoji,
      x: typeof x === 'number' ? x : 0.5,
      y: typeof y === 'number' ? y : 0.5,
      sender: currentUser?.name || 'Partner',
      color: currentUser?.color || '#ff4081',
      id: Math.random().toString(36).substring(2, 9),
    });
  });

  // Shared whisper notes
  socket.on('note:add', ({ text, color, x, y }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    const note = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      author: currentUser?.name || 'Partner',
      color: color || '#fef08a',
      timestamp: Date.now(),
      x: x || 50,
      y: y || 50,
    };

    room.notes.push(note);
    io.in(currentRoomCode).emit('note:added', note);
  });

  socket.on('note:delete', (noteId) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;

    room.notes = room.notes.filter((n) => n.id !== noteId);
    io.in(currentRoomCode).emit('note:deleted', noteId);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (currentRoomCode) {
      const room = rooms.get(currentRoomCode);
      if (room) {
        room.members = room.members.filter((m) => m.id !== socket.id);

        if (room.members.length === 0) {
          // Keep couple studio persistent for 7 days even if both partners close the app
          setTimeout(() => {
            const r = rooms.get(currentRoomCode);
            if (r && r.members.length === 0) {
              rooms.delete(currentRoomCode);
            }
          }, 7 * 24 * 60 * 60 * 1000);
        } else {
          socket.to(currentRoomCode).emit('room:partner_left', {
            userId: socket.id,
            userName: currentUser?.name,
            members: room.members,
          });
        }
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Nikhana Play Server] running on http://0.0.0.0:${PORT}`);
});
