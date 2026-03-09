const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/lookup', asyncHandler(async (req, res) => {
  const phone = req.query.phone;

  if (!phone) {
    throw new HttpError(400, '請提供電話');
  }

  const member = await prisma.member.findUnique({
    where: { phone }
  });

  res.json({
    success: true,
    data: member
  });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const members = await prisma.member.findMany({
    where: req.query.search
      ? {
          OR: [
            {
              name: {
                contains: req.query.search,
                mode: 'insensitive'
              }
            },
            {
              phone: {
                contains: req.query.search,
                mode: 'insensitive'
              }
            }
          ]
        }
      : undefined,
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    success: true,
    data: members
  });
}));

router.post('/', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const member = await prisma.member.create({
    data: {
      name: req.body.name,
      phone: req.body.phone,
      birthday: req.body.birthday ? new Date(req.body.birthday) : null,
      isBlacklisted: req.body.isBlacklisted ?? false
    }
  });

  res.status(201).json({
    success: true,
    data: member
  });
}));

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const member = await prisma.member.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      ...(req.body.name !== undefined ? { name: req.body.name } : {}),
      ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
      ...(req.body.birthday !== undefined ? { birthday: req.body.birthday ? new Date(req.body.birthday) : null } : {}),
      ...(req.body.isBlacklisted !== undefined ? { isBlacklisted: Boolean(req.body.isBlacklisted) } : {})
    }
  });

  res.json({
    success: true,
    data: member
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const member = await prisma.member.findUnique({
    where: {
      id: Number(req.params.id)
    },
    include: {
      pointHistory: {
        orderBy: {
          createdAt: 'desc'
        }
      },
      orders: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!member) {
    throw new HttpError(404, '找不到會員');
  }

  res.json({
    success: true,
    data: member
  });
}));

router.post('/:id/points', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const points = Number(req.body.points);
  const type = String(req.body.type || '').toUpperCase();

  if (!['EARN', 'REDEEM', 'ADJUST'].includes(type)) {
    throw new HttpError(400, '不支援的點數異動類型');
  }

  const member = await prisma.member.findUnique({
    where: {
      id: Number(req.params.id)
    }
  });

  if (!member) {
    throw new HttpError(404, '找不到會員');
  }

  const delta = type === 'REDEEM' ? -points : points;

  const [updatedMember, transaction] = await prisma.$transaction([
    prisma.member.update({
      where: {
        id: member.id
      },
      data: {
        points: {
          increment: delta
        }
      }
    }),
    prisma.pointTransaction.create({
      data: {
        memberId: member.id,
        orderId: req.body.orderId ? Number(req.body.orderId) : null,
        points,
        type,
        note: req.body.note || null
      }
    })
  ]);

  res.json({
    success: true,
    data: {
      member: updatedMember,
      transaction
    }
  });
}));

module.exports = router;
