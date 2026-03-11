const express = require('express');

const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/HttpError');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { getCurrentPrice } = require('../utils/pricing');
const { getSystemSettings } = require('../services/settingsService');
const { withPrismaRetry } = require('../utils/prismaRetry');
const {
  normalizeString,
  optionalString,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parsePositiveInteger,
  requireString
} = require('../utils/validation');

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

function normalizeComboConfig(config) {
  return Array.isArray(config) ? config : [];
}

function normalizeExternalCode(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function sanitizeItemPayload(payload) {
  return {
    name: requireString(payload.name, '品項名稱', { maxLength: 80 }),
    externalCode: payload.externalCode !== undefined ? normalizeExternalCode(payload.externalCode) : undefined,
    categoryId: parsePositiveInteger(payload.categoryId, '分類編號', { min: 1, max: 999999 }),
    basePrice: parseNonNegativeNumber(payload.basePrice, '售價'),
    cost: parseNonNegativeNumber(payload.cost || 0, '成本'),
    stock: parseNonNegativeInteger(payload.stock || 0, '庫存'),
    stockAlert: parseNonNegativeInteger(payload.stockAlert || 5, '庫存警戒值'),
    isActive: payload.isActive ?? true,
    isCombo: payload.isCombo ?? false,
    timePricing: payload.timePricing || [],
    comboConfig: payload.comboConfig || [],
    emoji: optionalString(payload.emoji, { maxLength: 8 }),
    description: optionalString(payload.description, { maxLength: 280 }),
    imageUrl: optionalString(payload.imageUrl, { maxLength: 500 })
  };
}

async function findExistingMenuItem(tx, itemInput, categoryId) {
  const externalCode = normalizeExternalCode(itemInput.externalCode);

  if (externalCode) {
    const byExternalCode = await tx.menuItem.findUnique({
      where: {
        externalCode
      }
    });

    if (byExternalCode) {
      return byExternalCode;
    }
  }

  return tx.menuItem.findFirst({
    where: {
      name: itemInput.name,
      categoryId
    }
  });
}

function assertImportPayload(items) {
  const seenExternalCodes = new Set();

  items.forEach((item) => {
    const name = normalizeString(item.name);
    if (!name) {
      throw new HttpError(400, '匯入品項缺少名稱');
    }

    const externalCode = normalizeExternalCode(item.externalCode);
    if (externalCode) {
      if (seenExternalCodes.has(externalCode)) {
        throw new HttpError(400, `匯入資料中的 externalCode 重複：${externalCode}`);
      }

      seenExternalCodes.add(externalCode);
    }
  });
}

function buildComboGroups(item, menuItemMap) {
  return normalizeComboConfig(item.comboConfig).map((group) => ({
    ...group,
    options: (group.options || []).map((option) => {
      const targetItem = menuItemMap.get(Number(option.menuItemId));
      return {
        ...option,
        menuItemId: Number(option.menuItemId),
        name: option.name || targetItem?.name || `品項 ${option.menuItemId}`,
        emoji: option.emoji || targetItem?.emoji || null,
        imageUrl: option.imageUrl || targetItem?.imageUrl || null,
        available: Boolean(targetItem?.isActive && targetItem?.stock > 0),
        stock: targetItem?.stock ?? 0
      };
    })
  }));
}

function isComboItemAvailable(item, menuItemMap) {
  if (!item.isCombo) {
    return item.stock > 0;
  }

  const comboGroups = buildComboGroups(item, menuItemMap);
  return comboGroups.every((group) => {
    if (!group.required) {
      return true;
    }

    return (group.options || []).some((option) => option.available);
  });
}

async function upsertCategory(tx, categoryInput) {
  const existing = await tx.category.findFirst({
    where: {
      name: requireString(categoryInput.name, '分類名稱', { maxLength: 60 })
    }
  });

  const name = requireString(categoryInput.name, '分類名稱', { maxLength: 60 });

  if (existing) {
    return tx.category.update({
      where: { id: existing.id },
      data: {
        name,
        sortOrder: Number(categoryInput.sortOrder || 0),
        isActive: categoryInput.isActive ?? true
      }
    });
  }

  return tx.category.create({
    data: {
      name,
      sortOrder: Number(categoryInput.sortOrder || 0),
      isActive: categoryInput.isActive ?? true
    }
  });
}

async function upsertAddOnGroup(tx, groupInput) {
  const name = requireString(groupInput.name, '加料群組名稱', { maxLength: 60 });
  const existing = await tx.addOnGroup.findFirst({
    where: {
      name
    }
  });

  if (existing) {
    await tx.addOnOption.deleteMany({
      where: {
        groupId: existing.id
      }
    });

    return tx.addOnGroup.update({
      where: { id: existing.id },
      data: {
        name,
        required: groupInput.required ?? false,
        maxSelect: Number(groupInput.maxSelect || 1),
        options: {
          create: (groupInput.options || []).map((option) => ({
            name: requireString(option.name, '加料選項名稱', { maxLength: 60 }),
            price: parseNonNegativeNumber(option.price || 0, '加料價格')
          }))
        }
      },
      include: {
        options: true
      }
    });
  }

  return tx.addOnGroup.create({
    data: {
      name,
      required: groupInput.required ?? false,
      maxSelect: Number(groupInput.maxSelect || 1),
      options: {
        create: (groupInput.options || []).map((option) => ({
          name: requireString(option.name, '加料選項名稱', { maxLength: 60 }),
          price: parseNonNegativeNumber(option.price || 0, '加料價格')
        }))
      }
    },
    include: {
      options: true
    }
  });
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
      name: requireString(req.body.name, '分類名稱', { maxLength: 60 }),
      sortOrder: Number(req.body.sortOrder || 0),
      isActive: req.body.isActive ?? true
    }
  });

  res.status(201).json({
    success: true,
    data: category
  });
}));

