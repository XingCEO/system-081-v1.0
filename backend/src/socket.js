// Socket.IO 連線與事件處理
module.exports = (io, prisma) => {
  // 命名空間
  const posNsp = io.of('/pos');      // POS 收銀台
  const kdsNsp = io.of('/kds');      // 廚房顯示
  const callNsp = io.of('/call');    // 叫號屏
  const kioskNsp = io.of('/kiosk');  // 自助點餐

  // POS 命名空間
  posNsp.on('connection', (socket) => {
    console.log('📱 POS 已連線:', socket.id);

    socket.on('disconnect', () => {
      console.log('📱 POS 已斷線:', socket.id);
    });
  });

  // KDS 命名空間
  kdsNsp.on('connection', (socket) => {
    console.log('🍳 KDS 已連線:', socket.id);

    // 加入特定站點
    socket.on('join-station', (station) => {
      socket.join(station);
      console.log(`🍳 KDS 加入站點: ${station}`);
    });

    // 更新品項狀態
    socket.on('update-item-status', async (data) => {
      try {
        const { orderItemId, status } = data;
        const item = await prisma.orderItem.update({
          where: { id: orderItemId },
          data: {
            status,
            ...(status === 'ready' ? { preparedAt: new Date() } : {}),
            ...(status === 'served' ? { servedAt: new Date() } : {})
          },
          include: { order: true }
        });

        // 廣播更新
        kdsNsp.emit('item-updated', item);
        posNsp.emit('item-updated', item);

        // 檢查訂單是否全部完成
        const allItems = await prisma.orderItem.findMany({
          where: { orderId: item.orderId }
        });
        const allReady = allItems.every(i => i.status === 'ready' || i.status === 'served');

        if (allReady) {
          const order = await prisma.order.update({
            where: { id: item.orderId },
            data: { status: 'ready' }
          });
          posNsp.emit('order-ready', order);
          callNsp.emit('order-ready', order);
        }
      } catch (err) {
        console.error('KDS 更新錯誤:', err);
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('🍳 KDS 已斷線:', socket.id);
    });
  });

  // 叫號屏命名空間
  callNsp.on('connection', (socket) => {
    console.log('📢 叫號屏已連線:', socket.id);

    socket.on('disconnect', () => {
      console.log('📢 叫號屏已斷線:', socket.id);
    });
  });

  // Kiosk 命名空間
  kioskNsp.on('connection', (socket) => {
    console.log('🖥️ Kiosk 已連線:', socket.id);

    socket.on('disconnect', () => {
      console.log('🖥️ Kiosk 已斷線:', socket.id);
    });
  });

  // 匯出命名空間供路由使用
  io.posNsp = posNsp;
  io.kdsNsp = kdsNsp;
  io.callNsp = callNsp;
  io.kioskNsp = kioskNsp;
};
