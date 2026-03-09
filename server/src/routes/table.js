// 桌位路由
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const QRCode = require('qrcode');

const router = express.Router();

// GET /api/tables - 取得所有桌位
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tables = await req.prisma.table.findMany({
      where: req.query.all === 'true' ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: tables });
  } catch (err) {
    next(err);
  }
});

// POST /api/tables - 新增桌位
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { number, name, capacity, zone } = req.body;
    if (!number) {
      return res.status(400).json({ success: false, message: '桌號為必填' });
    }
    const table = await req.prisma.table.create({
      data: { number, name, capacity: capacity || 4, zone: zone || 'main' }
    });
    res.status(201).json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tables/:id - 更新桌位
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const table = await req.prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tables/:id/status - 更新桌位狀態
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const table = await req.prisma.table.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    });
    if (req.io) {
      req.io.of('/pos').emit('table-updated', table);
    }
    res.json({ success: true, data: table });
  } catch (err) {
    next(err);
  }
});

// GET /api/tables/:id/qrcode - 產生 QR Code
router.get('/:id/qrcode', authenticate, async (req, res, next) => {
  try {
    const table = await req.prisma.table.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!table) {
      return res.status(404).json({ success: false, message: '桌位不存在' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/qr-order/${table.number}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });

    // 更新桌位的 QR Code
    await req.prisma.table.update({
      where: { id: table.id },
      data: { qrCode: url }
    });

    res.json({ success: true, data: { url, qrCode: qrDataUrl } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tables/:id - 刪除桌位
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await req.prisma.table.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: '桌位已刪除' });
  } catch (err) {
    next(err);
  }
});

// POST /api/tables/batch - 批量建立桌位
router.post('/batch', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { prefix = '', start = 1, end = 10, capacity = 4, zone = 'main' } = req.body;
    const tables = [];

    for (let i = start; i <= end; i++) {
      const number = `${prefix}${String(i).padStart(2, '0')}`;
      tables.push({ number, capacity, zone, sortOrder: i });
    }

    const result = await req.prisma.table.createMany({
      data: tables,
      skipDuplicates: true
    });

    res.status(201).json({ success: true, data: { count: result.count } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