router.put('/categories/:id', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const category = await prisma.category.update({
    where: {
      id: Number(req.params.id)
    },
    data: {
      ...(req.body.name !== undefined ? { name: requireString(req.body.name, '分類名稱', { maxLength: 60 }) } : {}),
      ...(req.body.sortOrder !== undefined ? { sortOrder: Number(req.body.sortOrder) } : {}),
      ...(req.body.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {})
    }
  });

  res.json({
    success: true,
    data: category
  });
}));

router.get('/export', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: {
      sortOrder: 'asc'
    }
  });
  const addOnGroups = await prisma.addOnGroup.findMany({
    include: {
      options: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  const items = await prisma.menuItem.findMany({
    include: MENU_ITEM_INCLUDE,
    orderBy: [
      { categoryId: 'asc' },
      { name: 'asc' }
    ]
  });

  res.json({
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      categories: categories.map((category) => ({
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: category.isActive
      })),
      addOnGroups: addOnGroups.map((group) => ({
        name: group.name,
        required: group.required,
        maxSelect: group.maxSelect,
        options: group.options.map((option) => ({
          name: option.name,
          price: option.price
        }))
      })),
      items: items.map((item) => ({
        name: item.name,
        externalCode: item.externalCode,
        categoryName: item.category.name,
        basePrice: item.basePrice,
        cost: item.cost,
        stock: item.stock,
        stockAlert: item.stockAlert,
        isActive: item.isActive,
        isCombo: item.isCombo,
        emoji: item.emoji,
        description: item.description,
        imageUrl: item.imageUrl,
        timePricing: item.timePricing || [],
        comboConfig: item.comboConfig || [],
        addOnGroupNames: item.menuItemAddOns.map((entry) => entry.addOnGroup.name)
      }))
    }
  });
}));

