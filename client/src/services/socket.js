import { io } from 'socket.io-client';

export const DEFAULT_SERVER_URL = 'https://partner-play-production.up.railway.app';

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
    if (custom && custom.trim()) return custom.trim();
  }
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    if (window.location.port === '5173') {
      return 'http://localhost:5000';
    }
    if (window.location.origin && !window.location.origin.includes('localhost')) {
      return window.location.origin;
    }
  }
  return DEFAULT_SERVER_URL;
}

export const socket = io(getServerUrl(), {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 20,
  reconnectionDelay: 1500,
});

// Helper promise wrapper for room creation
export function socketCreateRoom(userName, userColor, requestedCode) {
  return new Promise((resolve) => {
    socket.emit('room:create', { userName, userColor, requestedCode }, (response) => {
      resolve(response);
    });
  });
}

// Helper promise wrapper for room joining
export function socketJoinRoom(code, userName, userColor) {
  return new Promise((resolve) => {
    socket.emit('room:join', { code, userName, userColor }, (response) => {
      resolve(response);
    });
  });
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
