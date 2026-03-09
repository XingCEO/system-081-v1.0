const express = require('express');
const QRCode = require('qrcode');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(async (_req, res) => {
  const tables = await prisma.table.findMany({
    orderBy: {
      number: 'asc'
    }
  });

  res.json({
    success: true,
    data: tables
  });
}));

router.post('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const number = String(req.body.number).padStart(2, '0');
  const qrTarget = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/qr?table=${number}`;
  const qrCode = await QRCode.toDataURL(qrTarget);

  const table = await prisma.table.create({
    data: {
      number,
      capacity: Number(req.body.capacity || 4),
      status: req.body.status || 'AVAILABLE',
      qrCode
    }
  });

  res.status(201).json({
    success: true,
    data: table
  });
}));

async function updateTable(id, payload) {
  const number = payload.number ? String(payload.number).padStart(2, '0') : undefined;
  const qrTarget = number
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/qr?table=${number}`
    : null;

  return prisma.table.update({
    where: {
      id
    },
    data: {
      ...(number ? { number } : {}),
      ...(payload.capacity !== undefined ? { capacity: Number(payload.capacity) } : {}),
      ...(payload.status ? { status: payload.status } : {}),
      ...(qrTarget ? { qrCode: await QRCode.toDataURL(qrTarget) } : {})
    }
  });
}

router.put('/', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const table = await updateTable(Number(req.body.id), req.body);
  res.json({
    success: true,
    data: table
  });
}));

router.put('/:id', authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const table = await updateTable(Number(req.params.id), req.body);
  res.json({
    success: true,
    data: table
  });
}));

module.exports = router;
