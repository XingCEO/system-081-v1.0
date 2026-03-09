// 訂單路由 - 建立/查詢/更新/取消訂單
const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

// 產生訂單編號（如 A001, A002...）
async function generateOrderNumber(prisma) {
  const today = dayjs().format('YYYY-MM-DD');
  const todayStart = dayjs().startOf('day').toDate();
  const todayEnd = dayjs().endOf('day').toDate();

  const count = await prisma.order.count({
    where: { createdAt: { gte: todayStart, lte: todayEnd } }
  });

  const prefix = String.fromCharCode(65 + (Math.floor(count / 999) % 26)); // A-Z
  const num = String((count % 999) + 1).padStart(3, '0');
  return `${prefix}${num}`;
}

// POST /api/orders - 建立訂單
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      type = 'dine_in',
      source = 'pos',
      tableNumber,
      customerName,
      customerPhone,
      customerCount = 1,
      items,
      note,
      discountAmount = 0,
      discountReason
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: '訂單至少需要一個品項' });
    }

    // 計算金額
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await req.prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
        include: { timePrices: { where: { isActive: true } } }
      });

      if (!menuItem) {
        return res.status(400).json({ success: false, message: `品項 ID ${item.menuItemId} 不存在` });
      }

      // 計算當前價格（考慮時段定價）
      let unitPrice = menuItem.basePrice;
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const currentDay = now.getDay() || 7;

      for (const tp of menuItem.timePrices) {
        const days = JSON.parse(tp.daysOfWeek);
        if (days.includes(currentDay) && currentTime >= tp.startTime && currentTime <= tp.endTime) {
          unitPrice = tp.price;
          break;
        }
      }

      // 加上選項金額
      let optionsTotal = 0;
      if (item.options && Array.isArray(item.options)) {
        for (const opt of item.options) {
          optionsTotal += opt.priceAdjust || 0;
        }
      }

      const quantity = item.quantity || 1;
      const totalPrice = (unitPrice + optionsTotal) * quantity;
      subtotal += totalPrice;

      orderItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity,
        unitPrice: unitPrice + optionsTotal,
        totalPrice,
        options: JSON.stringify(item.options || []),
        note: item.note || null
      });
    }

    // 計算稅額（預設 5%，可從設定讀取）
    const taxRate = 0.05;
    const taxAmount = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxAmount - discountAmount;

    // 產生訂單編號
    const orderNumber = await generateOrderNumber(req.prisma);

    const order = await req.prisma.order.create({
      data: {
        orderNumber,
        type,
        source,
        tableNumber,
        customerName,
        customerPhone,
        customerCount,
        subtotal,
        taxAmount,
        discountAmount,
        discountReason,
        totalAmount: Math.max(0, totalAmount),
        note,
        createdById: req.user?.id || null,
        items: { create: orderItems }
      },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, image: true } } } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    // 通知 KDS 和 POS
    if (req.io) {
      req.io.of('/kds').emit('new-order', order);
      req.io.of('/pos').emit('new-order', order);
    }

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders - 取得訂單列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, type, source, date, page = 1, limit = 50, search } = req.query;
    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { tableNumber: { contains: search } }
      ];
    }
    if (date) {
      const start = dayjs(date).startOf('day').toDate();
      const end = dayjs(date).endOf('day').toDate();
      where.createdAt = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      req.prisma.order.findMany({
        where,
        include: {
          items: { include: { menuItem: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      req.prisma.order.count({ where })
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders/:id - 取得單一訂單
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        items: { include: { menuItem: true } },
        payments: true,
        createdBy: { select: { id: true, name: true } }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: '訂單不存在' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/status - 更新訂單狀態
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const id = parseInt(req.params.id);

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: '無效的訂單狀態' });
    }

    const data = { status };
    if (status === 'completed') data.completedAt = new Date();
    if (status === 'cancelled') {
      data.cancelledAt = new Date();
      data.cancelReason = req.body.reason || null;
    }

    const order = await req.prisma.order.update({
      where: { id },
      data,
      include: { items: true }
    });

    // 廣播狀態更新
    if (req.io) {
      req.io.of('/pos').emit('order-updated', order);
      req.io.of('/kds').emit('order-updated', order);
      if (status === 'ready') {
        req.io.of('/call').emit('order-ready', order);
      }
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/pay - 結帳
router.post('/:id/pay', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { method, amount, reference } = req.body;

    const order = await req.prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ success: false, message: '訂單不存在' });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: '訂單已付款' });
    }

    const paidAmount = parseFloat(amount) || order.totalAmount;
    const changeAmount = Math.max(0, paidAmount - order.totalAmount);

    // 建立付款紀錄
    await req.prisma.payment.create({
      data: {
        orderId: id,
        method: method || 'cash',
        amount: paidAmount,
        reference
      }
    });

    // 更新訂單
    const updated = await req.prisma.order.update({
      where: { id },
      data: {
        paymentMethod: method || 'cash',
        paymentStatus: 'paid',
        paidAmount,
        changeAmount
      },
      include: { items: true, payments: true }
    });

    // 記錄操作
    await req.prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'payment',
        target: order.orderNumber,
        detail: JSON.stringify({ method, amount: paidAmount })
      }
    });

    if (req.io) {
      req.io.of('/pos').emit('order-paid', updated);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/orders/:id/call - 叫號
router.post('/:id/call', authenticate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const order = await req.prisma.order.update({
      where: { id },
      data: {
        callNumber: req.body.callNumber || null,
        calledAt: new Date()
      }
    });

    if (req.io) {
      req.io.of('/call').emit('call-number', {
        orderNumber: order.orderNumber,
        callNumber: order.callNumber || order.orderNumber
      });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
});

// PUT /api/orders/:id/items/:itemId - 更新訂單品項狀態
router.put('/:id/items/:itemId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = { status };

    if (status === 'ready') data.preparedAt = new Date();
    if (status === 'served') data.servedAt = new Date();

    const item = await req.prisma.orderItem.update({
      where: { id: parseInt(req.params.itemId) },
      data,
      include: { order: true }
    });

    if (req.io) {
      req.io.of('/kds').emit('item-updated', item);
      req.io.of('/pos').emit('item-updated', item);
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
