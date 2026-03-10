const HttpError = require('../utils/HttpError');

function normalizeExternalCode(item = {}) {
  return item.localMenuItemId
    || item.menuItemId
    || item.externalCode
    || item.sku
    || item.code
    || item.id
    || null;
}

function normalizeFoodpandaWebhook(payload) {
  if (!payload) {
    throw new HttpError(400, 'foodpanda webhook payload 不可為空');
  }

  return {
    type: 'DELIVERY',
    source: 'foodpanda',
    note: payload.note || payload.remark || '',
    memberPhone: payload.customer?.phone || '',
    items: (payload.items || []).map((item) => ({
      menuItemId: item.localMenuItemId ? Number(item.localMenuItemId) : undefined,
      externalCode: normalizeExternalCode(item),
      menuItemName: item.name || item.title || '',
      quantity: Number(item.quantity || 1),
      addons: (item.options || []).map((option) => ({
        name: option.name,
        price: Number(option.price || 0)
      })),
      note: item.note || ''
    })),
    deliveryMeta: {
      platform: 'FOODPANDA',
      externalId: String(payload.orderId || payload.id || `fp-${Date.now()}`),
      deliveryAddress: payload.deliveryAddress || payload.customer?.address || '',
      status: 'RECEIVED'
    }
  };
}

function normalizeUberEatsWebhook(payload) {
  if (!payload) {
    throw new HttpError(400, 'Uber Eats webhook payload 不可為空');
  }

  return {
    type: 'DELIVERY',
    source: 'ubereats',
    note: payload.note || payload.specialInstructions || '',
    memberPhone: payload.eater?.phone || '',
    items: (payload.items || []).map((item) => ({
      menuItemId: item.localMenuItemId ? Number(item.localMenuItemId) : undefined,
      externalCode: normalizeExternalCode(item),
      menuItemName: item.name || item.title || '',
      quantity: Number(item.quantity || 1),
      addons: (item.selectedModifiers || []).map((option) => ({
        name: option.name,
        price: Number(option.price || 0)
      })),
      note: item.specialInstructions || ''
    })),
    deliveryMeta: {
      platform: 'UBEREATS',
      externalId: String(payload.orderId || payload.id || `ue-${Date.now()}`),
      deliveryAddress: payload.deliveryAddress || payload.eater?.deliveryAddress || '',
      status: 'RECEIVED'
    }
  };
}

module.exports = {
  normalizeFoodpandaWebhook,
  normalizeUberEatsWebhook
};
