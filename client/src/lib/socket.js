import { io } from 'socket.io-client';

const URL = import.meta.env.PROD ? '' : 'http://localhost:3000';

// 各命名空間的 Socket 連線
export const posSocket = io(`${URL}/pos`, { autoConnect: false, transports: ['websocket'] });
export const kdsSocket = io(`${URL}/kds`, { autoConnect: false, transports: ['websocket'] });
export const callSocket = io(`${URL}/call`, { autoConnect: false, transports: ['websocket'] });
export const kioskSocket = io(`${URL}/kiosk`, { autoConnect: false, transports: ['websocket'] });

// 連線管理
export function connectSocket(namespace) {
  const sockets = { pos: posSocket, kds: kdsSocket, call: callSocket, kiosk: kioskSocket };
  const socket = sockets[namespace];
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(namespace) {
  const sockets = { pos: posSocket, kds: kdsSocket, call: callSocket, kiosk: kioskSocket };
  const socket = sockets[namespace];
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function disconnectAll() {
  [posSocket, kdsSocket, callSocket, kioskSocket].forEach(s => {
    if (s.connected) s.disconnect();
  });
}
