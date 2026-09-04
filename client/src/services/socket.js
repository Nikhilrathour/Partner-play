import { io } from 'socket.io-client';

// In development, Vite proxies or we connect directly to port 5000
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin);

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
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
