const prisma = require('../lib/prisma');
const HttpError = require('../utils/HttpError');

function mapComboConfigIds(comboConfig, menuItemIdMap) {
  if (!Array.isArray(comboConfig)) {
    return [];
  }

  return comboConfig.map((group) => ({
    ...group,
    options: (group.options || []).map((option) => ({
      ...option,
      menuItemId: menuItemIdMap.get(Number(option.menuItemId)) || Number(option.menuItemId)
    }))
  }));
}

function mapAddonReferences(addons, menuItemIdMap) {
  if (!Array.isArray(addons)) {
    return [];
  }

  return addons.map((addon) => ({
    ...addon,
    ...(addon.menuItemId ? { menuItemId: menuItemIdMap.get(Number(addon.menuItemId)) || Number(addon.menuItemId) } : {})
  }));
}

async function exportFullBackup() {
  const [
    users,
    categories,
    addOnGroups,
    menuItems,
    members,
    tables,
    reservations,
    orders,
    pointTransactions,
    staffAttendance,
    settings,
    notifications
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.addOnGroup.findMany({ include: { options: true }, orderBy: { id: 'asc' } }),
    prisma.menuItem.findMany({
      include: {
        menuItemAddOns: true
      },
      orderBy: { id: 'asc' }
    }),
    prisma.member.findMany({ orderBy: { id: 'asc' } }),
    prisma.table.findMany({ orderBy: { number: 'asc' } }),
    prisma.reservation.findMany({ orderBy: { datetime: 'asc' } }),
    prisma.order.findMany({
      include: {
        items: true,
        deliveryOrder: true
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.pointTransaction.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.staffAttendance.findMany({ orderBy: { clockIn: 'asc' } }),
    prisma.setting.findMany({ orderBy: { key: 'asc' } }),
    prisma.notification.findMany({ orderBy: { createdAt: 'asc' } })
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    categories,
    addOnGroups,
    menuItems,
    members,
    tables,
    reservations,
    orders,
    pointTransactions,
    staffAttendance,
    settings,
    notifications
  };
}

async function restoreFullBackup(payload, { replaceAll = true } = {}) {
  if (!replaceAll) {
    throw new HttpError(400, '還原作業目前只支援完整覆蓋模式');
  }

  const backup = payload?.data || payload;
  if (!backup || !Array.isArray(backup.menuItems) || !Array.isArray(backup.categories)) {
    throw new HttpError(400, '備份檔內容不完整');
  }

  if (backup.version !== undefined && Number(backup.version) > 1) {
    throw new HttpError(400, '此備份檔版本較新，請先更新系統後再還原');
  }

  if (!Array.isArray(backup.users) || backup.users.length === 0) {
    throw new HttpError(400, '備份檔缺少使用者資料，無法安全還原');
  }

  return prisma.$transaction(async (tx) => {
    await tx.refreshToken.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.staffAttendance.deleteMany({});
    await tx.deliveryOrder.deleteMany({});
    await tx.pointTransaction.deleteMany({});
    await tx.orderItem.deleteMany({});
    await tx.order.deleteMany({});
    await tx.reservation.deleteMany({});
    await tx.table.deleteMany({});
    await tx.member.deleteMany({});
    await tx.menuItemAddOnGroup.deleteMany({});
    await tx.addOnOption.deleteMany({});
    await tx.addOnGroup.deleteMany({});
    await tx.menuItem.deleteMany({});
    await tx.category.deleteMany({});
    await tx.setting.deleteMany({});
    await tx.user.deleteMany({});

    const userIdMap = new Map();
    for (const user of backup.users || []) {
      const created = await tx.user.create({
        data: {
          name: user.name,
          role: user.role,
          passwordHash: user.passwordHash,
          pin: user.pin,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });
      userIdMap.set(Number(user.id), created.id);
    }

    const categoryIdMap = new Map();
    for (const category of backup.categories || []) {
      const created = await tx.category.create({
        data: {
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt
        }
      });
      categoryIdMap.set(Number(category.id), created.id);
    }

    const addOnGroupIdMap = new Map();
    for (const group of backup.addOnGroups || []) {
      const created = await tx.addOnGroup.create({
        data: {
          name: group.name,
          required: group.required,
          maxSelect: group.maxSelect,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
          options: {
            create: (group.options || []).map((option) => ({
              name: option.name,
              price: option.price,
              createdAt: option.createdAt,
              updatedAt: option.updatedAt
            }))
          }
        }
      });
      addOnGroupIdMap.set(Number(group.id), created.id);
    }

    const menuItemIdMap = new Map();
    for (const item of backup.menuItems || []) {
      const created = await tx.menuItem.create({
        data: {
          name: item.name,
          externalCode: item.externalCode || null,
          categoryId: categoryIdMap.get(Number(item.categoryId)),
          basePrice: item.basePrice,
          cost: item.cost,
          stock: item.stock,
          stockAlert: item.stockAlert,
          isActive: item.isActive,
          isCombo: item.isCombo || false,
          timePricing: item.timePricing || [],
          comboConfig: item.comboConfig || [],
          emoji: item.emoji || null,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      });
      menuItemIdMap.set(Number(item.id), created.id);
    }

    for (const item of backup.menuItems || []) {
      const newMenuItemId = menuItemIdMap.get(Number(item.id));
      const comboConfig = mapComboConfigIds(item.comboConfig || [], menuItemIdMap);

      await tx.menuItem.update({
        where: { id: newMenuItemId },
        data: {
          comboConfig
        }
      });

      for (const relation of item.menuItemAddOns || []) {
        await tx.menuItemAddOnGroup.create({
          data: {
            menuItemId: newMenuItemId,
            addOnGroupId: addOnGroupIdMap.get(Number(relation.addOnGroupId))
          }
        });
      }
    }

    const memberIdMap = new Map();
    for (const member of backup.members || []) {
      const created = await tx.member.create({
        data: {
          name: member.name,
          phone: member.phone,
          points: member.points,
          totalSpent: member.totalSpent,
          birthday: member.birthday,
          isBlacklisted: member.isBlacklisted,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt
        }
      });
      memberIdMap.set(Number(member.id), created.id);
    }

    const tableIdMap = new Map();
    for (const table of backup.tables || []) {
      const created = await tx.table.create({
        data: {
          number: table.number,
          capacity: table.capacity,
          status: table.status,
          qrCode: table.qrCode,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt
        }
      });
      tableIdMap.set(Number(table.id), created.id);
    }

    for (const reservation of backup.reservations || []) {
      await tx.reservation.create({
        data: {
          tableId: tableIdMap.get(Number(reservation.tableId)),
          memberName: reservation.memberName,
          phone: reservation.phone,
          partySize: reservation.partySize,
          datetime: reservation.datetime,
          note: reservation.note || null,
          status: reservation.status,
          createdAt: reservation.createdAt,
          updatedAt: reservation.updatedAt
        }
      });
    }

    for (const setting of backup.settings || []) {
      await tx.setting.create({
        data: {
          key: setting.key,
          value: setting.value,
          createdAt: setting.createdAt,
          updatedAt: setting.updatedAt
        }
      });
    }

    const orderIdMap = new Map();
    for (const order of backup.orders || []) {
      const created = await tx.order.create({
        data: {
          orderNumber: order.orderNumber,
          type: order.type,
          status: order.status,
          tableId: order.tableId ? tableIdMap.get(Number(order.tableId)) : null,
          staffId: order.staffId ? userIdMap.get(Number(order.staffId)) : null,
          memberId: order.memberId ? memberIdMap.get(Number(order.memberId)) : null,
          subtotal: order.subtotal,
          total: order.total,
          paymentMethod: order.paymentMethod,
          note: order.note || null,
          source: order.source,
          discount: order.discount,
          receivedAmount: order.receivedAmount,
          changeAmount: order.changeAmount,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: {
            create: (order.items || []).map((item) => ({
              menuItemId: menuItemIdMap.get(Number(item.menuItemId)),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              addons: mapAddonReferences(item.addons || [], menuItemIdMap),
              note: item.note || null,
              status: item.status,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }))
          }
        }
      });

      orderIdMap.set(Number(order.id), created.id);

      if (order.deliveryOrder) {
        await tx.deliveryOrder.create({
          data: {
            orderId: created.id,
            platform: order.deliveryOrder.platform,
            externalId: order.deliveryOrder.externalId,
            deliveryAddress: order.deliveryOrder.deliveryAddress || null,
            status: order.deliveryOrder.status,
            createdAt: order.deliveryOrder.createdAt,
            updatedAt: order.deliveryOrder.updatedAt
          }
        });
      }
    }

    for (const transaction of backup.pointTransactions || []) {
      await tx.pointTransaction.create({
        data: {
          memberId: memberIdMap.get(Number(transaction.memberId)),
          orderId: transaction.orderId ? orderIdMap.get(Number(transaction.orderId)) : null,
          points: transaction.points,
          type: transaction.type,
          note: transaction.note || null,
          createdAt: transaction.createdAt
        }
      });
    }

    for (const attendance of backup.staffAttendance || []) {
      await tx.staffAttendance.create({
        data: {
          userId: userIdMap.get(Number(attendance.userId)),
          clockIn: attendance.clockIn,
          clockOut: attendance.clockOut,
          createdAt: attendance.createdAt,
          updatedAt: attendance.updatedAt
        }
      });
    }

    for (const notification of backup.notifications || []) {
      await tx.notification.create({
        data: {
          type: notification.type,
          message: notification.message,
          isRead: notification.isRead,
          createdAt: notification.createdAt
        }
      });
    }

    return {
      users: userIdMap.size,
      categories: categoryIdMap.size,
      addOnGroups: addOnGroupIdMap.size,
      menuItems: menuItemIdMap.size,
      members: memberIdMap.size,
      tables: tableIdMap.size,
      orders: orderIdMap.size
    };
  });
}

module.exports = {
  exportFullBackup,
  restoreFullBackup
};
