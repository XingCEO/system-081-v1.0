const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { getCurrentPrice } = require('../utils/pricing');
const { getSystemSettings } = require('../services/settingsService');

const router = express.Router();

const MENU_ITEM_INCLUDE = {
  category: true,
  menuItemAddOns: {
    include: {
      addOnGroup: {
        include: {
          options: true
        }
      }
    }
  }
};

function mapMenuItem(item) {
  return {
    ...item,
    currentPrice: getCurrentPrice(item),
    addOnGroups: item.menuItemAddOns.map((entry) => entry.addOnGroup)
  };
}

router.get('/categories', optionalAuth, asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc'
    },
    include: {
      menuItems: true
    }
  });

  res.json({
    success: true,
    data: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      itemCount: category.menuItems.filter((item) => item.isActive).length
    }))
  });
}));

router.post('/categories', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const category = await prisma.category.create({
    data: {
      name: req.body.name,
      sortOrder: Number(req.body.sortOrder || 0),
      isActive: req.body.isActive ?? true
    }
  });

  res.status(201).json({
    success: true,
    data: category
  });
}));

router.get('/items', optionalAuth, asyncHandler(async (req, res) => {
  const where = {};

  if (req.query.categoryId) {
    where.categoryId = Number(req.query.categoryId);
  }

  if (req.query.search) {
    where.name = {
      contains: req.query.search,
      mode: 'insensitive'
    };
  }

  if (req.query.all !== 'true') {
    where.isActive = true;
  }

  const items = await prisma.menuItem.findMany({
    where,
    include: MENU_ITEM_INCLUDE,
    orderBy: [
      { categoryId: 'asc' },
      { name: 'asc' }
    ]
  });

  res.json({
    success: true,
    data: items.map(mapMenuItem)
  });
}));

router.post('/items', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const { addOnGroupIds = [], ...payload } = req.body;

  const item = await prisma.menuItem.create({
    data: {
      name: payload.name,
      categoryId: Number(payload.categoryId),
      basePrice: Number(payload.basePrice),
      cost: Number(payload.cost || 0),
      stock: Number(payload.stock || 0),
      stockAlert: Number(payload.stockAlert || 5),
      isActive: payload.isActive ?? true,
      timePricing: payload.timePricing || [],
      emoji: payload.emoji || null,
      description: payload.description || null,
      imageUrl: payload.imageUrl || null,
      menuItemAddOns: {
        create: addOnGroupIds.map((groupId) => ({
          addOnGroupId: Number(groupId)
        }))
      }
    },
    include: MENU_ITEM_INCLUDE
  });

  res.status(201).json({
    success: true,
    data: mapMenuItem(item)
  });
}));

router.put('/items/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { addOnGroupIds, ...payload } = req.body;

  if (Array.isArray(addOnGroupIds)) {
    await prisma.menuItemAddOnGroup.deleteMany({
      where: {
        menuItemId: id
      }
    });
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: Number(payload.categoryId) } : {}),
      ...(payload.basePrice !== undefined ? { basePrice: Number(payload.basePrice) } : {}),
      ...(payload.cost !== undefined ? { cost: Number(payload.cost) } : {}),
      ...(payload.stock !== undefined ? { stock: Number(payload.stock) } : {}),
      ...(payload.stockAlert !== undefined ? { stockAlert: Number(payload.stockAlert) } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.timePricing !== undefined ? { timePricing: payload.timePricing } : {}),
      ...(payload.emoji !== undefined ? { emoji: payload.emoji } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.imageUrl !== undefined ? { imageUrl: payload.imageUrl } : {}),
      ...(Array.isArray(addOnGroupIds)
        ? {
            menuItemAddOns: {
              create: addOnGroupIds.map((groupId) => ({
                addOnGroupId: Number(groupId)
              }))
            }
          }
        : {})
    },
    include: MENU_ITEM_INCLUDE
  });

  res.json({
    success: true,
    data: mapMenuItem(item)
  });
}));

router.delete('/items/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const item = await prisma.menuItem.update({
    where: { id: Number(req.params.id) },
    data: { isActive: false }
  });

  res.json({
    success: true,
    data: item
  });
}));

router.get('/addons', optionalAuth, asyncHandler(async (_req, res) => {
  const groups = await prisma.addOnGroup.findMany({
    include: {
      options: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  res.json({
    success: true,
    data: groups
  });
}));

router.post('/addons', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const group = await prisma.addOnGroup.create({
    data: {
      name: req.body.name,
      required: req.body.required ?? false,
      maxSelect: Number(req.body.maxSelect || 1),
      options: {
        create: (req.body.options || []).map((option) => ({
          name: option.name,
          price: Number(option.price || 0)
        }))
      }
    },
    include: {
      options: true
    }
  });

  res.status(201).json({
    success: true,
    data: group
  });
}));

router.put('/addons/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.addOnOption.deleteMany({
    where: {
      groupId: id
    }
  });

  const group = await prisma.addOnGroup.update({
    where: { id },
    data: {
      name: req.body.name,
      required: req.body.required ?? false,
      maxSelect: Number(req.body.maxSelect || 1),
      options: {
        create: (req.body.options || []).map((option) => ({
          name: option.name,
          price: Number(option.price || 0)
        }))
      }
    },
    include: {
      options: true
    }
  });

  res.json({
    success: true,
    data: group
  });
}));

router.delete('/addons/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  await prisma.addOnGroup.delete({
    where: { id: Number(req.params.id) }
  });

  res.json({
    success: true,
    message: '已刪除加料群組'
  });
}));

router.patch('/items/:id/stock', authenticate, authorize('OWNER', 'MANAGER', 'STAFF'), asyncHandler(async (req, res) => {
  const stock = Number(req.body.stock);

  if (Number.isNaN(stock)) {
    throw new HttpError(400, '請提供正確庫存數量');
  }

  const item = await prisma.menuItem.update({
    where: { id: Number(req.params.id) },
    data: { stock }
  });

  res.json({
    success: true,
    data: item
  });
}));

router.get('/availability', optionalAuth, asyncHandler(async (_req, res) => {
  const { orderingState } = await getSystemSettings();
  const items = await prisma.menuItem.findMany({
    where: {
      isActive: true
    },
    include: MENU_ITEM_INCLUDE
  });

  res.json({
    success: true,
    data: {
      paused: Boolean(orderingState?.paused),
      items: items.map((item) => ({
        ...mapMenuItem(item),
        available: item.stock > 0 && !orderingState?.paused
      }))
    }
  });
}));

module.exports = router;
