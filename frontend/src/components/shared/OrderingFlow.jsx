import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Clock3, Minus, Phone, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import MenuCustomizerModal from './MenuCustomizerModal';

function formatCurrency(value) {
  return `NT$${Number(value || 0).toFixed(0)}`;
}

function createCartItem(item, addons = [], note = '', comboSelections = []) {
  const modifierTotal =
    addons.reduce((sum, entry) => sum + Number(entry.price || 0), 0) +
    comboSelections.reduce((sum, entry) => sum + Number(entry.price || 0), 0);
  const signature = JSON.stringify({
    menuItemId: item.id,
    addons: addons.map((entry) => `${entry.id || entry.name}:${entry.price || 0}`).sort(),
    comboSelections: comboSelections
      .map((entry) => `${entry.groupName}:${entry.menuItemId || entry.name}:${entry.price || 0}`)
      .sort(),
    note: note.trim()
  });

  return {
    id: `${item.id}-${Date.now()}-${Math.random()}`,
    signature,
    menuItemId: item.id,
    externalCode: item.externalCode || null,
    name: item.name,
    emoji: item.emoji,
    quantity: 1,
    unitPrice: Number(item.currentPrice ?? item.basePrice) + modifierTotal,
    addons,
    comboSelections,
    modifiers: [...comboSelections, ...addons],
    note: note.trim()
  };
}

function EmptyState({ title, description }) {
  return (
    <div className="soft-panel p-6 text-center">
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
    </div>
  );
}

function calculateEarnPoints(total, pointsRule) {
  const earnEvery = Number(pointsRule?.earnEvery || 30);
  const earnPoints = Number(pointsRule?.earnPoints || 1);

  if (earnEvery <= 0) {
    return 0;
  }

  return Math.floor(Number(total || 0) / earnEvery) * earnPoints;
}

