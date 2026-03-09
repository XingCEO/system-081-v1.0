const prisma = require('../lib/prisma');
const HttpError = require('../utils/HttpError');
const { generateOrderNumber } = require('../utils/order');
const { calculatePoints, getCurrentPrice } = require('../utils/pricing');
const { getSystemSettings } = require('./settingsService');
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

function normalizePaymentMethod(method) {
  if (!method) {
    return null;
  }

  return String(method).toUpperCase();
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
        phone: payload.memberPhone
      }
    });
  }

  return null;
}

async function prepareOrderItems(tx, rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, '訂單至少需要一個品項');
  }

  const menuItemIds = [...new Set(rawItems.map((item) => Number(item.menuItemId)))];
  const menuItems = await tx.menuItem.findMany({
    where: {
      id: {
        in: menuItemIds
      }
    }
  });

  const menuItemMap = new Map(menuItems.map((item) => [item.id, item]));
  let subtotal = 0;
  const itemRecords = [];
  const stockSnapshots = [];

  rawItems.forEach((rawItem) => {
    const menuItem = menuItemMap.get(Number(rawItem.menuItemId));
    const quantity = Number(rawItem.quantity || 1);

    if (!menuItem || !menuItem.isActive) {
      throw new HttpError(400, `找不到可點餐品項：${rawItem.menuItemId}`);
    }

    if (menuItem.stock < quantity) {
      throw new HttpError(400, `${menuItem.name} 庫存不足，目前剩餘 ${menuItem.stock} 份`);
    }

    const addons = Array.isArray(rawItem.addons)
      ? rawItem.addons
      : Array.isArray(rawItem.options)
        ? rawItem.options
        : [];

    const addonsTotal = addons.reduce((sum, addon) => {
      return sum + Number(addon.price ?? addon.priceAdjust ?? 0);
    }, 0);

    const unitPrice = getCurrentPrice(menuItem) + addonsTotal;
    subtotal += unitPrice * quantity;

    itemRecords.push({
      menuItemId: menuItem.id,
      quantity,
      unitPrice,
      addons,
      note: rawItem.note || null
    });

    stockSnapshots.push({
      id: menuItem.id,
      name: menuItem.name,
      stockAlert: menuItem.stockAlert,
      newStock: menuItem.stock - quantity
    });
  });

  return {
    subtotal,
    itemRecords,
    stockSnapshots
  };
}

async function applyMemberPointChanges(tx, member, orderId, total, redeemPoints, pointsRule) {
  if (!member) {
    return;
  }

  if (member.isBlacklisted) {
    throw new HttpError(403, '此會員已被列為黑名單，無法使用會員功能');
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
      note: '訂單折抵'
    });
  }

  if (rewardPoints > 0) {
    delta += rewardPoints;
    changeSet.push({
      memberId: member.id,
      orderId,
      points: rewardPoints,
      type: 'EARN',
      note: '訂單累點'
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

  if (orderingState?.paused && !payload.ignorePause) {
    throw new HttpError(423, '目前暫停點餐中，請稍後再試');
  }

  const redeemPoints = Number(payload.redeemPoints || 0);
  const discount = Number(payload.discount ?? payload.discountAmount ?? 0);

  const result = await prisma.$transaction(async (tx) => {
    const member = await resolveMember(tx, payload);
    const table = await resolveTable(tx, payload);
    const { subtotal, itemRecords, stockSnapshots } = await prepareOrderItems(tx, payload.items);
    const redeemValue = redeemPoints * Number(pointsRule.redeemRate || 1);
    const total = Math.max(0, subtotal - discount - redeemValue);
    const paymentMethod = normalizePaymentMethod(payload.paymentMethod);
    const receivedAmount = Number(payload.receivedAmount || total || 0);
    const changeAmount = paymentMethod === 'CASH'
      ? Math.max(0, receivedAmount - total)
      : 0;

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
            note: [existing.note, payload.note].filter(Boolean).join(' / ') || null
          },
          include: ORDER_INCLUDE
        });
      }
    }

    if (!order) {
      order = await tx.order.create({
        data: {
          orderNumber: await generateOrderNumber(tx),
          type: payload.type || 'TAKEOUT',
          status: payload.status || 'PENDING',
          tableId: table?.id,
          staffId: actor?.id || null,
          memberId: member?.id || null,
          subtotal,
          total,
          paymentMethod,
          note: payload.note || null,
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

    if (table && payload.type === 'DINE_IN') {
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

async function updateOrderStatus(orderId, status) {
  const result = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({
      where: { id: Number(orderId) },
      include: ORDER_INCLUDE
    });

    if (!currentOrder) {
      throw new HttpError(404, '找不到訂單');
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
      for (const item of currentOrder.items) {
        await tx.menuItem.update({
          where: {
            id: item.menuItemId
          },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        });
      }

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
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = new Date(filters.dateTo);
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
