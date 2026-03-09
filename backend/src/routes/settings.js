const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate, authorize } = require('../middleware/auth');
const { getSystemSettings, upsertSetting } = require('../services/settingsService');

const router = express.Router();

router.use(authenticate, authorize('OWNER', 'MANAGER'));

router.get('/', asyncHandler(async (_req, res) => {
  const settings = await getSystemSettings();
  const rawSettings = await prisma.setting.findMany({
    orderBy: {
      key: 'asc'
    }
  });

  res.json({
    success: true,
    data: {
      ...settings,
      records: rawSettings
    }
  });
}));

router.put('/', asyncHandler(async (req, res) => {
  const updates = req.body;
  const results = [];

  for (const [key, value] of Object.entries(updates)) {
    results.push(await upsertSetting(key, value));
  }

  res.json({
    success: true,
    data: results
  });
}));

module.exports = router;
