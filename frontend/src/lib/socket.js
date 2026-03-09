import { io } from 'socket.io-client';

let sharedSocket;

function resolveSocketUrl() {
  const explicitUrl = (import.meta.env.VITE_SOCKET_URL || '').replace(/\/$/, '');
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  if (/^https?:\/\//.test(apiBaseUrl)) {
    return apiBaseUrl.replace(/\/api$/, '');
  }

  return window.location.origin;
}

export function connectSocket(screen) {
  if (!sharedSocket) {
    sharedSocket = io(resolveSocketUrl(), {
      path: '/socket.io',
      transports: ['websocket']
    });
  }

  if (screen) {
    sharedSocket.emit('join:screen', screen);
  }

  return sharedSocket;
}

export function disconnectSocket() {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = undefined;
  }
}
