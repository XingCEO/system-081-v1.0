// 系統設定路由
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings - 取得所有設定
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { group } = req.query;
    const where = group ? { group } : {};
    const settings = await req.prisma.setting.findMany({ where });

    // 轉換為 key-value 格式
    const result = {};
    for (const s of settings) {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    }

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/:key - 取得單一設定
router.get('/:key', authenticate, async (req, res, next) => {
  try {
    const setting = await req.prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) {
      return res.status(404).json({ success: false, message: '設定不存在' });
    }

    let value;
    try { value = JSON.parse(setting.value); } catch { value = setting.value; }

    res.json({ success: true, data: { ...setting, value } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key - 更新設定
router.put('/:key', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { value, group, description } = req.body;
    const data = { value: typeof value === 'string' ? value : JSON.stringify(value) };
    if (group) data.group = group;
    if (description) data.description = description;

    const setting = await req.prisma.setting.upsert({
      where: { key: req.params.key },
      update: data,
      create: { key: req.params.key, ...data }
    });

    res.json({ success: true, data: setting });
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/batch - 批量更新設定
router.post('/batch', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { settings } = req.body; // { key: value, ... }

    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await req.prisma.setting.upsert({
        where: { key },
        update: { value: typeof value === 'string' ? value : JSON.stringify(value) },
        create: { key, value: typeof value === 'string' ? value : JSON.stringify(value) }
      });
      results.push(result);
    }

    res.json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
