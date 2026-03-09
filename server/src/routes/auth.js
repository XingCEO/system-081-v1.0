// 認證路由 - 登入/登出/PIN 碼驗證
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login - PIN 碼登入
router.post('/login', async (req, res, next) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ success: false, message: '請輸入 PIN 碼' });
    }

    // 取得所有啟用的使用者
    const users = await req.prisma.user.findMany({
      where: { isActive: true }
    });

    // 比對 PIN 碼
    let matchedUser = null;
    for (const user of users) {
      const isMatch = await bcrypt.compare(pin, user.pin);
      if (isMatch) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(401).json({ success: false, message: 'PIN 碼錯誤' });
    }

    // 產生 JWT
    const token = jwt.sign(
      { id: matchedUser.id, name: matchedUser.name, role: matchedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // 記錄登入
    await req.prisma.activityLog.create({
      data: {
        userId: matchedUser.id,
        action: 'login',
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: matchedUser.id,
          name: matchedUser.name,
          role: matchedUser.role,
          avatar: matchedUser.avatar
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me - 取得目前使用者資訊
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, role: true, avatar: true, permissions: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: '使用者不存在' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout - 登出
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await req.prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'logout',
        ipAddress: req.ip
      }
    });
    res.json({ success: true, message: '已登出' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/users - 取得所有使用者（管理員）
router.get('/users', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const users = await req.prisma.user.findMany({
      select: { id: true, name: true, role: true, avatar: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/users - 新增使用者（管理員）
router.post('/users', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, pin, role, avatar } = req.body;

    if (!name || !pin) {
      return res.status(400).json({ success: false, message: '姓名和 PIN 碼為必填' });
    }

    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN 碼必須是 4-6 位數字' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    const user = await req.prisma.user.create({
      data: { name, pin: hashedPin, role: role || 'cashier', avatar },
      select: { id: true, name: true, role: true, avatar: true, isActive: true, createdAt: true }
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/users/:id - 更新使用者
router.put('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, pin, role, avatar, isActive } = req.body;
    const data = {};

    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (avatar !== undefined) data.avatar = avatar;
    if (isActive !== undefined) data.isActive = isActive;
    if (pin) {
      if (!/^\d{4,6}$/.test(pin)) {
        return res.status(400).json({ success: false, message: 'PIN 碼必須是 4-6 位數字' });
      }
      data.pin = await bcrypt.hash(pin, 10);
    }

    const user = await req.prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, name: true, role: true, avatar: true, isActive: true }
    });

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/clock-in - 上班打卡
router.post('/clock-in', authenticate, async (req, res, next) => {
  try {
    const { cashStart } = req.body;
    const shift = await req.prisma.shift.create({
      data: {
        userId: req.user.id,
        cashStart: cashStart || 0
      }
    });
    res.json({ success: true, data: shift });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/clock-out - 下班打卡
router.post('/clock-out', authenticate, async (req, res, next) => {
  try {
    const { cashEnd, note } = req.body;

    // 找到最新的未結束班次
    const shift = await req.prisma.shift.findFirst({
      where: { userId: req.user.id, clockOut: null },
      orderBy: { clockIn: 'desc' }
    });

    if (!shift) {
      return res.status(400).json({ success: false, message: '沒有進行中的班次' });
    }

    const updated = await req.prisma.shift.update({
      where: { id: shift.id },
      data: { clockOut: new Date(), cashEnd, note }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
