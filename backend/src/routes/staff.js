const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');
const { requireString } = require('../utils/validation');

const router = express.Router();
const ALLOWED_USER_ROLES = ['OWNER', 'MANAGER', 'STAFF'];

router.use(authenticate);

router.get('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      id: true,
      name: true,
      role: true,
      createdAt: true
    }
  });

  res.json({
    success: true,
    data: users
  });
}));

function ensureRoleMutationAllowed(currentUser, targetUser, nextRole) {
  if (!ALLOWED_USER_ROLES.includes(nextRole)) {
    throw new HttpError(400, '不支援的員工角色');
  }

  if (currentUser.role === 'MANAGER') {
    if (nextRole === 'OWNER') {
      throw new HttpError(403, '店長無法建立或提升為老闆帳號');
    }

    if (targetUser?.role === 'OWNER') {
      throw new HttpError(403, '店長無法修改老闆帳號');
    }
  }
}

router.post('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const nextRole = String(req.body.role || 'STAFF').toUpperCase();
  ensureRoleMutationAllowed(req.user, null, nextRole);

  const user = await prisma.user.create({
    data: {
      name: requireString(req.body.name, '員工帳號', { maxLength: 60 }),
      role: nextRole,
      passwordHash: await bcrypt.hash(requireString(req.body.password, '登入密碼', { minLength: 6, maxLength: 60 }), 10),
      pin: await bcrypt.hash(requireString(req.body.pin, 'PIN 碼', { minLength: 4, maxLength: 12 }), 10)
    }
  });

  res.status(201).json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  });
}));

async function updateStaffRecord(id, payload, currentUser) {
  const targetUser = await prisma.user.findUnique({
    where: { id }
  });

  if (!targetUser) {
    throw new HttpError(404, '找不到員工資料');
  }

  const nextRole = payload.role !== undefined ? String(payload.role).toUpperCase() : targetUser.role;
  ensureRoleMutationAllowed(currentUser, targetUser, nextRole);

  const data = {};

  if (payload.name !== undefined) data.name = requireString(payload.name, '員工名稱', { maxLength: 60 });
  if (payload.role !== undefined) data.role = nextRole;
  if (payload.password) data.passwordHash = await bcrypt.hash(requireString(payload.password, '登入密碼', { minLength: 6, maxLength: 60 }), 10);
  if (payload.pin) data.pin = await bcrypt.hash(requireString(payload.pin, 'PIN 碼', { minLength: 4, maxLength: 12 }), 10);

  return prisma.user.update({
    where: { id },
    data
  });
}

router.put('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const user = await updateStaffRecord(Number(req.body.id), req.body, req.user);
  res.json({
    success: true,
    data: user
  });
}));

router.put('/:id', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const user = await updateStaffRecord(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    data: user
  });
}));

router.post('/:id/clock-in', asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.role === 'STAFF' && req.user.id !== targetId) {
    throw new HttpError(403, '只能替自己打卡');
  }

  const existing = await prisma.staffAttendance.findFirst({
    where: {
      userId: targetId,
      clockOut: null
    }
  });

  if (existing) {
    throw new HttpError(409, '目前已有尚未結束的上班打卡紀錄');
  }

  const attendance = await prisma.staffAttendance.create({
    data: {
      userId: targetId
    }
  });

  res.json({
    success: true,
    data: attendance
  });
}));

router.post('/:id/clock-out', asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.role === 'STAFF' && req.user.id !== targetId) {
    throw new HttpError(403, '只能替自己打卡');
  }

  const latest = await prisma.staffAttendance.findFirst({
    where: {
      userId: targetId,
      clockOut: null
    },
    orderBy: {
      clockIn: 'desc'
    }
  });

  if (!latest) {
    throw new HttpError(400, '尚未打卡上班');
  }

  const attendance = await prisma.staffAttendance.update({
    where: { id: latest.id },
    data: {
      clockOut: new Date()
    }
  });

  res.json({
    success: true,
    data: attendance
  });
}));

router.get('/:id/attendance', asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);

  if (req.user.role === 'STAFF' && req.user.id !== targetId) {
    throw new HttpError(403, '只能查看自己的打卡記錄');
  }

  const attendance = await prisma.staffAttendance.findMany({
    where: {
      userId: targetId
    },
    orderBy: {
      clockIn: 'desc'
    }
  });

  res.json({
    success: true,
    data: attendance
  });
}));

module.exports = router;
