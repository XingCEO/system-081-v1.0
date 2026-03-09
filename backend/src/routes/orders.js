const express = require('express');

const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { createOrder, getOrderById, listKdsOrders, listOrders, updateOrderStatus } = require('../services/orderService');
const { reprintOrder } = require('../services/printerService');

const router = express.Router();

router.get('/kds', optionalAuth, asyncHandler(async (_req, res) => {
  const orders = await listKdsOrders();
  res.json({
    success: true,
    data: orders
  });
}));

router.post('/phone', authenticate, asyncHandler(async (req, res) => {
  const order = await createOrder({
    ...req.body,
    type: 'PHONE',
    source: 'phone',
    autoPrint: true
  }, req.user);

  res.status(201).json({
    success: true,
    data: order
  });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const orders = await listOrders(req.query);
  res.json({
    success: true,
    data: orders
  });
}));

router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const order = await createOrder({
    ...req.body,
    autoPrint: req.body.autoPrint ?? true
  }, req.user || null);

  res.status(201).json({
    success: true,
    data: order
  });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const order = await getOrderById(req.params.id);
  res.json({
    success: true,
    data: order
  });
}));

router.patch('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const status = String(req.body.status || '').toUpperCase();

  if (!['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
    throw new HttpError(400, '不支援的訂單狀態');
  }

  const order = await updateOrderStatus(req.params.id, status);
  res.json({
    success: true,
    data: order
  });
}));

router.post('/:id/print', authenticate, asyncHandler(async (req, res) => {
  const result = await reprintOrder(req.params.id);

  if (!result.printed) {
    throw new HttpError(503, '列印機目前無法連線');
  }

  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
