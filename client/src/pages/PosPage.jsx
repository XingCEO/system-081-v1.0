// POS 收銀台主頁面
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { connectSocket, disconnectSocket } from '../lib/socket';
import api from '../lib/api';
import toast from 'react-hot-toast';
import CategoryBar from '../components/pos/CategoryBar';
import MenuGrid from '../components/pos/MenuGrid';
import Cart from '../components/pos/Cart';
import PaymentModal from '../components/pos/PaymentModal';
import OrderTypeSelector from '../components/pos/OrderTypeSelector';
import OptionModal from '../components/pos/OptionModal';

export default function PosPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const cart = useCartStore();

  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showOptions, setShowOptions] = useState(null); // 品項選項彈窗
  const [recentOrders, setRecentOrders] = useState([]);

  // 載入菜單資料
  useEffect(() => {
    loadMenu();
    loadRecentOrders();

    // 連接 Socket
    const socket = connectSocket('pos');
    socket.on('new-order', (order) => {
      setRecentOrders(prev => [order, ...prev.slice(0, 19)]);
    });
    socket.on('order-updated', (order) => {
      setRecentOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });

    return () => disconnectSocket('pos');
  }, []);

  const loadMenu = async () => {
    try {
      setIsLoading(true);
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
      if (catRes.data.length > 0 && !selectedCategory) {
        setSelectedCategory(catRes.data[0].id);
      }
    } catch (err) {
      toast.error('載入菜單失敗: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      const res = await api.get('/orders', { params: { limit: 20 } });
      setRecentOrders(res.data);
    } catch (err) {
      // 忽略
    }
  };

  // 點擊菜單品項
  const handleItemClick = useCallback((item) => {
    if (item.options && item.options.length > 0) {
      setShowOptions(item);
    } else {
      cart.addItem(item);
      toast.success(`${item.name} 已加入`, { duration: 1000 });
    }
  }, []);

  // 選項確認
  const handleOptionConfirm = useCallback((item, options, note) => {
    cart.addItem(item, options, note);
    setShowOptions(null);
    toast.success(`${item.name} 已加入`, { duration: 1000 });
  }, []);

  // 送出訂單
  const handleSubmitOrder = async () => {
    if (cart.items.length === 0) {
      toast.error('購物車是空的');
      return;
    }
    setShowPayment(true);
  };

  // 完成付款
  const handlePaymentComplete = async (paymentData) => {
    try {
      // 建立訂單
      const orderData = {
        type: cart.orderType,
        source: 'pos',
        tableNumber: cart.tableNumber,
        customerName: cart.customerName,
        customerPhone: cart.customerPhone,
        customerCount: cart.customerCount,
        note: cart.note,
        discountAmount: cart.discountAmount,
        discountReason: cart.discountReason,
        items: cart.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          options: item.options,
          note: item.note
        }))
      };

      const orderRes = await api.post('/orders', orderData);
      const order = orderRes.data;

      // 結帳
      if (paymentData) {
        await api.post(`/orders/${order.id}/pay`, paymentData);
      }

      toast.success(`訂單 ${order.orderNumber} 已建立！`);
      cart.clearCart();
      setShowPayment(false);
      loadRecentOrders();
    } catch (err) {
      toast.error('建立訂單失敗: ' + err.message);
    }
  };

  // 篩選品項
  const filteredItems = selectedCategory
    ? menuItems.filter(item => item.categoryId === selectedCategory)
    : menuItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      {/* 頂部列 */}
      <header className="flex items-center justify-between px-4 py-2 bg-pos-card border-b border-pos-accent/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <h1 className="text-lg font-bold">081 POS</h1>
          <OrderTypeSelector />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-pos-muted">{user?.name}</span>
          <button
            onClick={() => navigate('/admin')}
            className="px-3 py-1.5 text-sm bg-pos-accent/50 rounded-lg hover:bg-pos-accent transition-colors"
          >
            後台
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm bg-pos-highlight/20 text-pos-highlight rounded-lg hover:bg-pos-highlight/30 transition-colors"
          >
            登出
          </button>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左側 - 菜單區 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 分類列 */}
          <CategoryBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {/* 品項格 */}
          <MenuGrid
            items={filteredItems}
            isLoading={isLoading}
            onItemClick={handleItemClick}
          />
        </div>

        {/* 右側 - 購物車 */}
        <Cart
          onSubmit={handleSubmitOrder}
          recentOrders={recentOrders}
        />
      </div>

      {/* 付款彈窗 */}
      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          onConfirm={handlePaymentComplete}
        />
      )}

      {/* 選項彈窗 */}
      {showOptions && (
        <OptionModal
          item={showOptions}
          onClose={() => setShowOptions(null)}
          onConfirm={handleOptionConfirm}
        />
      )}
    </div>
  );
}
