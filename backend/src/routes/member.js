// 會員路由
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/members - 取得會員列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, level, page = 1, limit = 20 } = req.query;
    const where = { isActive: true };

    if (level) where.level = level;
    if (search) {
      where.OR = [
        { phone: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [members, total] = await Promise.all([
      req.prisma.member.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      req.prisma.member.count({ where })
    ]);

    res.json({
      success: true,
      data: members,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/members/:id - 取得單一會員
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await req.prisma.member.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { pointLogs: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });
    if (!member) {
      return res.status(404).json({ success: false, message: '會員不存在' });
    }
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

// GET /api/members/phone/:phone - 用手機號碼查會員
router.get('/phone/:phone', authenticate, async (req, res, next) => {
  try {
    const member = await req.prisma.member.findUnique({
      where: { phone: req.params.phone }
    });
    if (!member) {
      return res.status(404).json({ success: false, message: '會員不存在' });
    }
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

// POST /api/members - 新增會員
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { phone, name, email, birthday, gender, note } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: '手機號碼為必填' });
    }

    const existing = await req.prisma.member.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: '此手機號碼已註冊' });
    }

    const member = await req.prisma.member.create({
      data: { phone, name, email, birthday: birthday ? new Date(birthday) : null, gender, note }
    });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

// PUT /api/members/:id - 更新會員
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { birthday, ...data } = req.body;
    if (birthday) data.birthday = new Date(birthday);

    const member = await req.prisma.member.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
});

// POST /api/members/:id/points - 調整點數
router.post('/:id/points', authenticate, async (req, res, next) => {
  try {
    const { points, type = 'adjust', description, orderId } = req.body;
    const id = parseInt(req.params.id);

    const [pointLog, member] = await req.prisma.$transaction([
      req.prisma.pointLog.create({
        data: { memberId: id, points, type, description, orderId }
      }),
      req.prisma.member.update({
        where: { id },
        data: { points: { increment: points } }
      })
    ]);

    res.json({ success: true, data: { member, pointLog } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
