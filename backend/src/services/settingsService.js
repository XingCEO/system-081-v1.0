const prisma = require('../lib/prisma');

async function getSetting(key, fallback = null) {
  const record = await prisma.setting.findUnique({ where: { key } });
  return record ? record.value : fallback;
}

async function upsertSetting(key, value) {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

async function getSystemSettings() {
  const [storeProfile, pointsRule, taxRule, orderingState, notificationSettings, printerSettings] =
    await Promise.all([
      getSetting('store_profile', {
        name: '晨光早餐店',
        address: '',
        phone: ''
      }),
      getSetting('points_rule', {
        earnEvery: 30,
        earnPoints: 1,
        redeemRate: 1
      }),
      getSetting('tax_rule', {
        enabled: false,
        rate: 0
      }),
      getSetting('ordering_state', {
        paused: false
      }),
      getSetting('notification_settings', {
        lineNotifyToken: process.env.LINE_NOTIFY_TOKEN || '',
        newOrder: true,
        stockAlert: true,
        pickupReminder: true,
        salesTarget: true,
        dailySalesTarget: Number(process.env.DAILY_SALES_TARGET || 5000)
      }),
      getSetting('printer_settings', {
        ip: process.env.PRINTER_IP || '192.168.1.100',
        port: Number(process.env.PRINTER_PORT || 9100),
        width: 80
      })
    ]);

  return {
    storeProfile,
    pointsRule,
    taxRule,
    orderingState,
    notificationSettings,
    printerSettings
  };
}

module.exports = {
  getSetting,
  upsertSetting,
  getSystemSettings
};