export default function OrderingFlow({ mode, tableNumber = '' }) {
  const isQrMode = mode === 'qr';
  const [step, setStep] = useState(isQrMode ? 'menu' : 'welcome');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [orderType, setOrderType] = useState(isQrMode ? 'DINE_IN' : 'TAKEOUT');
  const [memberPhone, setMemberPhone] = useState('');
  const [member, setMember] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [orderNote, setOrderNote] = useState('');
  const [cart, setCart] = useState([]);
  const [orderResult, setOrderResult] = useState(null);
  const [countdown, setCountdown] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['ordering-categories'],
    queryFn: () => api.get('/menu/categories')
  });

  const availabilityQuery = useQuery({
    queryKey: ['ordering-availability'],
    queryFn: () => api.get('/menu/availability')
  });

  const lookupMemberMutation = useMutation({
    mutationFn: (phone) => api.get(`/members/lookup?phone=${phone}`),
    onSuccess: (data) => {
      setMember(data || null);
      if (data) {
        toast.success(`已套用會員：${data.name}`);
      } else {
        toast('查無會員資料，可直接結帳。');
      }
    },
    onError: (error) => {
      toast.error(error.message || '會員查詢失敗');
    }
  });

  const orderMutation = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: (data) => {
      setOrderResult(data);
      setCart([]);
      setUsePoints(false);
      setOrderNote('');
      setMember(null);
      setMemberPhone('');
      setStep('success');
      setCountdown(isQrMode ? 8 : 10);
      toast.success('訂單送出成功');
    },
    onError: (error) => {
      toast.error(error.message || '建立訂單失敗');
    }
  });

  const categories = categoriesQuery.data || [];
  const availability = availabilityQuery.data || {
    paused: false,
    pointsRule: { earnEvery: 30, earnPoints: 1, redeemRate: 1 },
    items: []
  };
  const items = availability.items || [];
  const pointsRule = availability.pointsRule || { earnEvery: 30, earnPoints: 1, redeemRate: 1 };

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (step !== 'success' || countdown === null) {
      return undefined;
    }

    if (countdown <= 0) {
      setOrderResult(null);
      setCountdown(null);
      setStep(isQrMode ? 'menu' : 'welcome');
      return undefined;
    }

    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, isQrMode, step]);

  useEffect(() => {
    if (mode !== 'kiosk') {
      return undefined;
    }

    let timeoutId;

    const resetIdleTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (step !== 'success') {
          setStep('welcome');
          setCart([]);
          setMember(null);
          setMemberPhone('');
          setUsePoints(false);
          setOrderNote('');
        }
      }, 60000);
    };

    resetIdleTimer();
    window.addEventListener('pointerdown', resetIdleTimer);
    window.addEventListener('keydown', resetIdleTimer);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
    };
  }, [mode, step]);

  const filteredItems = useMemo(
    () => (selectedCategory ? items.filter((item) => item.categoryId === selectedCategory) : items),
    [items, selectedCategory]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );
  const redeemRate = Number(pointsRule.redeemRate || 1);
  const maxRedeemPoints = useMemo(() => {
    if (!member || redeemRate <= 0) {
      return 0;
    }

    return Math.min(member.points, Math.floor(subtotal / redeemRate));
  }, [member, redeemRate, subtotal]);
  const redeemPoints = useMemo(
    () => (usePoints ? maxRedeemPoints : 0),
    [maxRedeemPoints, usePoints]
  );
  const total = Math.max(0, subtotal - (redeemPoints * redeemRate));
  const earnPoints = calculateEarnPoints(total, pointsRule);

  const resetToStart = () => {
    setStep(isQrMode ? 'menu' : 'welcome');
    setCart([]);
    setOrderResult(null);
    setCountdown(null);
    setMember(null);
    setMemberPhone('');
    setUsePoints(false);
    setOrderNote('');
  };

  const addToCart = (item, addons = [], note = '', comboSelections = []) => {
    const nextItem = createCartItem(item, addons, note, comboSelections);

    setCart((current) => {
      const existing = current.find((entry) => entry.signature === nextItem.signature);

      if (existing) {
        return current.map((entry) => (
          entry.signature === nextItem.signature
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        ));
      }

      return [...current, nextItem];
    });

    toast.success(`${item.name} 已加入購物車`);
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }

    setCart((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const placeOrder = () => {
    if (cart.length === 0) {
      toast.error('請先選擇餐點');
      return;
    }

    if (isQrMode && !tableNumber) {
      toast.error('目前缺少桌號資訊，請重新掃描桌邊 QR Code');
      return;
    }

    orderMutation.mutate({
      type: isQrMode ? 'DINE_IN' : orderType,
      source: mode,
      tableNumber: isQrMode ? tableNumber : undefined,
      memberId: member?.id,
      memberPhone: memberPhone || undefined,
      note: orderNote || undefined,
      redeemPoints,
      mergeExisting: isQrMode,
      autoPrint: false,
      items: cart.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        addons: item.addons,
        comboSelections: item.comboSelections,
        note: item.note || null
      }))
    });
  };

  if (step === 'welcome') {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-6xl p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <p className="pill">自助點餐 Kiosk</p>
              <h1 className="mt-5 text-4xl font-black text-slate-900 md:text-5xl">歡迎使用早餐店自助點餐</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                可選擇內用或外帶，支援加料、套餐搭配、會員累點與成功叫號流程。
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {[
                  ['大字觸控操作', '適合平板與自助機使用，點餐流程清楚直覺。'],
                  ['送單同步廚房', '送單後會立刻推送到 KDS，不需要重整畫面。'],
                  ['會員累點折抵', '支援手機查詢會員與使用點數折抵。']
                ].map(([title, description]) => (
                  <div key={title} className="soft-panel p-5">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  type: 'DINE_IN',
                  title: '內用點餐',
                  description: '適合現場入座客人，完成點餐後可等待餐點製作與叫號。',
                  emoji: '🍽️'
                },
                {
                  type: 'TAKEOUT',
                  title: '外帶點餐',
                  description: '快速建立外帶訂單，完成後顯示訂單號碼並等待叫號。',
                  emoji: '🥡'
                }
              ].map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  onClick={() => {
                    setOrderType(entry.type);
                    setStep('menu');
                  }}
                  className="soft-panel p-8 text-left transition hover:-translate-y-1 hover:border-brand-200"
                >
                  <div className="text-5xl">{entry.emoji}</div>
                  <h2 className="mt-4 text-3xl font-black text-slate-900">{entry.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{entry.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success' && orderResult) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10">
        <div className="panel w-full max-w-3xl p-10 text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-5xl text-brand-600">
            ✓
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">訂單建立成功</p>
          <h1 className="mono mt-3 text-5xl font-black text-slate-900">{orderResult.orderNumber}</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {isQrMode
              ? `桌號 ${tableNumber} 的餐點已送出，可繼續加點或等待餐點完成。`
              : '請留意現場叫號螢幕或櫃台提醒，餐點完成後會通知取餐。'}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="soft-panel p-5 text-left">
              <div className="text-sm text-slate-500">訂單金額</div>
              <div className="mono mt-2 text-3xl font-black text-brand-700">{formatCurrency(orderResult.total)}</div>
            </div>
            <div className="soft-panel p-5 text-left">
              <div className="text-sm text-slate-500">回首頁倒數</div>
              <div className="mt-2 flex items-center gap-2 text-3xl font-black text-slate-900">
                <Clock3 size={24} />
                {countdown ?? 0}s
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" className="action-button px-8 py-3 text-lg" onClick={resetToStart}>
              {isQrMode ? '回到加點頁' : '回到首頁'}
            </button>
            {isQrMode && (
              <button
                type="button"
                className="ghost-button px-8 py-3 text-lg"
                onClick={() => {
                  setOrderResult(null);
                  setCountdown(null);
                  setStep('menu');
                }}
              >
                繼續加點
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isLoading = categoriesQuery.isLoading || availabilityQuery.isLoading;
  const hasError = categoriesQuery.isError || availabilityQuery.isError;

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-7xl flex-col gap-4 lg:grid lg:grid-cols-[140px_minmax(0,1fr)_380px]">
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

        <main className="panel flex min-h-[72vh] flex-col overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {!isQrMode && (
                  <button type="button" className="ghost-button px-3 py-2" onClick={() => setStep('welcome')}>
                    <ArrowLeft size={16} />
                    返回
                  </button>
                )}
                <p className="pill">
                  {isQrMode ? `桌號 ${tableNumber}` : orderType === 'DINE_IN' ? '內用' : '外帶'}
                </p>
              </div>
              <h1 className="mt-3 text-2xl font-black text-slate-900">
                {isQrMode ? '掃碼點餐 / 可追加餐點' : '請選擇想要的餐點'}
              </h1>
            </div>

            {availability.paused && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                店家目前暫停接單，請稍後再試。
              </div>
            )}
          </header>

          <div className="border-b border-slate-100 px-5 py-4 lg:hidden">
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${
                    selectedCategory === category.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {isLoading && <EmptyState title="菜單載入中" description="正在為你準備最新可販售品項..." />}
            {hasError && <EmptyState title="菜單載入失敗" description="請稍後重新整理，或洽詢現場人員協助。" />}
            {!isLoading && !hasError && filteredItems.length === 0 && (
              <EmptyState title="這個分類暫時沒有商品" description="請切換其他分類，或稍後再查看。" />
            )}

            {!isLoading && !hasError && filteredItems.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!item.available}
                    onClick={() => {
                      if (item.isCombo || item.addOnGroups?.length > 0 || item.comboGroups?.length > 0) {
                        setSelectedItem(item);
                        return;
                      }

                      addToCart(item);
                    }}
                    className={`soft-panel p-5 text-left transition ${
                      item.available ? 'hover:-translate-y-1 hover:border-brand-200' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-4xl">{item.emoji || '🍳'}</span>
                      <div className="flex gap-2">
                        {item.isCombo && <span className="pill border-brand-100 bg-brand-50 text-brand-700">套餐</span>}
                        {!item.available && <span className="pill border-red-100 bg-red-50 text-red-600">售完</span>}
                      </div>
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-7 text-slate-500">
                      {item.description || '可自訂加料、搭配套餐並加入購物車。'}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="mono text-2xl font-black text-brand-600">{formatCurrency(item.currentPrice)}</div>
                      {item.currentPrice !== item.basePrice && (
                        <div className="mono text-sm text-slate-400 line-through">{formatCurrency(item.basePrice)}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        <aside className="panel flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">購物車</p>
              <h2 className="text-2xl font-black text-slate-900">{cart.reduce((sum, item) => sum + item.quantity, 0)} 項餐點</h2>
            </div>
            <span className="pill">{isQrMode ? '可追加點餐' : '送出後進入廚房製作'}</span>
          </div>

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
            {cart.length === 0 ? (
              <EmptyState title="購物車是空的" description="請從左側選擇餐點，也可以自訂加料與備註。" />
            ) : (
              cart.map((item) => (
                <div key={item.id} className="soft-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{item.emoji || '🍳'}</span>
                        <h3 className="truncate font-bold text-slate-900">{item.name}</h3>
                      </div>
                      <p className="mono mt-1 text-sm text-brand-700">{formatCurrency(item.unitPrice)}</p>
                      {item.modifiers.length > 0 && (
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          {item.modifiers.map((modifier) => modifier.groupName ? `${modifier.groupName}：${modifier.name}` : modifier.name).join('、')}
                        </p>
                      )}
                      {item.note && <p className="mt-2 text-xs font-semibold text-amber-700">備註：{item.note}</p>}
                    </div>

                    <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => updateQuantity(item.id, 0)}>
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus size={16} />
                    </button>
                    <span className="mono w-10 text-center text-base font-semibold">{item.quantity}</span>
                    <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <div className="flex gap-3">
              <input
                className="field"
                placeholder="輸入會員手機"
                value={memberPhone}
                onChange={(event) => setMemberPhone(event.target.value)}
              />
              <button type="button" className="ghost-button px-4" onClick={() => lookupMemberMutation.mutate(memberPhone)}>
                <Phone size={16} />
              </button>
            </div>

            {member && (
              <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-700">
                會員 {member.name}，目前點數 {member.points} 點，本筆完成後預計新增 {earnPoints} 點。
              </div>
            )}

            {member && (
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                <input type="checkbox" checked={usePoints} onChange={(event) => setUsePoints(event.target.checked)} />
                使用點數折抵，可使用 {maxRedeemPoints} 點，折抵 {formatCurrency(maxRedeemPoints * redeemRate)}
              </label>
            )}

            <textarea
              className="field min-h-24 resize-none"
              placeholder={isQrMode ? '可輸入本次加點備註，例如不要胡椒、餐點分開放。' : '可輸入整筆訂單備註，例如外帶附餐具、飲料先做。'}
              value={orderNote}
              onChange={(event) => setOrderNote(event.target.value)}
            />

            <div className="soft-panel p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>小計</span>
                <span className="mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>點數折抵</span>
                <span className="mono">-{formatCurrency(redeemPoints * redeemRate)}</span>
              </div>
              <div className="flex items-center justify-between text-lg font-black text-slate-900">
                <span>合計</span>
                <span className="mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="button"
              className="action-button w-full py-3 text-lg"
              disabled={availability.paused || orderMutation.isPending}
              onClick={placeOrder}
            >
              {orderMutation.isPending ? '送單中...' : isQrMode ? '送出本次加點' : '確認點餐'}
            </button>
          </div>
        </aside>
      </div>

      {selectedItem && (
        <MenuCustomizerModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(addons, note, comboSelections) => {
            addToCart(selectedItem, addons, note, comboSelections);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
