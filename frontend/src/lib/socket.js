import { io } from 'socket.io-client';
import { getApiBaseUrl, getSocketUrl } from './runtimeConfig';

let sharedSocket;

function resolveSocketUrl() {
  const explicitUrl = getSocketUrl();
  if (explicitUrl) {
    return explicitUrl;
  }

  const apiBaseUrl = getApiBaseUrl();
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
