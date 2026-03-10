import { create } from 'zustand';

function normalizeModifiers(list = []) {
  return Array.isArray(list) ? list : [];
}

function buildSignature(menuItem, addons, comboSelections, note) {
  return JSON.stringify({
    menuItemId: menuItem.id,
    addons: normalizeModifiers(addons).map((item) => `${item.id || item.name}:${item.price || 0}`).sort(),
    comboSelections: normalizeModifiers(comboSelections)
      .map((item) => `${item.groupName}:${item.menuItemId || item.name}:${item.price || 0}`)
      .sort(),
    note: note.trim()
  });
}

function calculateTotal(state) {
  const subtotal = state.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const redeemValue = Number(state.redeemPoints || 0) * Number(state.pointsRule?.redeemRate || 1);

  return Math.max(0, subtotal - Number(state.discount || 0) - redeemValue);
}

function calculateEarnPoints(total, pointsRule) {
  const earnEvery = Number(pointsRule?.earnEvery || 30);
  const earnPoints = Number(pointsRule?.earnPoints || 1);

  if (earnEvery <= 0) {
    return 0;
  }

  return Math.floor(Number(total || 0) / earnEvery) * earnPoints;
}

export const useCartStore = create((set, get) => ({
  items: [],
  orderType: 'TAKEOUT',
  tableNumber: '',
  member: null,
  memberPhone: '',
  paymentMethod: 'CASH',
  note: '',
  discount: 0,
  redeemPoints: 0,
  pointsRule: {
    earnEvery: 30,
    earnPoints: 1,
    redeemRate: 1
  },
  setOrderField(field, value) {
    set({ [field]: value });
  },
  setOrderInfo(field, value) {
    set({ [field]: value });
  },
  setPointsRule(pointsRule) {
    set((state) => ({
      pointsRule: {
        ...state.pointsRule,
        ...(pointsRule || {})
      }
    }));
  },
  setMember(member) {
    set({
      member,
      memberPhone: member?.phone || '',
      redeemPoints: member ? get().redeemPoints : 0
    });
  },
  addItem(menuItem, addons = [], note = '', comboSelections = []) {
    const normalizedAddons = normalizeModifiers(addons);
    const normalizedComboSelections = normalizeModifiers(comboSelections);
    const currentPrice = Number(menuItem.currentPrice ?? menuItem.basePrice ?? 0);
    const modifierTotal =
      normalizedAddons.reduce((sum, item) => sum + Number(item.price || 0), 0) +
      normalizedComboSelections.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const signature = buildSignature(menuItem, normalizedAddons, normalizedComboSelections, note);

    const existing = get().items.find((item) => item.signature === signature);

    if (existing) {
      set({
        items: get().items.map((item) => (
          item.signature === signature
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ))
      });
      return;
    }

    set({
      items: [
        ...get().items,
        {
          signature,
          menuItemId: menuItem.id,
          externalCode: menuItem.externalCode || null,
          name: menuItem.name,
          emoji: menuItem.emoji,
          quantity: 1,
          unitPrice: currentPrice + modifierTotal,
          addons: normalizedAddons,
          comboSelections: normalizedComboSelections,
          modifiers: [...normalizedComboSelections, ...normalizedAddons],
          note: note.trim()
        }
      ]
    });
  },
  updateQuantity(signature, quantity) {
    if (quantity <= 0) {
      set({
        items: get().items.filter((item) => item.signature !== signature)
      });
      return;
    }

    set({
      items: get().items.map((item) => (
        item.signature === signature
          ? { ...item, quantity }
          : item
      ))
    });
  },
  removeItem(signature) {
    set({
      items: get().items.filter((item) => item.signature !== signature)
    });
  },
  clear() {
    set((state) => ({
      items: [],
      orderType: 'TAKEOUT',
      tableNumber: '',
      member: null,
      memberPhone: '',
      paymentMethod: 'CASH',
      note: '',
      discount: 0,
      redeemPoints: 0,
      pointsRule: state.pointsRule
    }));
  },
  subtotal() {
    return get().items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  },
  getSubtotal() {
    return get().subtotal();
  },
  redeemValue() {
    return Number(get().redeemPoints || 0) * Number(get().pointsRule?.redeemRate || 1);
  },
  total() {
    return calculateTotal(get());
  },
  getTotal() {
    return get().total();
  },
  earnPoints() {
    return calculateEarnPoints(get().total(), get().pointsRule);
  }
}));
