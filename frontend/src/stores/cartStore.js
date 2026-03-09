import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],
  orderType: 'TAKEOUT',
  tableNumber: '',
  member: null,
  memberPhone: '',
  note: '',
  discount: 0,
  redeemPoints: 0,
  setOrderField(field, value) {
    set({ [field]: value });
  },
  setMember(member) {
    set({
      member,
      memberPhone: member?.phone || ''
    });
  },
  addItem(menuItem, addons = [], note = '') {
    const currentPrice = Number(menuItem.currentPrice ?? menuItem.basePrice);
    const addonTotal = addons.reduce((sum, addon) => sum + Number(addon.price ?? 0), 0);
    const signature = JSON.stringify({
      menuItemId: menuItem.id,
      addons: addons.map((addon) => addon.name).sort(),
      note
    });

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
          name: menuItem.name,
          emoji: menuItem.emoji,
          quantity: 1,
          unitPrice: currentPrice + addonTotal,
          addons,
          note
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
    set({
      items: [],
      orderType: 'TAKEOUT',
      tableNumber: '',
      member: null,
      memberPhone: '',
      note: '',
      discount: 0,
      redeemPoints: 0
    });
  },
  subtotal() {
    return get().items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  },
  total() {
    return Math.max(0, get().subtotal() - Number(get().discount || 0) - Number(get().redeemPoints || 0));
  }
}));
