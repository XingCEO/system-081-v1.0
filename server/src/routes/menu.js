// 菜單路由 - 分類、品項、選項 CRUD
const express = require('express');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ==================== 分類 ====================

// GET /api/menu/categories - 取得所有分類
router.get('/categories', optionalAuth, async (req, res, next) => {
  try {
    const where = req.query.all === 'true' ? {} : { isActive: true };
    const categories = await req.prisma.category.findMany({
      where,
      include: { items: { where: { isActive: true }, select: { id: true } } },
      orderBy: { sortOrder: 'asc' }
    });

    // 附加每個分類的品項數量
    const result = categories.map(c => ({
      ...c,
      itemCount: c.items.length,
      items: undefined
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/menu/categories - 新增分類
router.post('/categories', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, description, icon, color, sortOrder } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '分類名稱為必填' });
    }

    const category = await req.prisma.category.create({
      data: { name, description, icon, color, sortOrder: sortOrder || 0 }
    });

    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/categories/:id - 更新分類
router.put('/categories/:id', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const category = await req.prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/categories/:id - 刪除分類
router.delete('/categories/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // 檢查是否有品項
    const itemCount = await req.prisma.menuItem.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return res.status(400).json({
        success: false,
        message: `此分類下有 ${itemCount} 個品項，請先移除或轉移品項`
      });
    }

    await req.prisma.category.delete({ where: { id } });
    res.json({ success: true, message: '分類已刪除' });
  } catch (err) {
    next(err);
  }
});

// ==================== 品項 ====================

// GET /api/menu/items - 取得菜單品項
router.get('/items', optionalAuth, async (req, res, next) => {
  try {
    const { categoryId, search, all, featured } = req.query;
    const where = {};

    if (all !== 'true') where.isActive = true;
    if (categoryId) where.categoryId = parseInt(categoryId);
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } }
      ];
    }

    const items = await req.prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, color: true } },
        options: {
          include: { choices: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' }
        },
        timePrices: { where: { isActive: true } }
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
    });

    // 計算當前有效價格
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay() || 7; // 轉換為 1-7

    const result = items.map(item => {
      let currentPrice = item.basePrice;

      // 檢查時段定價
      for (const tp of item.timePrices) {
        const days = JSON.parse(tp.daysOfWeek);
        if (days.includes(currentDay) && currentTime >= tp.startTime && currentTime <= tp.endTime) {
          currentPrice = tp.price;
          break;
        }
      }

      return { ...item, currentPrice };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/menu/items/:id - 取得單一品項
router.get('/items/:id', optionalAuth, async (req, res, next) => {
  try {
    const item = await req.prisma.menuItem.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        category: true,
        options: {
          include: { choices: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' }
        },
        timePrices: true
      }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: '品項不存在' });
    }

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// POST /api/menu/items - 新增品項
router.post('/items', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, categoryId, basePrice, options, timePrices, ...rest } = req.body;

    if (!name || !categoryId || basePrice === undefined) {
      return res.status(400).json({ success: false, message: '品名、分類、價格為必填' });
    }

    const item = await req.prisma.menuItem.create({
      data: {
        name,
        categoryId: parseInt(categoryId),
        basePrice: parseFloat(basePrice),
        ...rest,
        // 同時建立選項
        ...(options && {
          options: {
            create: options.map((opt, i) => ({
              name: opt.name,
              type: opt.type || 'single',
              isRequired: opt.isRequired || false,
              maxSelect: opt.maxSelect || 1,
              sortOrder: i,
              choices: {
                create: (opt.choices || []).map((c, j) => ({
                  name: c.name,
                  priceAdjust: c.priceAdjust || 0,
                  isDefault: c.isDefault || false,
                  sortOrder: j
                }))
              }
            }))
          }
        }),
        // 同時建立時段定價
        ...(timePrices && {
          timePrices: {
            create: timePrices.map(tp => ({
              name: tp.name,
              price: parseFloat(tp.price),
              startTime: tp.startTime,
              endTime: tp.endTime,
              daysOfWeek: tp.daysOfWeek || '[1,2,3,4,5,6,7]'
            }))
          }
        })
      },
      include: {
        category: true,
        options: { include: { choices: true } },
        timePrices: true
      }
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// PUT /api/menu/items/:id - 更新品項
router.put('/items/:id', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { options, timePrices, ...data } = req.body;

    if (data.basePrice) data.basePrice = parseFloat(data.basePrice);
    if (data.categoryId) data.categoryId = parseInt(data.categoryId);

    // 更新選項（如果提供）
    if (options) {
      // 刪除舊選項
      await req.prisma.menuOption.deleteMany({ where: { menuItemId: id } });
      // 建立新選項
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await req.prisma.menuOption.create({
          data: {
            menuItemId: id,
            name: opt.name,
            type: opt.type || 'single',
            isRequired: opt.isRequired || false,
            maxSelect: opt.maxSelect || 1,
            sortOrder: i,
            choices: {
              create: (opt.choices || []).map((c, j) => ({
                name: c.name,
                priceAdjust: c.priceAdjust || 0,
                isDefault: c.isDefault || false,
                sortOrder: j
              }))
            }
          }
        });
      }
    }

    // 更新時段定價（如果提供）
    if (timePrices) {
      await req.prisma.menuItemTimePrice.deleteMany({ where: { menuItemId: id } });
      for (const tp of timePrices) {
        await req.prisma.menuItemTimePrice.create({
          data: {
            menuItemId: id,
            name: tp.name,
            price: parseFloat(tp.price),
            startTime: tp.startTime,
            endTime: tp.endTime,
            daysOfWeek: tp.daysOfWeek || '[1,2,3,4,5,6,7]'
          }
        });
      }
    }

    const item = await req.prisma.menuItem.update({
      where: { id },
      data,
      include: {
        category: true,
        options: { include: { choices: true } },
        timePrices: true
      }
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/menu/items/:id - 刪除品項
router.delete('/items/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    // 軟刪除（停用而不是真正刪除）
    await req.prisma.menuItem.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, message: '品項已停用' });
  } catch (err) {
    next(err);
  }
});

// POST /api/menu/items/reorder - 排序品項
router.post('/items/reorder', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { items } = req.body; // [{ id, sortOrder }]

    for (const item of items) {
      await req.prisma.menuItem.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder }
      });
    }

    res.json({ success: true, message: '排序已更新' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
