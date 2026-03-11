const dayjs = require('dayjs');
const { Prisma } = require('@prisma/client');

const prisma = require('../lib/prisma');
const HttpError = require('../utils/HttpError');
const { generateOrderNumber } = require('../utils/order');
const { calculatePoints, getCurrentPrice } = require('../utils/pricing');
const { getSystemSettings } = require('./settingsService');
const {
  normalizePhone,
  optionalString,
  parseNonNegativeInteger,
  parseNonNegativeNumber,
  parsePositiveInteger
} = require('../utils/validation');
const {
  notifyNewOrder,
  notifyPickupReminder,
  notifySalesTargetIfNeeded,
  notifyStockAlert
} = require('./notificationService');
const { printReceipt, printKitchenTicket } = require('./printerService');
const socket = require('../lib/socket');

const ORDER_INCLUDE = {
  table: true,
  staff: {
    select: {
      id: true,
      name: true,
      role: true
    }
  },
  member: true,
  deliveryOrder: true,
  items: {
    include: {
      menuItem: true
    }
  }
};

const ORDER_STATUS_TRANSITIONS = {
  PENDING: ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: []
};

function normalizePaymentMethod(method) {
  if (!method) {
    return null;
  }

  const normalized = String(method).toUpperCase();
  const allowed = ['CASH', 'CARD', 'LINE_PAY', 'TRANSFER', 'OTHER'];

  if (!allowed.includes(normalized)) {
    throw new HttpError(400, '不支援的付款方式');
  }

  return normalized;
}

function buildNameKey(name) {
  return String(name || '').trim().toLowerCase();
}

function normalizeComboGroups(config) {
  return Array.isArray(config) ? config : [];
}

function normalizeAddons(rawItem) {
  if (Array.isArray(rawItem.addons)) {
    return rawItem.addons;
  }

  if (Array.isArray(rawItem.options)) {
    return rawItem.options;
  }

  return [];
}

function normalizeComboSelections(rawItem) {
  return Array.isArray(rawItem.comboSelections) ? rawItem.comboSelections : [];
}

function sanitizeTrustedAddons(rawAddons) {
  return rawAddons.map((addon) => {
    const name = String(addon.name || '').trim();

    if (!name) {
      throw new HttpError(400, '加料名稱不可為空');
    }

    return {
      kind: 'addon',
      id: addon.id ? Number(addon.id) : undefined,
      groupId: addon.groupId ? Number(addon.groupId) : undefined,
      groupName: addon.groupName || null,
      name,
      price: parseNonNegativeNumber(addon.price ?? addon.priceAdjust ?? 0, '加料金額')
    };
  });
}

function resolveAddonMatch(groups, rawAddon) {
  const rawGroupId = rawAddon.groupId ? Number(rawAddon.groupId) : null;
  const rawOptionId = rawAddon.id ? Number(rawAddon.id) : rawAddon.optionId ? Number(rawAddon.optionId) : null;
  const rawName = String(rawAddon.name || '').trim().toLowerCase();

  for (const group of groups) {
    if (rawGroupId && group.id !== rawGroupId) {
      continue;
    }

    const option = group.options.find((entry) => {
      if (rawOptionId && entry.id === rawOptionId) {
        return true;
      }

      return rawName && entry.name.trim().toLowerCase() === rawName;
    });

    if (option) {
      return { group, option };
    }
  }

  return null;
}

