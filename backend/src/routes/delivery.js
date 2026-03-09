const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');
const { normalizeFoodpandaWebhook, normalizeUberEatsWebhook } = require('../services/deliveryService');
const { createOrder } = require('../services/orderService');

const router = express.Router();

function verifyWebhook(secret, req) {
  if (!secret) {
    return;
  }

  const headerSecret = req.headers['x-webhook-secret'] || req.headers['x-signature'];
  if (headerSecret !== secret) {
    throw new HttpError(401, 'Webhook 驗證失敗');
  }
}

router.post('/foodpanda', asyncHandler(async (req, res) => {
  verifyWebhook(process.env.FOODPANDA_WEBHOOK_SECRET, req);
  const payload = normalizeFoodpandaWebhook(req.body);
  const order = await createOrder(payload, null);
  res.status(201).json({
    success: true,
    data: order
  });
}));

router.post('/ubereats', asyncHandler(async (req, res) => {
  verifyWebhook(process.env.UBEREATS_WEBHOOK_SECRET, req);
  const payload = normalizeUberEatsWebhook(req.body);
  const order = await createOrder(payload, null);
  res.status(201).json({
    success: true,
    data: order
  });
}));

router.get('/orders', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (_req, res) => {
  const orders = await prisma.deliveryOrder.findMany({
    include: {
      order: {
        include: {
          items: {
            include: {
              menuItem: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({
    success: true,
    data: orders
  });
}));

router.patch('/orders/:id/status', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').toUpperCase();
  const deliveryOrder = await prisma.deliveryOrder.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      status
    },
    include: {
      order: {
        include: {
          items: {
            include: {
              menuItem: true
            }
          }
        }
      }
    }
  });

  res.json({
    success: true,
    data: deliveryOrder
  });
}));

module.exports = router;
