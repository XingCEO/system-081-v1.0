const baseUrl = (process.env.SMOKE_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.success === false) {
    throw new Error(body.message || `${response.status} ${response.statusText} @ ${path}`);
  }

  return body.data ?? body;
}

async function requestFailure(path, options = {}, expectedStatus = 400) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (response.status !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus} @ ${path}, received ${response.status}`);
  }

  return body;
}

async function main() {
  console.log(`Smoke test base URL: ${baseUrl}`);

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      name: 'admin',
      password: 'admin123'
    })
  });
  assert(login.accessToken, '登入失敗，未取得 accessToken');

  const authHeaders = {
    Authorization: `Bearer ${login.accessToken}`
  };

  const refreshed = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: login.refreshToken
    })
  });
  assert(refreshed.accessToken && refreshed.refreshToken, 'refresh token 換發失敗');

  const availability = await request('/menu/availability');
  assert(Array.isArray(availability.items) && availability.items.length > 0, 'menu/availability 沒有可販售品項');

  const comboItem = availability.items.find((item) => item.isCombo && item.available);
  const normalItem = availability.items.find((item) => !item.isCombo && item.available);
  assert(comboItem || normalItem, '沒有可用來測試的品項');

  const member = await request('/members/lookup?phone=0912345678');
  assert(member?.phone === '0912345678', '會員查詢失敗');
  assert(member.totalSpent === undefined && member.birthday === undefined, '公開會員查詢不應回傳敏感欄位');

  await requestFailure('/orders', {
    method: 'POST',
    body: JSON.stringify({
      items: [
        {
          menuItemId: normalItem?.id || comboItem?.id,
          quantity: -1
        }
      ]
    })
  }, 400);

  const orderItems = [];

  if (comboItem) {
    const comboSelections = (comboItem.comboGroups || [])
      .map((group) => {
        const selected = (group.options || []).find((option) => option.available);
        if (!selected) {
          return null;
        }

        return {
          groupName: group.name,
          menuItemId: selected.menuItemId,
          name: selected.name,
          price: Number(selected.priceAdjust ?? selected.price ?? 0)
        };
      })
      .filter(Boolean);

    orderItems.push({
      menuItemId: comboItem.id,
      quantity: 1,
      comboSelections,
      addons: []
    });
  }

  if (normalItem) {
    orderItems.push({
      menuItemId: normalItem.id,
      quantity: 1,
      addons: []
    });
  }

  const createdOrder = await request('/orders', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'TAKEOUT',
      source: 'smoke-test',
      autoPrint: false,
      items: orderItems
    })
  });

  assert(createdOrder.orderNumber, '建立訂單失敗');
  console.log(`Created order: ${createdOrder.orderNumber}`);

  const preparingOrder = await request(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'PREPARING' })
  });
  assert(preparingOrder.status === 'PREPARING', '訂單無法更新為 PREPARING');

  const readyOrder = await request(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'READY' })
  });
  assert(readyOrder.status === 'READY', '訂單無法更新為 READY');

  const cancelledOrder = await request(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'CANCELLED' })
  });
  assert(cancelledOrder.status === 'CANCELLED', '訂單無法更新為 CANCELLED');

  const idempotentCancelled = await request(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'CANCELLED' })
  });
  assert(idempotentCancelled.status === 'CANCELLED', '重複取消訂單應保持在 CANCELLED 狀態');

  const exportData = await request('/menu/export', {
    headers: authHeaders
  });
  assert(Array.isArray(exportData.items) && exportData.items.length > 0, '菜單匯出資料異常');

  const importResult = await request('/menu/import', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      replaceAll: false,
      data: exportData
    })
  });
  assert(importResult.importedItems > 0, '菜單匯入驗證失敗');

  const backup = await request('/settings/backup', {
    headers: authHeaders
  });
  assert(Array.isArray(backup.menuItems) && backup.menuItems.length > 0, '系統備份資料異常');

  const notifications = await request('/notifications', {
    headers: authHeaders
  });
  assert(Array.isArray(notifications), '通知列表讀取失敗');

  console.log('Smoke test passed.');
}

main().catch((error) => {
  console.error('Smoke test failed.');
  console.error(error);
  process.exit(1);
});
