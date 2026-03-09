// 報表路由
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const dayjs = require('dayjs');

const router = express.Router();

// GET /api/reports/dashboard - 儀表板數據
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const where = { createdAt: { gte: todayStart, lte: todayEnd } };

    const [
      todayOrders,
      todayRevenue,
      pendingOrders,
      preparingOrders
    ] = await Promise.all([
      req.prisma.order.count({ where: { ...where, status: { not: 'cancelled' } } }),
      req.prisma.order.aggregate({
        where: { ...where, paymentStatus: 'paid' },
        _sum: { totalAmount: true }
      }),
      req.prisma.order.count({ where: { status: 'pending' } }),
      req.prisma.order.count({ where: { status: 'preparing' } })
    ]);

    // 最近訂單
    const recentOrders = await req.prisma.order.findMany({
      where: { ...where },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { createdBy: { select: { name: true } } }
    });

    // 熱銷品項
    const topItems = await req.prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      where: { order: { createdAt: { gte: todayStart, lte: todayEnd }, status: { not: 'cancelled' } } },
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10
    });

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue._sum.totalAmount || 0,
        pendingOrders,
        preparingOrders,
        recentOrders,
        topItems
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/sales - 營業報表
router.get('/sales', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const start = dayjs(startDate || dayjs().subtract(30, 'day')).startOf('day').toDate();
    const end = dayjs(endDate || dayjs()).endOf('day').toDate();

    const orders = await req.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'cancelled' },
        paymentStatus: 'paid'
      },
      select: {
        totalAmount: true,
        discountAmount: true,
        taxAmount: true,
        paymentMethod: true,
        type: true,
        source: true,
        createdAt: true
      }
    });

    // 依日期分組
    const salesByDate = {};
    for (const order of orders) {
      const key = dayjs(order.createdAt).format(groupBy === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD');
      if (!salesByDate[key]) {
        salesByDate[key] = { date: key, orders: 0, revenue: 0, discount: 0, tax: 0 };
      }
      salesByDate[key].orders++;
      salesByDate[key].revenue += order.totalAmount;
      salesByDate[key].discount += order.discountAmount;
      salesByDate[key].tax += order.taxAmount;
    }

    // 依付款方式統計
    const byPayment = {};
    for (const order of orders) {
      const method = order.paymentMethod || 'unknown';
      if (!byPayment[method]) byPayment[method] = { count: 0, amount: 0 };
      byPayment[method].count++;
      byPayment[method].amount += order.totalAmount;
    }

    // 依訂單類型統計
    const byType = {};
    for (const order of orders) {
      if (!byType[order.type]) byType[order.type] = { count: 0, amount: 0 };
      byType[order.type].count++;
      byType[order.type].amount += order.totalAmount;
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders: orders.length,
          totalRevenue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
          totalDiscount: orders.reduce((sum, o) => sum + o.discountAmount, 0),
          avgOrderAmount: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length : 0
        },
        salesByDate: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
        byPayment,
        byType
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/items - 品項銷售報表
router.get('/items', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = dayjs(startDate || dayjs().subtract(30, 'day')).startOf('day').toDate();
    const end = dayjs(endDate || dayjs()).endOf('day').toDate();

    const items = await req.prisma.orderItem.groupBy({
      by: ['menuItemId', 'name'],
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: { not: 'cancelled' }
        },
        status: { not: 'cancelled' }
      },
      _sum: { quantity: true, totalPrice: true },
      _count: true,
      orderBy: { _sum: { totalPrice: 'desc' } }
    });

    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/reports/daily-close - 日結
router.post('/daily-close', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const date = dayjs().format('YYYY-MM-DD');
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const where = { createdAt: { gte: todayStart, lte: todayEnd } };

    // 檢查是否已結帳
    const existing = await req.prisma.dailyReport.findUnique({ where: { date } });
    if (existing) {
      return res.status(400).json({ success: false, message: '今日已完成日結' });
    }

    // 統計數據
    const orders = await req.prisma.order.findMany({ where });
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const report = await req.prisma.dailyReport.create({
      data: {
        date,
        totalOrders: paidOrders.length,
        totalRevenue: paidOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        totalDiscount: paidOrders.reduce((sum, o) => sum + o.discountAmount, 0),
        totalTax: paidOrders.reduce((sum, o) => sum + o.taxAmount, 0),
        cashTotal: paidOrders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.totalAmount, 0),
        cardTotal: paidOrders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.totalAmount, 0),
        mobileTotal: paidOrders.filter(o => ['line_pay', 'jko_pay', 'apple_pay', 'mobile'].includes(o.paymentMethod)).reduce((sum, o) => sum + o.totalAmount, 0),
        cancelledOrders: cancelledOrders.length,
        cancelledAmount: cancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        avgOrderAmount: paidOrders.length > 0 ? paidOrders.reduce((sum, o) => sum + o.totalAmount, 0) / paidOrders.length : 0,
        closedById: req.user.id,
        note: req.body.note
      }
    });

    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
