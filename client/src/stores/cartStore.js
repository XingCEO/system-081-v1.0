import { create } from 'zustand';

export const useCartStore = create((set, get) => ({
  items: [],           // 購物車品項
  orderType: 'dine_in', // dine_in, takeout, delivery
  tableNumber: null,
  customerName: '',
  customerPhone: '',
  customerCount: 1,
  note: '',
  discountAmount: 0,
  discountReason: '',

  // 設定訂單資訊
  setOrderInfo: (info) => set(info),

  // 新增品項到購物車
  addItem: (menuItem, options = [], note = '') => {
    const items = get().items;

    // 計算選項加價
    const optionsTotal = options.reduce((sum, o) => sum + (o.priceAdjust || 0), 0);
    const unitPrice = (menuItem.currentPrice || menuItem.basePrice) + optionsTotal;

    // 檢查是否有相同品項（同品項 + 同選項 + 同備註才合併）
    const optionsKey = JSON.stringify(options.map(o => o.name).sort());
    const existingIndex = items.findIndex(
      i => i.menuItemId === menuItem.id &&
           JSON.stringify(i.options.map(o => o.name).sort()) === optionsKey &&
           i.note === note
    );

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].totalPrice = newItems[existingIndex].unitPrice * newItems[existingIndex].quantity;
      set({ items: newItems });
    } else {
      set({
        items: [...items, {
          id: Date.now() + Math.random(),
          menuItemId: menuItem.id,
          name: menuItem.name,
          image: menuItem.image,
          unitPrice,
          quantity: 1,
          totalPrice: unitPrice,
          options,
          note
        }]
      });
    }
  },

  // 更新品項數量
  updateQuantity: (itemId, quantity) => {
    if (quantity <= 0) {
      set({ items: get().items.filter(i => i.id !== itemId) });
    } else {
      set({
        items: get().items.map(i =>
          i.id === itemId ? { ...i, quantity, totalPrice: i.unitPrice * quantity } : i
        )
      });
    }
  },

  // 移除品項
  removeItem: (itemId) => {
    set({ items: get().items.filter(i => i.id !== itemId) });
  },

  // 清空購物車
  clearCart: () => {
    set({
      items: [],
      tableNumber: null,
      customerName: '',
      customerPhone: '',
      customerCount: 1,
      note: '',
      discountAmount: 0,
      discountReason: ''
    });
  },

  // 計算小計
  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
  },

  // 計算稅額
  getTax: () => {
    return Math.round(get().getSubtotal() * 0.05);
  },

  // 計算總金額
  getTotal: () => {
    return get().getSubtotal() + get().getTax() - get().discountAmount;
  },

  // 取得品項總數
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  }
}));