function validateAndBuildAddons(menuItem, rawAddons, options = {}) {
  if (options.trustSubmittedPrices) {
    return sanitizeTrustedAddons(Array.isArray(rawAddons) ? rawAddons : []);
  }

  if (!Array.isArray(rawAddons) || rawAddons.length === 0) {
    const requiredGroup = (menuItem.menuItemAddOns || [])
      .map((entry) => entry.addOnGroup)
      .find((group) => group.required);

    if (requiredGroup) {
      throw new HttpError(400, `品項「${menuItem.name}」缺少必選加料群組「${requiredGroup.name}」`);
    }

    return [];
  }

  const groups = (menuItem.menuItemAddOns || []).map((entry) => entry.addOnGroup);
  const selectionsByGroup = new Map(groups.map((group) => [group.id, []]));
  const normalizedAddons = [];

  rawAddons.forEach((rawAddon) => {
    const matched = resolveAddonMatch(groups, rawAddon);

    if (!matched) {
      throw new HttpError(400, `品項「${menuItem.name}」包含無效加料選項`);
    }

    const selectedOptions = selectionsByGroup.get(matched.group.id);
    if (selectedOptions.includes(matched.option.id)) {
      throw new HttpError(400, `加料選項「${matched.option.name}」不可重複選擇`);
    }

    selectedOptions.push(matched.option.id);

    if (selectedOptions.length > Number(matched.group.maxSelect || 1)) {
      throw new HttpError(400, `加料群組「${matched.group.name}」超過可選上限`);
    }

    normalizedAddons.push({
      kind: 'addon',
      id: matched.option.id,
      groupId: matched.group.id,
      groupName: matched.group.name,
      name: matched.option.name,
      price: Number(matched.option.price || 0)
    });
  });

  groups.forEach((group) => {
    if (group.required && (selectionsByGroup.get(group.id) || []).length === 0) {
      throw new HttpError(400, `品項「${menuItem.name}」缺少必選加料群組「${group.name}」`);
    }
  });

  return normalizedAddons;
}

function validateSubmittedStatus(status) {
  if (!ORDER_STATUS_TRANSITIONS[status]) {
    throw new HttpError(400, '不支援的訂單狀態');
  }
}

async function resolveTable(tx, payload) {
  if (payload.tableId) {
    return tx.table.findUnique({
      where: {
        id: Number(payload.tableId)
      }
    });
  }

  if (payload.tableNumber) {
    return tx.table.findUnique({
      where: {
        number: String(payload.tableNumber).padStart(2, '0')
      }
    });
  }

  return null;
}

async function resolveMember(tx, payload) {
  if (payload.memberId) {
    return tx.member.findUnique({
      where: {
        id: Number(payload.memberId)
      }
    });
  }

  if (payload.memberPhone) {
    return tx.member.findUnique({
      where: {
        phone: normalizePhone(payload.memberPhone)
      }
    });
  }

  return null;
}

function buildLookup(menuItems) {
  return {
    byId: new Map(menuItems.map((item) => [item.id, item])),
    byExternalCode: new Map(menuItems.filter((item) => item.externalCode).map((item) => [item.externalCode, item])),
    byName: new Map(menuItems.map((item) => [buildNameKey(item.name), item]))
  };
}

function resolveOrderedMenuItem(rawItem, lookup) {
  if (rawItem.menuItemId && lookup.byId.has(Number(rawItem.menuItemId))) {
    return lookup.byId.get(Number(rawItem.menuItemId));
  }

  if (rawItem.externalCode && lookup.byExternalCode.has(String(rawItem.externalCode))) {
    return lookup.byExternalCode.get(String(rawItem.externalCode));
  }

  if (rawItem.menuItemName && lookup.byName.has(buildNameKey(rawItem.menuItemName))) {
    return lookup.byName.get(buildNameKey(rawItem.menuItemName));
  }

  if (rawItem.name && lookup.byName.has(buildNameKey(rawItem.name))) {
    return lookup.byName.get(buildNameKey(rawItem.name));
  }

  return null;
}

function reserveStock(stockReservations, menuItem, quantity) {
  const reserved = stockReservations.get(menuItem.id) || 0;
  const remaining = menuItem.stock - reserved - quantity;

  if (remaining < 0) {
    throw new HttpError(400, `${menuItem.name} 庫存不足，目前剩餘 ${Math.max(0, menuItem.stock - reserved)} 份`);
  }

  stockReservations.set(menuItem.id, reserved + quantity);
}

function buildStockSnapshots(stockReservations, menuItemMap) {
  return [...stockReservations.entries()].map(([id, reserved]) => {
    const item = menuItemMap.get(id);
    return {
      id,
      name: item.name,
      stockAlert: item.stockAlert,
      newStock: item.stock - reserved
    };
  });
}

function extractComboOptionIds(menuItems) {
  return [...new Set(
    menuItems
      .flatMap((item) => normalizeComboGroups(item.comboConfig))
      .flatMap((group) => group.options || [])
      .map((option) => Number(option.menuItemId))
      .filter(Boolean)
  )];
}