router.post('/import', authenticate, authorize('OWNER', 'MANAGER'), asyncHandler(async (req, res) => {
  const importPayload = req.body.data || req.body;
  const replaceAll = Boolean(req.body.replaceAll);
  const categories = Array.isArray(importPayload.categories) ? importPayload.categories : [];
  const addOnGroups = Array.isArray(importPayload.addOnGroups) ? importPayload.addOnGroups : [];
  const items = Array.isArray(importPayload.items) ? importPayload.items : [];

  if (categories.length === 0 || items.length === 0) {
    throw new HttpError(400, '匯入資料至少需要 categories 與 items');
  }

  assertImportPayload(items);

  const result = await withPrismaRetry(() => prisma.$transaction(async (tx) => {
    if (replaceAll) {
      await tx.menuItem.updateMany({
        data: { isActive: false },
        where: {}
      });
      await tx.category.updateMany({
        data: { isActive: false },
        where: {}
      });
      await tx.menuItemAddOnGroup.deleteMany({});
      await tx.addOnOption.deleteMany({});
      await tx.addOnGroup.deleteMany({});
    }

    const categoryMap = new Map();
    for (const categoryInput of categories) {
      const category = await upsertCategory(tx, categoryInput);
      categoryMap.set(category.name, category);
    }

    const addOnGroupMap = new Map();
    for (const groupInput of addOnGroups) {
      const group = await upsertAddOnGroup(tx, groupInput);
      addOnGroupMap.set(group.name, group);
    }

    let importedItems = 0;

    for (const itemInput of items) {
      const category = categoryMap.get(itemInput.categoryName || itemInput.category);
      if (!category) {
        throw new HttpError(400, `找不到品項分類：${itemInput.categoryName || itemInput.category}`);
      }

      const existingItem = await findExistingMenuItem(tx, itemInput, category.id);

      const itemData = {
        name: requireString(itemInput.name, '品項名稱', { maxLength: 80 }),
        externalCode: normalizeExternalCode(itemInput.externalCode),
        categoryId: category.id,
        basePrice: parseNonNegativeNumber(itemInput.basePrice || 0, '售價'),
        cost: parseNonNegativeNumber(itemInput.cost || 0, '成本'),
        stock: parseNonNegativeInteger(itemInput.stock || 0, '庫存'),
        stockAlert: parseNonNegativeInteger(itemInput.stockAlert || 5, '庫存警戒值'),
        isActive: itemInput.isActive ?? true,
        isCombo: itemInput.isCombo ?? false,
        emoji: optionalString(itemInput.emoji, { maxLength: 8 }),
        description: optionalString(itemInput.description, { maxLength: 280 }),
        imageUrl: optionalString(itemInput.imageUrl, { maxLength: 500 }),
        timePricing: itemInput.timePricing || [],
        comboConfig: itemInput.comboConfig || []
      };

      const menuItem = existingItem
        ? await tx.menuItem.update({
            where: { id: existingItem.id },
            data: itemData
          })
        : await tx.menuItem.create({
            data: itemData
          });

      await tx.menuItemAddOnGroup.deleteMany({
        where: {
          menuItemId: menuItem.id
        }
      });

      const linkedGroupNames = [...new Set(
        (itemInput.addOnGroupNames || itemInput.addOnGroups || [])
          .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
          .filter(Boolean)
      )];
      for (const groupName of linkedGroupNames) {
        const group = addOnGroupMap.get(groupName);
        if (!group) {
          continue;
        }

        await tx.menuItemAddOnGroup.create({
          data: {
            menuItemId: menuItem.id,
            addOnGroupId: group.id
          }
        });
      }

      importedItems += 1;
    }

    return {
      importedCategories: categoryMap.size,
      importedAddOnGroups: addOnGroupMap.size,
      importedItems
    };
  }), {
    retries: 3,
    baseDelayMs: 80
  });

  res.json({
    success: true,
    data: result
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
  const itemPayload = sanitizeItemPayload(payload);

  const item = await prisma.menuItem.create({
    data: {
      ...itemPayload,
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
      ...(payload.name !== undefined ? { name: requireString(payload.name, '品項名稱', { maxLength: 80 }) } : {}),
      ...(payload.externalCode !== undefined ? { externalCode: normalizeExternalCode(payload.externalCode) } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: Number(payload.categoryId) } : {}),
      ...(payload.basePrice !== undefined ? { basePrice: parseNonNegativeNumber(payload.basePrice, '售價') } : {}),
      ...(payload.cost !== undefined ? { cost: parseNonNegativeNumber(payload.cost, '成本') } : {}),
      ...(payload.stock !== undefined ? { stock: parseNonNegativeInteger(payload.stock, '庫存') } : {}),
      ...(payload.stockAlert !== undefined ? { stockAlert: parseNonNegativeInteger(payload.stockAlert, '庫存警戒值') } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.isCombo !== undefined ? { isCombo: Boolean(payload.isCombo) } : {}),
      ...(payload.timePricing !== undefined ? { timePricing: payload.timePricing } : {}),
      ...(payload.comboConfig !== undefined ? { comboConfig: payload.comboConfig } : {}),
      ...(payload.emoji !== undefined ? { emoji: optionalString(payload.emoji, { maxLength: 8 }) } : {}),
      ...(payload.description !== undefined ? { description: optionalString(payload.description, { maxLength: 280 }) } : {}),
      ...(payload.imageUrl !== undefined ? { imageUrl: optionalString(payload.imageUrl, { maxLength: 500 }) } : {}),
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
      name: requireString(req.body.name, '加料群組名稱', { maxLength: 60 }),
      required: req.body.required ?? false,
      maxSelect: Number(req.body.maxSelect || 1),
      options: {
        create: (req.body.options || []).map((option) => ({
          name: requireString(option.name, '加料選項名稱', { maxLength: 60 }),
          price: parseNonNegativeNumber(option.price || 0, '加料價格')
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
      name: requireString(req.body.name, '加料群組名稱', { maxLength: 60 }),
      required: req.body.required ?? false,
      maxSelect: Number(req.body.maxSelect || 1),
      options: {
        create: (req.body.options || []).map((option) => ({
          name: requireString(option.name, '加料選項名稱', { maxLength: 60 }),
          price: parseNonNegativeNumber(option.price || 0, '加料價格')
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
  const stock = parseNonNegativeInteger(req.body.stock, '庫存數量');

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
  const { orderingState, pointsRule } = await getSystemSettings();
  const items = await prisma.menuItem.findMany({
    where: {
      isActive: true
    },
      include: MENU_ITEM_INCLUDE
  });
  const menuItemMap = new Map(items.map((item) => [item.id, item]));

  res.json({
    success: true,
    data: {
      paused: Boolean(orderingState?.paused),
      pointsRule,
      items: items.map((item) => ({
        ...mapMenuItem(item),
        comboGroups: item.isCombo ? buildComboGroups(item, menuItemMap) : [],
        available: isComboItemAvailable(item, menuItemMap) && !orderingState?.paused
      }))
    }
  });
}));

module.exports = router;
