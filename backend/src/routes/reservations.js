const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const where = {};

  if (req.query.date) {
    const start = new Date(`${req.query.date}T00:00:00`);
    const end = new Date(`${req.query.date}T23:59:59`);
    where.datetime = { gte: start, lte: end };
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      table: true
    },
    orderBy: {
      datetime: 'asc'
    }
  });

  res.json({
    success: true,
    data: reservations
  });
}));

router.post('/', authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const reservation = await prisma.reservation.create({
    data: {
      tableId: Number(req.body.tableId),
      memberName: req.body.memberName,
      phone: req.body.phone,
      partySize: Number(req.body.partySize),
      datetime: new Date(req.body.datetime),
      note: req.body.note || null,
      status: req.body.status || 'PENDING'
    },
    include: {
      table: true
    }
  });

  await prisma.table.update({
    where: {
      id: reservation.tableId
    },
    data: {
      status: 'RESERVED'
    }
  });

  res.status(201).json({
    success: true,
    data: reservation
  });
}));

async function updateReservation(id, payload) {
  const reservation = await prisma.reservation.update({
    where: {
      id
    },
    data: {
      ...(payload.tableId !== undefined ? { tableId: Number(payload.tableId) } : {}),
      ...(payload.memberName !== undefined ? { memberName: payload.memberName } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      ...(payload.partySize !== undefined ? { partySize: Number(payload.partySize) } : {}),
      ...(payload.datetime !== undefined ? { datetime: new Date(payload.datetime) } : {}),
      ...(payload.note !== undefined ? { note: payload.note } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {})
    },
    include: {
      table: true
    }
  });

  if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status)) {
    await prisma.table.update({
      where: {
        id: reservation.tableId
      },
      data: {
        status: 'AVAILABLE'
      }
    });
  }

  return reservation;
}

router.put('/', authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const reservation = await updateReservation(Number(req.body.id), req.body);
  res.json({
    success: true,
    data: reservation
  });
}));

router.put('/:id', authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const reservation = await updateReservation(Number(req.params.id), req.body);
  res.json({
    success: true,
    data: reservation
  });
}));

module.exports = router;
