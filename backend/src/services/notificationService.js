const axios = require('axios');

const prisma = require('../lib/prisma');
const { getSystemSettings } = require('./settingsService');
const { getTodayRange } = require('../utils/order');

async function createNotification(type, message) {
  return prisma.notification.create({
    data: {
      type,
      message
    }
  });
}

async function sendLegacyLineNotify(message) {
  const { notificationSettings } = await getSystemSettings();
  const token = notificationSettings?.lineNotifyToken || process.env.LINE_NOTIFY_TOKEN;

  if (!token) {
    return { sent: false, reason: 'missing_token' };
  }

  try {
    await axios.post(
      'https://notify-api.line.me/api/notify',
      new URLSearchParams({ message }).toString(),
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 5000
      }
    );
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error.response?.status || error.message
    };
  }
}

async function notifyNewOrder(order) {
  const itemsText = order.items.map((item) => `${item.menuItem.name}x${item.quantity}`).join('、');
  const message = [
    `🆕 新訂單 #${order.orderNumber}`,
    `品項：${itemsText}`,
    `金額：NT$${order.total}`,
    `類型：${order.type}`,
    `時間：${new Date(order.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`
  ].join('\n');

  await createNotification('NEW_ORDER', message);
  const { notificationSettings } = await getSystemSettings();

  if (notificationSettings?.newOrder) {
    await sendLegacyLineNotify(message);
  }
}

async function notifyStockAlert(menuItem) {
  const message = [
    '⚠️ 庫存警示',
    `品項：${menuItem.name}`,
    `目前庫存：${menuItem.stock} 份（低於警戒值 ${menuItem.stockAlert} 份）`
  ].join('\n');

  await createNotification('STOCK_ALERT', message);

  const { notificationSettings } = await getSystemSettings();
  if (notificationSettings?.stockAlert) {
    await sendLegacyLineNotify(message);
  }
}

async function notifyPickupReminder(order) {
  const message = `餐點完成通知\n訂單 #${order.orderNumber} 已可取餐`;
  await createNotification('PICKUP_REMINDER', message);

  const { notificationSettings } = await getSystemSettings();
  if (notificationSettings?.pickupReminder) {
    await sendLegacyLineNotify(message);
  }
}

async function notifySalesTargetIfNeeded() {
  const { notificationSettings } = await getSystemSettings();
  const target = Number(notificationSettings?.dailySalesTarget || process.env.DAILY_SALES_TARGET || 0);

  if (!target || !notificationSettings?.salesTarget) {
    return;
  }

  const { start, end } = getTodayRange();
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: {
        not: 'CANCELLED'
      }
    },
    select: {
      total: true
    }
  });

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);

  if (revenue < target) {
    return;
  }

  const existing = await prisma.notification.findFirst({
    where: {
      type: 'SALES_TARGET',
      createdAt: {
        gte: start,
        lte: end
      }
    }
  });

  if (existing) {
    return;
  }

  const message = `🎯 今日營業額已達標\n目前營業額：NT$${revenue}\n目標：NT$${target}`;
  await createNotification('SALES_TARGET', message);
  await sendLegacyLineNotify(message);
}

module.exports = {
  createNotification,
  sendLegacyLineNotify,
  notifyNewOrder,
  notifyStockAlert,
  notifyPickupReminder,
  notifySalesTargetIfNeeded
};
