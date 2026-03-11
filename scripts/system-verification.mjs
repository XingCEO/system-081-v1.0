import 'dotenv/config';
import dayjs from 'dayjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apiBaseUrl = (process.env.SYSTEM_TEST_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const runId = `qa-${Date.now()}`;
const created = {
  memberId: null,
  staffId: null,
  tableId: null,
  reservationId: null,
  categoryId: null,
  addOnGroupId: null,
  menuItemId: null,
  orderId: null,
  deliveryOrderId: null,
  deliveryLinkedOrderId: null,
  externalCode: null
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildUrl(pathname) {
  return `${apiBaseUrl}${pathname}`;
}

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`
  };
}

function webhookHeaders(secret) {
  if (!secret) {
    return {};
  }

  return {
    'x-webhook-secret': secret
  };
}

async function request(pathname, options = {}) {
  const headers = {
    ...(options.headers || {})
  };
  const init = {
    method: options.method || 'GET',
    headers
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(pathname), init);
  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || `${response.status} ${response.statusText} @ ${pathname}`);
  }

  return body.data ?? body;
}

async function requestBinary(pathname, options = {}) {
  const response = await fetch(buildUrl(pathname), {
    method: options.method || 'GET',
    headers: {
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} @ ${pathname}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    buffer,
    contentType: response.headers.get('content-type') || ''
  };
}

function buildMemberPhone() {
  const suffix = String(Date.now()).slice(-8);
  return `09${suffix}`;
}

function pickTableNumber(existingTables) {
  const usedNumbers = new Set(existingTables.map((table) => String(table.number).padStart(2, '0')));

  for (let tableNumber = 90; tableNumber <= 99; tableNumber += 1) {
    const normalized = String(tableNumber).padStart(2, '0');
    if (!usedNumbers.has(normalized)) {
      return normalized;
    }
  }

  throw new Error('找不到可用的測試桌號');
}

async function cleanup() {
  if (created.deliveryLinkedOrderId) {
    await prisma.order.deleteMany({
      where: {
        id: created.deliveryLinkedOrderId
      }
    });
  }

  if (created.orderId) {
    await prisma.order.deleteMany({
      where: {
        id: created.orderId
      }
    });
  }

  if (created.menuItemId) {
    await prisma.menuItem.deleteMany({
      where: {
        id: created.menuItemId
      }
    });
  }

  if (created.addOnGroupId) {
    await prisma.addOnGroup.deleteMany({
      where: {
        id: created.addOnGroupId
      }
    });
  }

  if (created.categoryId) {
    await prisma.category.deleteMany({
      where: {
        id: created.categoryId
      }
    });
  }

  if (created.reservationId) {
    await prisma.reservation.deleteMany({
      where: {
        id: created.reservationId
      }
    });
  }

  if (created.tableId) {
    await prisma.table.deleteMany({
      where: {
        id: created.tableId
      }
    });
  }

  if (created.staffId) {
    await prisma.user.deleteMany({
      where: {
        id: created.staffId
      }
    });
  }

  if (created.memberId) {
    await prisma.member.deleteMany({
      where: {
        id: created.memberId
      }
    });
  }
}

async function main() {
  console.log(`System verification base URL: ${apiBaseUrl}`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: {
      name: 'admin',
      password: 'admin123'
    }
  });
  assert(login.accessToken, '密碼登入失敗');

  const ownerHeaders = authHeaders(login.accessToken);

  const me = await request('/auth/me', {
    headers: ownerHeaders
  });
  assert(me.name === 'admin', '目前登入者不是 admin');

  const pinLogin = await request('/auth/pin', {
    method: 'POST',
    body: {
      pin: '0000'
    }
  });
  assert(pinLogin.accessToken, 'PIN 登入失敗');

  const refreshed = await request('/auth/refresh', {
    method: 'POST',
    body: {
      refreshToken: login.refreshToken
    }
  });
  assert(refreshed.accessToken && refreshed.refreshToken, 'refresh token 流程失敗');

  await request('/auth/logout', {
    method: 'POST',
    headers: authHeaders(pinLogin.accessToken),
    body: {
      refreshToken: pinLogin.refreshToken
    }
  });

  const availability = await request('/menu/availability');
  assert(Array.isArray(availability.items) && availability.items.length > 0, '公開菜單不可用');

  const categories = await request('/menu/categories');
  assert(Array.isArray(categories) && categories.length > 0, '菜單分類讀取失敗');

  const tables = await request('/tables', {
    headers: ownerHeaders
  });
  assert(Array.isArray(tables) && tables.length > 0, '桌位列表讀取失敗');

  const memberPhone = buildMemberPhone();
  const member = await request('/members', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      name: `系統驗證會員-${runId}`,
      phone: memberPhone
    }
  });
  created.memberId = member.id;

  const memberLookup = await request(`/members/lookup?phone=${memberPhone}`);
  assert(memberLookup?.phone === memberPhone, '會員查詢失敗');

  await request(`/members/${member.id}/points`, {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      points: 5,
      type: 'ADJUST',
      note: runId
    }
  });

  const memberDetail = await request(`/members/${member.id}`, {
    headers: ownerHeaders
  });
  assert(memberDetail.points === 5, '會員點數異動未成功寫入');

  const staff = await request('/staff', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      name: `qa_staff_${Date.now()}`,
      password: 'staff1234',
      pin: '3333',
      role: 'STAFF'
    }
  });
  created.staffId = staff.id;

  await request(`/staff/${staff.id}/clock-in`, {
    method: 'POST',
    headers: ownerHeaders
  });
  await request(`/staff/${staff.id}/clock-out`, {
    method: 'POST',
    headers: ownerHeaders
  });

  const attendance = await request(`/staff/${staff.id}/attendance`, {
    headers: ownerHeaders
  });
  assert(Array.isArray(attendance) && attendance.length > 0, '員工打卡紀錄未建立');

  const table = await request('/tables', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      number: pickTableNumber(tables),
      capacity: 2,
      status: 'AVAILABLE'
    }
  });
  created.tableId = table.id;

  await request(`/tables/${table.id}`, {
    method: 'PUT',
    headers: ownerHeaders,
    body: {
      status: 'CLEANING'
    }
  });

  const reservationAt = dayjs().add(1, 'hour').toISOString();
  const reservation = await request('/reservations', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      tableId: table.id,
      memberName: '系統驗證訂位',
      phone: memberPhone,
      partySize: 2,
      datetime: reservationAt,
      note: runId,
      status: 'CONFIRMED'
    }
  });
  created.reservationId = reservation.id;

  const reservationList = await request(`/reservations?date=${dayjs().format('YYYY-MM-DD')}`, {
    headers: ownerHeaders
  });
  assert(reservationList.some((entry) => entry.id === reservation.id), '訂位資料未寫入');

  await request(`/reservations/${reservation.id}`, {
    method: 'PUT',
    headers: ownerHeaders,
    body: {
      status: 'COMPLETED'
    }
  });

  const category = await request('/menu/categories', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      name: `系統驗證分類-${runId}`,
      sortOrder: 999,
      isActive: true
    }
  });
  created.categoryId = category.id;

  const addOnGroup = await request('/menu/addons', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      name: `系統驗證加料-${runId}`,
      required: false,
      maxSelect: 2,
      options: [
        { name: '驗證加料', price: 5 }
      ]
    }
  });
  created.addOnGroupId = addOnGroup.id;

  const customExternalCode = `QA-${Date.now()}`;
  const customItem = await request('/menu/items', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      name: `系統驗證餐點-${runId}`,
      externalCode: customExternalCode,
      categoryId: category.id,
      basePrice: 88,
      cost: 30,
      stock: 12,
      stockAlert: 3,
      isActive: true,
      isCombo: false,
      emoji: '🧪',
      description: '系統驗證流程建立的測試商品',
      addOnGroupIds: [addOnGroup.id],
      timePricing: []
    }
  });
  created.menuItemId = customItem.id;
  created.externalCode = customExternalCode;

  const itemList = await request('/menu/items?all=true', {
    headers: ownerHeaders
  });
  assert(itemList.some((item) => item.externalCode === customExternalCode), '自訂菜單未出現在 API 列表');

  const persistedItem = await prisma.menuItem.findUnique({
    where: {
      externalCode: customExternalCode
    }
  });
  assert(persistedItem?.id === customItem.id, '自訂菜單未成功寫入資料庫');

  const menuExport = await request('/menu/export', {
    headers: ownerHeaders
  });
  assert(menuExport.items.some((item) => item.externalCode === customExternalCode), '菜單匯出缺少自訂商品');

  const importResult = await request('/menu/import', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      replaceAll: false,
      data: menuExport
    }
  });
  assert(importResult.importedItems > 0, '菜單匯入失敗');

  const order = await request('/orders', {
    method: 'POST',
    headers: ownerHeaders,
    body: {
      type: 'TAKEOUT',
      source: 'system-verification',
      autoPrint: false,
      paymentMethod: 'CASH',
      receivedAmount: 120,
      items: [
        {
          menuItemId: customItem.id,
          quantity: 1,
          addons: [
            {
              name: '驗證加料',
              price: 5
            }
          ],
          note: runId
        }
      ]
    }
  });
  created.orderId = order.id;

  const orderDetail = await request(`/orders/${order.id}`, {
    headers: ownerHeaders
  });
  assert(orderDetail.items.length === 1, '訂單明細寫入失敗');

  await request(`/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: {
      status: 'PREPARING'
    }
  });
  await request(`/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: {
      status: 'READY'
    }
  });
  await request(`/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: {
      status: 'COMPLETED'
    }
  });

  await request('/delivery/foodpanda', {
    method: 'POST',
    headers: webhookHeaders(process.env.FOODPANDA_WEBHOOK_SECRET),
    body: {
      orderId: `${runId}-foodpanda`,
      customer: {
        phone: memberPhone,
        address: '台北市系統驗證路 1 號'
      },
      items: [
        {
          externalCode: customExternalCode,
          name: customItem.name,
          quantity: 1,
          options: [
            {
              name: '驗證加料',
              price: 5
            }
          ]
        }
      ]
    }
  });

  const deliveryOrders = await request('/delivery/orders', {
    headers: ownerHeaders
  });
  const deliveryOrder = deliveryOrders.find((entry) => entry.externalId === `${runId}-foodpanda`);
  assert(deliveryOrder, '外送 webhook 未建立本地訂單');
  created.deliveryOrderId = deliveryOrder.id;
  created.deliveryLinkedOrderId = deliveryOrder.orderId;

  await request(`/delivery/orders/${deliveryOrder.id}/status`, {
    method: 'PATCH',
    headers: ownerHeaders,
    body: {
      status: 'READY'
    }
  });

  const today = dayjs().format('YYYY-MM-DD');
  const currentMonth = dayjs().format('YYYY-MM');

  const dashboard = await request('/reports/dashboard', {
    headers: ownerHeaders
  });
  assert(typeof dashboard.totalOrders === 'number', 'Dashboard 報表失敗');

  const daily = await request(`/reports/daily?date=${today}`, {
    headers: ownerHeaders
  });
  assert(daily.summary.totalOrders >= 1, '日報表未包含測試訂單');

  const weekly = await request(`/reports/weekly?week=${today}`, {
    headers: ownerHeaders
  });
  assert(Array.isArray(weekly.series), '週報表格式錯誤');

  const monthly = await request(`/reports/monthly?month=${currentMonth}`, {
    headers: ownerHeaders
  });
  assert(Array.isArray(monthly.series), '月報表格式錯誤');

  const topItems = await request(`/reports/top-items?range=${today},${today}`, {
    headers: ownerHeaders
  });
  assert(Array.isArray(topItems.items), '熱銷商品報表格式錯誤');

  const peakHours = await request(`/reports/peak-hours?date=${today}`, {
    headers: ownerHeaders
  });
  assert(Array.isArray(peakHours.hours) && peakHours.hours.length === 24, '高峰時段報表格式錯誤');

  const profit = await request(`/reports/profit?range=${today},${today}`, {
    headers: ownerHeaders
  });
  assert(typeof profit.grossMargin === 'number', '毛利報表格式錯誤');

  const excelExport = await requestBinary(`/reports/export?type=excel&range=${today},${today}`, {
    headers: ownerHeaders
  });
  assert(excelExport.buffer.length > 0 && excelExport.contentType.includes('spreadsheetml'), 'Excel 匯出失敗');

  const pdfExport = await requestBinary(`/reports/export?type=pdf&range=${today},${today}`, {
    headers: ownerHeaders
  });
  assert(pdfExport.buffer.length > 0 && pdfExport.contentType.includes('pdf'), 'PDF 匯出失敗');

  const settings = await request('/settings', {
    headers: ownerHeaders
  });
  const originalPauseState = Boolean(settings.orderingState?.paused);

  await request('/settings', {
    method: 'PUT',
    headers: ownerHeaders,
    body: {
      ordering_state: {
        paused: !originalPauseState
      }
    }
  });

  const toggledSettings = await request('/settings', {
    headers: ownerHeaders
  });
  assert(Boolean(toggledSettings.orderingState?.paused) === !originalPauseState, '系統設定更新失敗');

  await request('/settings', {
    method: 'PUT',
    headers: ownerHeaders,
    body: {
      ordering_state: {
        paused: originalPauseState
      }
    }
  });

  const backup = await request('/settings/backup', {
    headers: ownerHeaders
  });
  assert(Array.isArray(backup.menuItems) && backup.menuItems.some((item) => item.externalCode === customExternalCode), '系統備份缺少自訂商品');

  const notifications = await request('/notifications', {
    headers: ownerHeaders
  });
  assert(Array.isArray(notifications), '通知列表讀取失敗');

  if (notifications.length > 0) {
    await request(`/notifications/${notifications[0].id}/read`, {
      method: 'PATCH',
      headers: ownerHeaders
    });
  }

  console.log('System verification passed.');
}

try {
  await main();
} catch (error) {
  console.error('System verification failed.');
  console.error(error);
  process.exitCode = 1;
} finally {
  await cleanup().catch((cleanupError) => {
    console.error('Cleanup failed.');
    console.error(cleanupError);
    process.exitCode = 1;
  });
  await prisma.$disconnect();
}
