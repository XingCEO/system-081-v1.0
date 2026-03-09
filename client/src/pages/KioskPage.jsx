// 自助點餐 Kiosk 頁面
import { useState, useEffect } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function KioskPage() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState('menu'); // menu, cart, confirm, done
  const [orderType, setOrderType] = useState(null); // dine_in, takeout
  const [orderResult, setOrderResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories'),
        api.get('/menu/items')
      ]);
      setCategories(catRes.data);
      setMenuItems(itemRes.data);
      if (catRes.data.length > 0) setSelectedCategory(catRes.data[0].id);
    } catch {
      toast.error('載入菜單失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id
          ? { ...c, quantity: c.quantity + 1, totalPrice: c.unitPrice * (c.quantity + 1) }
          : c
        );
      }
      return [...prev, {
        id: Date.now(),
        menuItemId: item.id,
        name: item.name,
        unitPrice: item.currentPrice || item.basePrice,
        quantity: 1,
        totalPrice: item.currentPrice || item.basePrice,
        options: [],
        note: ''
      }];
    });
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id === itemId) {
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null;
        return { ...c, quantity: newQty, totalPrice: c.unitPrice * newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const total = cart.reduce((sum, c) => sum + c.totalPrice, 0);
  const tax = Math.round(total * 0.05);
  const grandTotal = total + tax;

  const handleSubmit = async () => {
    try {
      const orderData = {
        type: orderType,
        source: 'kiosk',
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          options: c.options,
          note: c.note
        }))
      };

      const res = await api.post('/orders', orderData);
      setOrderResult(res.data);
      setStep('done');
    } catch (err) {
      toast.error('送出訂單失敗: ' + err.message);
    }
  };

  const resetAll = () => {
    setCart([]);
    setStep('menu');
    setOrderType(null);
    setOrderResult(null);
  };

  // 選擇內用/外帶
  if (!orderType) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
        <div className="text-6xl mb-6">🍽️</div>
        <h1 className="text-4xl font-bold mb-2">歡迎光臨</h1>
        <p className="text-xl text-pos-muted mb-12">請選擇用餐方式</p>
        <div className="flex gap-8">
          {[
            { type: 'dine_in', icon: '🪑', label: '內用' },
            { type: 'takeout', icon: '🥡', label: '外帶' }
          ].map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => { setOrderType(type); setStep('menu'); }}
              className="w-48 h-48 rounded-3xl bg-pos-card border-2 border-pos-accent/30
                         hover:border-primary-500 flex flex-col items-center justify-center
                         transition-all active:scale-95"
            >
              <span className="text-6xl mb-3">{icon}</span>
              <span className="text-2xl font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 完成頁面
  if (step === 'done' && orderResult) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-pos-bg">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">✅</div>
          <h1 className="text-3xl font-bold mb-4">訂單已送出！</h1>
          <div className="text-6xl font-black text-primary-400 mb-4">
            {orderResult.orderNumber}
          </div>
          <p className="text-xl text-pos-muted mb-2">請記住您的號碼</p>
          <p className="text-lg text-pos-muted">餐點準備好後將會叫號</p>
          <button
            onClick={resetAll}
            className="mt-8 px-8 py-4 rounded-2xl bg-primary-600 text-white text-xl font-bold
                       active:scale-95 transition-transform"
          >
            完成
          </button>
          <p className="text-sm text-pos-muted mt-4">10 秒後自動返回首頁</p>
        </motion.div>
        {/* 自動返回 */}
        {setTimeout(resetAll, 10000) && null}
      </div>
    );
  }

  const filteredItems = selectedCategory
    ? menuItems.filter(i => i.categoryId === selectedCategory)
    : menuItems;

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      {/* 頂部 */}
      <header className="flex items-center justify-between px-6 py-4 bg-pos-card border-b border-pos-accent/30">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🍽️</span>
          <h1 className="text-xl font-bold">自助點餐</h1>
          <span className="text-sm bg-pos-accent/30 px-3 py-1 rounded-full">
            {orderType === 'dine_in' ? '🪑 內用' : '🥡 外帶'}
          </span>
        </div>
        <button onClick={resetAll} className="px-4 py-2 bg-pos-accent/30 rounded-lg text-sm">
          重新開始
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 分類側邊 */}
        <div className="w-[120px] bg-pos-card/50 border-r border-pos-accent/20 overflow-y-auto py-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full py-4 px-2 text-center transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary-600/20 text-primary-400 border-r-4 border-primary-400'
                  : 'text-pos-muted hover:text-pos-text'
              }`}
            >
              <div className="text-2xl">{cat.icon}</div>
              <div className="text-xs mt-1 font-medium">{cat.name}</div>
            </button>
          ))}
        </div>

        {/* 菜單格 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredItems.map((item) => {
              const cartItem = cart.find(c => c.menuItemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="pos-card p-4 text-left hover:border-primary-500/50 transition-all relative"
                >
                  {cartItem && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary-600 text-white
                                    text-sm font-bold flex items-center justify-center">
                      {cartItem.quantity}
                    </div>
                  )}
                  {item.image && (
                    <div className="w-full h-28 rounded-lg overflow-hidden mb-2 bg-pos-accent/20">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="font-medium">{item.name}</div>
                  <div className="text-lg font-bold text-primary-400 mt-1">
                    ${item.currentPrice || item.basePrice}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 底部購物車列 */}
      {cart.length > 0 && (
        <div className="bg-pos-card border-t border-pos-accent/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-medium">
                {cart.reduce((sum, c) => sum + c.quantity, 0)} 品項
              </span>
              <div className="flex gap-2 overflow-x-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-1 bg-pos-accent/20 px-3 py-1 rounded-full text-sm">
                    <span>{item.name} ×{item.quantity}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                      className="text-pos-highlight ml-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              className="px-8 py-3 rounded-xl bg-primary-600 hover:bg-primary-700
                         text-white font-bold text-lg active:scale-95 transition-all"
            >
              送出訂單 ${grandTotal}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
