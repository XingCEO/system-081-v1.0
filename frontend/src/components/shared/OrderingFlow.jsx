import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import MenuCustomizerModal from './MenuCustomizerModal';

function createCartItem(item, addons = [], note = '') {
  const addonTotal = addons.reduce((sum, addon) => sum + Number(addon.price || 0), 0);
  return {
    id: `${item.id}-${Date.now()}-${Math.random()}`,
    menuItemId: item.id,
    name: item.name,
    emoji: item.emoji,
    quantity: 1,
    unitPrice: Number(item.currentPrice ?? item.basePrice) + addonTotal,
    addons,
    note
  };
}

export default function OrderingFlow({ mode, tableNumber = '' }) {
  const [step, setStep] = useState(mode === 'qr' ? 'menu' : 'welcome');
  const [orderType, setOrderType] = useState(mode === 'qr' ? 'DINE_IN' : 'TAKEOUT');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [memberPhone, setMemberPhone] = useState('');
  const [member, setMember] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderResult, setOrderResult] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['frontend-categories'],
    queryFn: () => api.get('/menu/categories')
  });

  const availabilityQuery = useQuery({
    queryKey: ['frontend-availability'],
    queryFn: () => api.get('/menu/availability')
  });

  const lookupMemberMutation = useMutation({
    mutationFn: (phone) => api.get(`/members/lookup?phone=${phone}`),
    onSuccess: (data) => {
      setMember(data || null);
      if (data) {
        toast.success(`找到會員 ${data.name}`);
      } else {
        toast('此電話尚未建立會員');
      }
    }
  });

  const orderMutation = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: (data) => {
      setOrderResult(data);
      setStep('done');
      setCart([]);
      setMember(null);
      setMemberPhone('');
      setUsePoints(false);
    },
    onError: (error) => {
      toast.error(error.message || '建立訂單失敗');
    }
  });

  const categories = categoriesQuery.data || [];
  const availability = availabilityQuery.data || { paused: false, items: [] };
  const items = availability.items || [];

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    let timeoutId;
    const startTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mode === 'kiosk') {
          setStep('welcome');
          setCart([]);
          setMember(null);
          setMemberPhone('');
        }
      }, 60000);
    };

    startTimer();
    window.addEventListener('touchstart', startTimer);
    window.addEventListener('click', startTimer);
    window.addEventListener('keydown', startTimer);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('touchstart', startTimer);
      window.removeEventListener('click', startTimer);
      window.removeEventListener('keydown', startTimer);
    };
  }, [mode, step]);

  const filteredItems = useMemo(() => (
    selectedCategory
      ? items.filter((item) => item.categoryId === selectedCategory)
      : items
  ), [items, selectedCategory]);

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const redeemPoints = usePoints ? Math.min(member?.points || 0, subtotal) : 0;
  const total = Math.max(0, subtotal - redeemPoints);

  const addToCart = (item, addons = [], note = '') => {
    setCart((current) => {
      const signature = JSON.stringify({
        menuItemId: item.id,
        addons: addons.map((addon) => addon.name).sort(),
        note
      });
      const existing = current.find((entry) => entry.signature === signature);
      if (existing) {
        return current.map((entry) => (
          entry.signature === signature
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        ));
      }

      return [...current, { ...createCartItem(item, addons, note), signature }];
    });
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      toast.error('請先加入餐點');
      return;
    }

    orderMutation.mutate({
      type: mode === 'qr' ? 'DINE_IN' : orderType,
      source: mode,
      tableNumber,
      memberId: member?.id,
      memberPhone: memberPhone || undefined,
      redeemPoints,
      mergeExisting: mode === 'qr',
      autoPrint: false,
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        addons: item.addons,
        note: item.note
      }))
    });
  };

  if (step === 'welcome') {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel max-w-5xl p-8 md:p-10">
          <p className="pill">自助點餐 Kiosk</p>
          <h1 className="mt-5 text-4xl font-black text-slate-900 md:text-5xl">歡迎光臨晨光早餐店</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            點一下開始，先選擇內用或外帶，接著就能快速完成餐點選購。
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {[
              { type: 'DINE_IN', title: '內用', text: '直接取餐後入座，用餐流程最快。', emoji: '🍽️' },
              { type: 'TAKEOUT', title: '外帶', text: '完成後等待叫號，櫃檯取餐帶走。', emoji: '🥡' }
            ].map((entry) => (
              <button
                key={entry.type}
                type="button"
                onClick={() => {
                  setOrderType(entry.type);
                  setStep('menu');
                }}
                className="soft-panel group p-8 text-left transition hover:-translate-y-1 hover:border-brand-200"
              >
                <div className="text-5xl">{entry.emoji}</div>
                <h2 className="mt-5 text-3xl font-black text-slate-900">{entry.title}</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">{entry.text}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done' && orderResult) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-3xl p-10 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-4xl text-brand-600">
            ✓
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">訂單建立完成</p>
          <h1 className="mt-3 text-5xl font-black text-slate-900">{orderResult.orderNumber}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            餐點已送進廚房，請留意叫號畫面。完成後會顯示最新叫號。
          </p>
          <button
            type="button"
            className="action-button mt-8 px-8 py-3 text-lg"
            onClick={() => {
              setOrderResult(null);
              setStep(mode === 'qr' ? 'menu' : 'welcome');
            }}
          >
            重新點餐
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[130px_minmax(0,1fr)_360px]">
        <aside className="panel hidden p-3 lg:block">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setSelectedCategory(category.id)}
              className={`mb-2 w-full rounded-3xl px-3 py-4 text-left transition ${
                selectedCategory === category.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              <div className="text-sm font-semibold">{category.name}</div>
              <div className="mt-1 text-xs opacity-80">{category.itemCount} 項</div>
            </button>
          ))}
        </aside>

        <main className="panel flex min-h-[70vh] flex-col overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="pill">{mode === 'qr' ? `桌號 ${tableNumber}` : orderType === 'DINE_IN' ? '內用' : '外帶'}</p>
              <h1 className="mt-3 text-2xl font-black text-slate-900">
                {mode === 'qr' ? '桌邊加點' : '請選擇您的餐點'}
              </h1>
            </div>
            {availability.paused && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                目前店家暫停點餐中
              </div>
            )}
          </header>

          <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.available}
                onClick={() => {
                  if (item.addOnGroups?.length > 0) {
                    setSelectedItem(item);
                  } else {
                    addToCart(item);
                  }
                }}
                className={`soft-panel p-5 text-left transition ${
                  item.available
                    ? 'hover:-translate-y-1 hover:border-brand-200'
                    : 'cursor-not-allowed opacity-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-4xl">{item.emoji || '🍳'}</div>
                  {!item.available && <span className="pill border-red-100 bg-red-50 text-red-600">售完</span>}
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900">{item.name}</h2>
                <p className="mt-2 min-h-12 text-sm leading-7 text-slate-500">{item.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-2xl font-black text-brand-600">${item.currentPrice}</div>
                  {item.currentPrice !== item.basePrice && (
                    <div className="mono text-sm text-slate-400 line-through">${item.basePrice}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </main>

        <aside className="panel flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">購物車</p>
              <h2 className="text-2xl font-black text-slate-900">{cart.reduce((sum, item) => sum + item.quantity, 0)} 件商品</h2>
            </div>
            <span className="pill">{mode === 'qr' ? '桌邊點餐' : '自助點餐'}</span>
          </div>

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="soft-panel p-5 text-sm leading-7 text-slate-500">
                先從左邊選餐點，加入後會在這裡顯示。
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="soft-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{item.name}</h3>
                      <p className="mono mt-1 text-sm text-brand-600">${item.unitPrice}</p>
                      {item.addons.length > 0 && (
                        <p className="mt-2 text-xs leading-6 text-slate-500">{item.addons.map((addon) => addon.name).join('、')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => setCart((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: Math.max(1, entry.quantity - 1) } : entry))}>-</button>
                      <span className="mono w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => setCart((current) => current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry))}>+</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <input
              className="field"
              placeholder="輸入會員電話"
              value={memberPhone}
              onChange={(event) => setMemberPhone(event.target.value)}
            />
            <button type="button" className="ghost-button w-full" onClick={() => lookupMemberMutation.mutate(memberPhone)}>
              查詢會員
            </button>
            {member && (
              <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                會員 {member.name}，目前 {member.points} 點
              </div>
            )}
            {member && (
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <input type="checkbox" checked={usePoints} onChange={(event) => setUsePoints(event.target.checked)} />
                使用點數折抵（最多 {member.points} 元）
              </label>
            )}
            <div className="soft-panel p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>小計</span>
                <span className="mono">${subtotal}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>點數折抵</span>
                <span className="mono">-${redeemPoints}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black text-slate-900">
                <span>合計</span>
                <span className="mono">${total}</span>
              </div>
            </div>
            <button type="button" className="action-button w-full py-3 text-lg" disabled={availability.paused || orderMutation.isPending} onClick={placeOrder}>
              {orderMutation.isPending ? '送單中...' : '確認送出'}
            </button>
          </div>
        </aside>
      </div>

      {selectedItem && (
        <MenuCustomizerModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(addons, note) => {
            addToCart(selectedItem, addons, note);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