function resolveComboSelection(group, rawSelection, menuItemLookup) {
  const matchedOption = (group.options || []).find((option) => {
    if (rawSelection.menuItemId && Number(option.menuItemId) === Number(rawSelection.menuItemId)) {
      return true;
    }

    if (rawSelection.externalCode && String(option.externalCode || '') === String(rawSelection.externalCode)) {
      return true;
    }

    return buildNameKey(option.name) === buildNameKey(rawSelection.name);
  });

  if (!matchedOption) {
    throw new HttpError(400, `套餐群組「${group.name}」的選項無效`);
  }

  const targetItem = menuItemLookup.byId.get(Number(matchedOption.menuItemId));
  if (!targetItem || !targetItem.isActive) {
    throw new HttpError(400, `套餐選項「${matchedOption.name || matchedOption.menuItemId}」目前無法供應`);
  }

  return {
    kind: 'combo',
    groupName: group.name,
    menuItemId: targetItem.id,
    name: matchedOption.name || targetItem.name,
    emoji: matchedOption.emoji || targetItem.emoji || null,
    price: Number(matchedOption.priceAdjust || matchedOption.price || 0)
  };
}

function validateAndBuildComboSelections(menuItem, rawSelections, menuItemLookup, stockReservations, quantity) {
  const comboGroups = normalizeComboGroups(menuItem.comboConfig);
  const comboSelections = [];

  comboGroups.forEach((group) => {
    const groupSelections = rawSelections.filter((selection) => buildNameKey(selection.groupName) === buildNameKey(group.name));
    const maxSelect = Number(group.maxSelect || 1);

    if (group.required && groupSelections.length === 0) {
      throw new HttpError(400, `套餐「${menuItem.name}」缺少必選群組「${group.name}」`);
    }

    if (groupSelections.length > maxSelect) {
      throw new HttpError(400, `套餐群組「${group.name}」超過可選上限`);
    }

    groupSelections.forEach((selection) => {
      const resolved = resolveComboSelection(group, selection, menuItemLookup);
      const selectedItem = menuItemLookup.byId.get(resolved.menuItemId);
      reserveStock(stockReservations, selectedItem, quantity);
      comboSelections.push(resolved);
    });
  });

  return comboSelections;
}

async function prepareOrderItems(tx, rawItems, options = {}) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, '訂單至少需要一筆餐點');
  }

  const menuItemIds = [...new Set(rawItems.map((item) => Number(item.menuItemId)).filter(Boolean))];
  const externalCodes = [...new Set(rawItems.map((item) => item.externalCode).filter(Boolean))];
  const menuItemNames = [...new Set(rawItems.map((item) => item.menuItemName || item.name).filter(Boolean))];

  const menuItems = await tx.menuItem.findMany({
    where: {
      OR: [
        menuItemIds.length > 0 ? { id: { in: menuItemIds } } : undefined,
        externalCodes.length > 0 ? { externalCode: { in: externalCodes } } : undefined,
        menuItemNames.length > 0 ? { name: { in: menuItemNames } } : undefined
      ].filter(Boolean)
    },
    include: {
      menuItemAddOns: {
        include: {
          addOnGroup: {
            include: {
              options: true
            }
          }
        }
      }
    }
  });

  const comboOptionIds = extractComboOptionIds(menuItems);
  const comboOptionItems = comboOptionIds.length > 0
    ? await tx.menuItem.findMany({
        where: {
          id: { in: comboOptionIds }
        }
      })
    : [];

  const allMenuItems = [...menuItems, ...comboOptionItems];
  const lookup = buildLookup(allMenuItems);
  const stockReservations = new Map();

  let subtotal = 0;
  const itemRecords = [];

  rawItems.forEach((rawItem) => {
    const menuItem = resolveOrderedMenuItem(rawItem, lookup);
    const quantity = parsePositiveInteger(rawItem.quantity || 1, '餐點數量', { min: 1, max: 99 });

    if (!menuItem || !menuItem.isActive) {
      throw new HttpError(400, `找不到可販售品項：${rawItem.menuItemId || rawItem.externalCode || rawItem.menuItemName || rawItem.name}`);
    }

    if (!menuItem.isCombo) {
      reserveStock(stockReservations, menuItem, quantity);
    }

    const addons = validateAndBuildAddons(menuItem, normalizeAddons(rawItem), options);

    const comboSelections = menuItem.isCombo
      ? validateAndBuildComboSelections(menuItem, normalizeComboSelections(rawItem), lookup, stockReservations, quantity)
      : [];

    const addonsTotal = addons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
    const comboAdjustTotal = comboSelections.reduce((sum, selection) => sum + Number(selection.price || 0), 0);
    const unitPrice = getCurrentPrice(menuItem) + addonsTotal + comboAdjustTotal;
    subtotal += unitPrice * quantity;

    itemRecords.push({
      menuItemId: menuItem.id,
      quantity,
      unitPrice,
      addons: [...comboSelections, ...addons],
      note: optionalString(rawItem.note, { maxLength: 120 })
    });
  });

  return {
    subtotal,
    itemRecords,
    stockSnapshots: buildStockSnapshots(stockReservations, lookup.byId)
  };
}

