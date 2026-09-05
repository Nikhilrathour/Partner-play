import { io } from 'socket.io-client';

export const DEFAULT_SERVER_URL = 'https://love.getfuckingclients.com';

export function getCustomServerUrl() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('partner_play_server_url') || '';
}

export function setCustomServerUrl(url) {
  if (typeof window === 'undefined') return;
  if (!url || !url.trim()) {
    localStorage.removeItem('partner_play_server_url');
  } else {
    let clean = url.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    localStorage.setItem('partner_play_server_url', clean);
  }
  window.location.reload();
}

export function getServerUrl() {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('partner_play_server_url');
    if (custom && custom.trim()) {
      if (custom.includes('localhost') || custom.includes('127.0.0.1')) {
        localStorage.removeItem('partner_play_server_url');
      } else {
        return custom.trim();
      }
    }
  }
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    // If opened on production domain, use the current origin
    if (window.location.hostname === 'love.getfuckingclients.com') {
      return window.location.origin;
    }
  }
  // All clients (Android APK, mobile browser, local Vite preview, etc.) connect to the live studio server
  return DEFAULT_SERVER_URL;
}

// Resilient Socket.io client: start with HTTP long-polling for instant mobile connectivity,
// then smoothly upgrade to WebSocket
export const socket = io(getServerUrl(), {
  autoConnect: true,
  transports: ['polling', 'websocket'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

export function getPersistentUserId() {
  if (typeof window === 'undefined') return 'user_temp';
  let id = localStorage.getItem('nikhana_play_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('nikhana_play_user_id', id);
  }
  return id;
}

// Helper for room creation with 4-second socket timeout + resilient HTTP REST fallback
export async function socketCreateRoom(userName, userColor, requestedCode) {
  if (!socket.connected) {
    socket.connect();
  }

  const userId = getPersistentUserId();

  // 1. Try Socket.io first
  const socketPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('SOCKET_TIMEOUT'));
    }, 4000);

    socket.emit('room:create', { userName, userColor, requestedCode, userId }, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });

  try {
    return await socketPromise;
  } catch (err) {
    // 2. Resilient HTTP REST Fallback (works on any cellular or restrictive mobile network)
    try {
      const res = await fetch(`${getServerUrl()}/api/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, userColor, requestedCode, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Notify socket to join room once connected
        if (data.room?.code) {
          socket.emit('room:join', { code: data.room.code, userName, userColor, userId });
        }
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to create room.' };
      }
    } catch (fetchErr) {
      return { 
        success: false, 
        error: 'Unable to reach studio server. Please check your internet connection and retry.' 
      };
    }
  }
}

// Helper for room joining with 4-second socket timeout + resilient HTTP REST fallback
export async function socketJoinRoom(code, userName, userColor) {
  if (!socket.connected) {
    socket.connect();
  }

  const userId = getPersistentUserId();
  const cleanCode = (code || '').replace(/\s+/g, '').toUpperCase();

  const socketPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('SOCKET_TIMEOUT'));
    }, 4000);

    socket.emit('room:join', { code: cleanCode, userName, userColor, userId }, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });

  try {
    return await socketPromise;
  } catch (err) {
    try {
      const res = await fetch(`${getServerUrl()}/api/room/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanCode, userName, userColor, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.room?.code) {
          socket.emit('room:join', { code: data.room.code, userName, userColor, userId });
        }
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Could not join room. Check code!' };
      }
    } catch (fetchErr) {
      return { 
        success: false, 
        error: 'Unable to reach studio server. Please check your internet connection and retry.' 
      };
    }
  }
}

// Latency measurement helper
export function measureLatency(callback) {
  const start = Date.now();
  socket.emit('latency:ping', start);
  const onPong = (sentTime) => {
    if (sentTime === start) {
      const ping = Date.now() - start;
      callback(ping);
      socket.off('latency:pong', onPong);
    }
  };
  socket.on('latency:pong', onPong);
}
