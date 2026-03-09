// 印表機路由
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/printers - 取得所有印表機
router.get('/', authenticate, async (req, res, next) => {
  try {
    const printers = await req.prisma.printer.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: printers });
  } catch (err) {
    next(err);
  }
});

// POST /api/printers - 新增印表機
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const printer = await req.prisma.printer.create({ data: req.body });
    res.status(201).json({ success: true, data: printer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/printers/:id - 更新印表機
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const printer = await req.prisma.printer.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: printer });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/printers/:id - 刪除印表機
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    await req.prisma.printer.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true, message: '印表機已刪除' });
  } catch (err) {
    next(err);
  }
});

// POST /api/printers/:id/test - 測試列印
router.post('/:id/test', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const printer = await req.prisma.printer.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!printer) {
      return res.status(404).json({ success: false, message: '印表機不存在' });
    }
    // 實際的列印邏輯會在列印整合時實作
    res.json({ success: true, message: '測試列印指令已送出' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
