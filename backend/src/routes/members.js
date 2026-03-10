const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');
const { ensurePhone, optionalString, parseNonNegativeInteger, requireString } = require('../utils/validation');

const router = express.Router();

function sanitizeLookupMember(member) {
  if (!member) {
    return null;
  }

  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    points: member.points,
    isBlacklisted: member.isBlacklisted
  };
}

router.get('/lookup', asyncHandler(async (req, res) => {
  const phone = ensurePhone(req.query.phone);

  const member = await prisma.member.findUnique({
    where: { phone }
  });

  res.json({
    success: true,
    data: sanitizeLookupMember(member)
  });
}));

router.get('/', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
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

router.post('/', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const member = await prisma.member.create({
    data: {
      name: requireString(req.body.name, '會員名稱', { maxLength: 60 }),
      phone: ensurePhone(req.body.phone),
      birthday: req.body.birthday ? new Date(req.body.birthday) : null,
      isBlacklisted: req.body.isBlacklisted ?? false
    }
  });

  res.status(201).json({
    success: true,
    data: member
  });
}));

router.put('/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const member = await prisma.member.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      ...(req.body.name !== undefined ? { name: requireString(req.body.name, '會員名稱', { maxLength: 60 }) } : {}),
      ...(req.body.phone !== undefined ? { phone: ensurePhone(req.body.phone) } : {}),
      ...(req.body.birthday !== undefined ? { birthday: req.body.birthday ? new Date(req.body.birthday) : null } : {}),
      ...(req.body.isBlacklisted !== undefined ? { isBlacklisted: Boolean(req.body.isBlacklisted) } : {})
    }
  });

  res.json({
    success: true,
    data: member
  });
}));

router.get('/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
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

router.post('/:id/points', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const points = parseNonNegativeInteger(req.body.points, '點數', { max: 999999 });
  const type = String(req.body.type || '').toUpperCase();

  if (!['EARN', 'REDEEM', 'ADJUST'].includes(type) || points <= 0) {
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

  if ((member.points + delta) < 0) {
    throw new HttpError(400, '會員點數不足');
  }

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
        note: optionalString(req.body.note, { maxLength: 120 })
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
