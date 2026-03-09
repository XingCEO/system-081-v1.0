// KDS（廚房顯示系統）路由
const express = require('express');
const { authenticate } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

// GET /api/kds/orders - 取得廚房待處理訂單
router.get('/orders', authenticate, async (req, res, next) => {
  try {
    const { station, status } = req.query;

    // 取得今日的進行中訂單
    const todayStart = dayjs().startOf('day').toDate();

    const where = {
      createdAt: { gte: todayStart },
      status: { in: status ? [status] : ['pending', 'preparing'] }
    };

    const orders = await req.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            menuItem: {
              select: { id: true, name: true, category: { select: { name: true } } }
            }
          },
          where: station ? {
            menuItem: { category: { name: { contains: station } } }
          } : {}
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 過濾掉沒有品項的訂單（當有站點篩選時可能發生）
    const filtered = orders.filter(o => o.items.length > 0);

    res.json({ success: true, data: filtered });
  } catch (err) {
    next(err);
  }
});

// PUT /api/kds/items/:id/status - 更新品項狀態（KDS 專用）
router.put('/items/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.id);

    const data = { status };
    if (status === 'preparing') data.status = 'preparing';
    if (status === 'ready') data.preparedAt = new Date();
    if (status === 'served') data.servedAt = new Date();

    const item = await req.prisma.orderItem.update({
      where: { id },
      data,
      include: { order: true }
    });

    // 更新訂單狀態
    if (status === 'preparing') {
      await req.prisma.order.update({
        where: { id: item.orderId },
        data: { status: 'preparing' }
      });
    }

    // 檢查是否所有品項都已完成
    if (status === 'ready') {
      const allItems = await req.prisma.orderItem.findMany({
        where: { orderId: item.orderId }
      });
      const allReady = allItems.every(i => i.status === 'ready' || i.status === 'served');

      if (allReady) {
        const order = await req.prisma.order.update({
          where: { id: item.orderId },
          data: { status: 'ready' },
          include: { items: true }
        });

        if (req.io) {
          req.io.of('/call').emit('order-ready', order);
          req.io.of('/pos').emit('order-ready', order);
        }
      }
    }

    // 廣播更新
    if (req.io) {
      req.io.of('/kds').emit('item-updated', item);
      req.io.of('/pos').emit('item-updated', item);
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// POST /api/kds/orders/:id/bump - 一鍵完成整張訂單
router.post('/orders/:id/bump', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // 更新所有品項為 ready
    await req.prisma.orderItem.updateMany({
      where: { orderId: id, status: { not: 'cancelled' } },
      data: { status: 'ready', preparedAt: new Date() }
    });

    // 更新訂單狀態
    const order = await req.prisma.order.update({
      where: { id },
      data: { status: 'ready' },
      include: { items: true }
    });

    if (req.io) {
      req.io.of('/kds').emit('order-bumped', order);
      req.io.of('/call').emit('order-ready', order);
      req.io.of('/pos').emit('order-ready', order);
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
