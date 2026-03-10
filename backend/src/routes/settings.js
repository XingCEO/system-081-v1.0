const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize } = require('../middleware/auth');
const { getSystemSettings, upsertSetting } = require('../services/settingsService');
const { exportFullBackup, restoreFullBackup } = require('../services/backupService');

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

router.get('/backup', asyncHandler(async (_req, res) => {
  const backup = await exportFullBackup();

  res.json({
    success: true,
    data: backup
  });
}));

router.post('/restore', authorize('OWNER'), asyncHandler(async (req, res) => {
  const { data, replaceAll = true } = req.body || {};

  if (!data) {
    throw new HttpError(400, '請提供要還原的備份資料。');
  }

  const result = await restoreFullBackup(data, { replaceAll });

  res.json({
    success: true,
    data: result
  });
}));

module.exports = router;
