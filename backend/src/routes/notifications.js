const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('OWNER', 'MANAGER'));

router.get('/', asyncHandler(async (_req, res) => {
  const notifications = await prisma.notification.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    success: true,
    data: notifications
  });
}));

router.patch('/:id/read', asyncHandler(async (req, res) => {
  const notification = await prisma.notification.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      isRead: true
    }
  });

  res.json({
    success: true,
    data: notification
  });
}));

module.exports = router;
