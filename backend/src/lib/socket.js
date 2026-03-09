const { Server } = require('socket.io');
const { createCorsOriginHandler } = require('../utils/cors');

let io;

function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: createCorsOriginHandler(),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:screen', (screen) => {
      socket.join(screen);
    });
  });

  return io;
}

function emit(event, payload, room) {
  if (!io) {
    return;
  }

  if (room) {
    io.to(room).emit(event, payload);
    return;
  }

  io.emit(event, payload);
}

module.exports = {
  initializeSocket,
  getIO() {
    return io;
  },
  emitOrderNew(payload) {
    emit('order:new', payload);
  },
  emitOrderStatusChanged(payload) {
    emit('order:status_changed', payload);
  },
  emitStockAlert(payload) {
    emit('stock:alert', payload);
  },
  emitKitchenCall(payload) {
    emit('kitchen:call', payload);
  }
};
