const express = require('express');
const bcrypt = require('bcryptjs');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

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

router.post('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const user = await prisma.user.create({
    data: {
      name: req.body.name,
      role: req.body.role || 'STAFF',
      passwordHash: await bcrypt.hash(req.body.password, 10),
      pin: await bcrypt.hash(req.body.pin, 10)
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

async function updateStaffRecord(id, payload) {
  const data = {};

  if (payload.name !== undefined) data.name = payload.name;
  if (payload.role !== undefined) data.role = payload.role;
  if (payload.password) data.passwordHash = await bcrypt.hash(payload.password, 10);
  if (payload.pin) data.pin = await bcrypt.hash(payload.pin, 10);

  return prisma.user.update({
    where: { id },
    data
  });
}

router.put('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const user = await updateStaffRecord(Number(req.body.id), req.body);
  res.json({
    success: true,
    data: user
  });
}));

router.put('/:id', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const user = await updateStaffRecord(Number(req.params.id), req.body);
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