async function applyMemberPointChanges(tx, member, orderId, total, redeemPoints, pointsRule) {
  if (!member) {
    return;
  }

  if (member.isBlacklisted) {
    throw new HttpError(403, '此會員已被列入黑名單，無法使用點數或會員優惠');
  }

  const rewardPoints = calculatePoints(total, pointsRule);
  const changeSet = [];
  let delta = 0;

  if (redeemPoints > 0) {
    if (member.points < redeemPoints) {
      throw new HttpError(400, '會員點數不足');
    }

    delta -= redeemPoints;
    changeSet.push({
      memberId: member.id,
      orderId,
      points: redeemPoints,
      type: 'REDEEM',
      note: '訂單點數折抵'
    });
  }

  if (rewardPoints > 0) {
    delta += rewardPoints;
    changeSet.push({
      memberId: member.id,
      orderId,
      points: rewardPoints,
      type: 'EARN',
      note: '訂單消費回饋'
    });
  }

  await tx.member.update({
    where: {
      id: member.id
    },
    data: {
      points: {
        increment: delta
      },
      totalSpent: {
        increment: total
      }
    }
  });

  if (changeSet.length > 0) {
    await tx.pointTransaction.createMany({
      data: changeSet
    });
  }
}

async function createOrder(payload, actor) {
  const { orderingState, pointsRule } = await getSystemSettings();
  const orderType = String(payload.type || 'TAKEOUT').toUpperCase();
  const allowedOrderTypes = ['DINE_IN', 'TAKEOUT', 'DELIVERY', 'PHONE'];

  if (!allowedOrderTypes.includes(orderType)) {
    throw new HttpError(400, '不支援的訂單類型');
  }

  if (orderingState?.paused && !payload.ignorePause) {
    throw new HttpError(423, '目前暫停接單，請稍後再試');
  }

  const redeemPoints = parseNonNegativeInteger(payload.redeemPoints || 0, '折抵點數', { max: 999999 });
  const requestedDiscount = parseNonNegativeNumber(payload.discount ?? payload.discountAmount ?? 0, '折扣金額');
  const canApplyManualDiscount = Boolean(actor);
  const discount = canApplyManualDiscount ? requestedDiscount : 0;

  const executeOrderTransaction = () => prisma.$transaction(async (tx) => {
    const member = await resolveMember(tx, payload);
    const table = await resolveTable(tx, payload);
    const { subtotal, itemRecords, stockSnapshots } = await prepareOrderItems(tx, payload.items, {
      trustSubmittedPrices: Boolean(payload.trustSubmittedPrices)
    });
    const redeemValue = redeemPoints * Number(pointsRule.redeemRate || 1);
    const total = Math.max(0, subtotal - discount - redeemValue);
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
    const receivedAmountInput = parseNonNegativeNumber(payload.receivedAmount || 0, '實收金額');
    const receivedAmount = paymentMethod && paymentMethod !== 'CASH'
      ? Math.max(total, receivedAmountInput)
      : receivedAmountInput;
    const changeAmount = paymentMethod === 'CASH'
      ? Math.max(0, receivedAmount - total)
      : 0;

    if (orderType === 'DINE_IN' && !table) {
      throw new HttpError(400, '內用訂單請選擇桌號');
    }

    if (paymentMethod === 'CASH' && receivedAmount < total) {
      throw new HttpError(400, '現金實收金額不足');
    }

    let order;

    if (payload.mergeExisting && table?.id) {
      const existing = await tx.order.findFirst({
        where: {
          tableId: table.id,
          status: {
            in: ['PENDING', 'PREPARING']
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (existing) {
        await tx.orderItem.createMany({
          data: itemRecords.map((record) => ({
            ...record,
            orderId: existing.id
          }))
        });

        order = await tx.order.update({
          where: { id: existing.id },
          data: {
            subtotal: existing.subtotal + subtotal,
            total: existing.total + total,
            discount: existing.discount + discount + redeemValue,
            memberId: existing.memberId || member?.id || null,
            note: [existing.note, optionalString(payload.note, { maxLength: 300 })].filter(Boolean).join(' / ') || null
          },
          include: ORDER_INCLUDE
        });
      }
    }

    if (!order) {
      order = await tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(tx),
          type: orderType,
          status: payload.status || 'PENDING',
          tableId: table?.id,
          staffId: actor?.id || null,
          memberId: member?.id || null,
          subtotal,
          total,
          paymentMethod,
          note: optionalString(payload.note, { maxLength: 300 }),
          source: payload.source || 'pos',
          discount: discount + redeemValue,
          receivedAmount,
          changeAmount,
          items: {
            create: itemRecords
          }
        },
        include: ORDER_INCLUDE
      });
    }

    for (const stockSnapshot of stockSnapshots) {
      await tx.menuItem.update({
        where: {
          id: stockSnapshot.id
        },
        data: {
          stock: stockSnapshot.newStock
        }
      });
    }

    if (member) {
      await applyMemberPointChanges(tx, member, order.id, total, redeemPoints, pointsRule);
    }

    if (table && orderType === 'DINE_IN') {
      await tx.table.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' }
      });
    }

    if (payload.deliveryMeta) {
      await tx.deliveryOrder.upsert({
        where: { orderId: order.id },
        update: {
          platform: payload.deliveryMeta.platform,
          externalId: payload.deliveryMeta.externalId,
          deliveryAddress: payload.deliveryMeta.deliveryAddress || null,
          status: payload.deliveryMeta.status || 'RECEIVED'
        },
        create: {
          orderId: order.id,
          platform: payload.deliveryMeta.platform,
          externalId: payload.deliveryMeta.externalId,
          deliveryAddress: payload.deliveryMeta.deliveryAddress || null,
          status: payload.deliveryMeta.status || 'RECEIVED'
        }
      });
    }

    const fullOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE
    });

    return {
      order: fullOrder,
      stockSnapshots
    };
  });

  let result;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      result = await executeOrderTransaction();
      break;
    } catch (error) {
      const isDuplicateOrderNumber =
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
        && Array.isArray(error.meta?.target)
        && error.meta.target.includes('orderNumber');

      if (!isDuplicateOrderNumber || attempt === 4) {
        throw error;
      }
    }
  }

  socket.emitOrderNew(result.order);
  await notifyNewOrder(result.order);
  await notifySalesTargetIfNeeded();

  for (const stockSnapshot of result.stockSnapshots) {
    if (stockSnapshot.newStock <= stockSnapshot.stockAlert) {
      socket.emitStockAlert(stockSnapshot);
      await notifyStockAlert({
        name: stockSnapshot.name,
        stock: stockSnapshot.newStock,
        stockAlert: stockSnapshot.stockAlert
      });
    }
  }

  if (payload.autoPrint) {
    await Promise.allSettled([
      printReceipt(result.order),
      printKitchenTicket(result.order)
    ]);
  }

  return result.order;
}

async function getOrderById(id) {
  const order = await prisma.order.findUnique({
    where: { id: Number(id) },
    include: ORDER_INCLUDE
  });

  if (!order) {
    throw new HttpError(404, '找不到訂單');
  }

  return order;
}

async function listKdsOrders() {
  return prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'PREPARING']
      }
    },
    include: ORDER_INCLUDE,
    orderBy: {
      createdAt: 'asc'
    }
  });
}

async function restoreCancelledOrderStock(tx, order) {
  const restored = new Map();

  order.items.forEach((item) => {
    restored.set(item.menuItemId, (restored.get(item.menuItemId) || 0) + item.quantity);

    const modifiers = Array.isArray(item.addons) ? item.addons : [];
    modifiers
      .filter((modifier) => modifier.kind === 'combo' && modifier.menuItemId)
      .forEach((modifier) => {
        restored.set(Number(modifier.menuItemId), (restored.get(Number(modifier.menuItemId)) || 0) + item.quantity);
      });
  });

  for (const [menuItemId, quantity] of restored.entries()) {
    await tx.menuItem.update({
      where: { id: Number(menuItemId) },
      data: {
        stock: {
          increment: quantity
        }
      }
    });
  }
}

async function updateOrderStatus(orderId, status) {
  validateSubmittedStatus(status);

  const result = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: Number(orderId) },
      include: ORDER_INCLUDE
    });

    if (!currentOrder) {
      throw new HttpError(404, '找不到訂單');
    }

    if (currentOrder.status === status) {
      return currentOrder;
    }

    if (!ORDER_STATUS_TRANSITIONS[currentOrder.status].includes(status)) {
      throw new HttpError(409, `訂單狀態無法由 ${currentOrder.status} 變更為 ${status}`);
    }

    const updated = await tx.order.update({
      where: {
        id: Number(orderId)
      },
      data: {
        status
      },
      include: ORDER_INCLUDE
    });

    if (status === 'PREPARING') {
      await tx.orderItem.updateMany({
        where: {
          orderId: updated.id,
          status: 'PENDING'
        },
        data: {
          status: 'PREPARING'
        }
      });
    }

    if (status === 'READY') {
      await tx.orderItem.updateMany({
        where: {
          orderId: updated.id,
          status: {
            in: ['PENDING', 'PREPARING']
          }
        },
        data: {
          status: 'READY'
        }
      });
    }

    if (status === 'COMPLETED' && updated.tableId) {
      await tx.orderItem.updateMany({
        where: {
          orderId: updated.id,
          status: {
            in: ['PENDING', 'PREPARING', 'READY']
          }
        },
        data: {
          status: 'SERVED'
        }
      });

      await tx.table.update({
        where: {
          id: updated.tableId
        },
        data: {
          status: 'AVAILABLE'
        }
      });
    }

    if (status === 'CANCELLED') {
      await tx.orderItem.updateMany({
        where: {
          orderId: updated.id
        },
        data: {
          status: 'CANCELLED'
        }
      });

      await restoreCancelledOrderStock(tx, currentOrder);

      if (updated.tableId) {
        await tx.table.update({
          where: { id: updated.tableId },
          data: { status: 'AVAILABLE' }
        });
      }

      const pointHistory = await tx.pointTransaction.findMany({
        where: {
          orderId: updated.id
        }
      });

      if (updated.memberId && pointHistory.length > 0) {
        let delta = 0;

        pointHistory.forEach((record) => {
          delta += record.type === 'EARN' ? -record.points : record.points;
        });

        await tx.member.update({
          where: {
            id: updated.memberId
          },
          data: {
            points: {
              increment: delta
            },
            totalSpent: {
              decrement: updated.total
            }
          }
        });
      }
    }

    return tx.order.findUnique({
      where: { id: updated.id },
      include: ORDER_INCLUDE
    });
  });

  socket.emitOrderStatusChanged(result);

  if (status === 'READY') {
    socket.emitKitchenCall({
      orderNumber: result.orderNumber,
      type: result.type,
      tableNumber: result.table?.number || null
    });
    await notifyPickupReminder(result);
  }

  return result;
}

async function listOrders(filters = {}) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.type) {
    where.type = filters.type;
  }

  if (filters.source) {
    where.source = filters.source;
  }

  if (filters.memberId) {
    where.memberId = Number(filters.memberId);
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      if (!dayjs(filters.dateFrom).isValid()) {
        throw new HttpError(400, 'dateFrom 格式不正確');
      }

      where.createdAt.gte = dayjs(filters.dateFrom).startOf('day').toDate();
    }
    if (filters.dateTo) {
      if (!dayjs(filters.dateTo).isValid()) {
        throw new HttpError(400, 'dateTo 格式不正確');
      }

      where.createdAt.lte = dayjs(filters.dateTo).endOf('day').toDate();
    }
  }

  return prisma.order.findMany({
    where,
    include: ORDER_INCLUDE,
    orderBy: {
      createdAt: 'desc'
    }
  });
}

module.exports = {
  ORDER_INCLUDE,
  createOrder,
  getOrderById,
  listKdsOrders,
  updateOrderStatus,
  listOrders
};
