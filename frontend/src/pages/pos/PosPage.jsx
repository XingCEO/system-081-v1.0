import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BellRing,
  ClipboardList,
  CookingPot,
  LogOut,
  Megaphone,
  PauseCircle,
  Plus,
  Search,
  ShoppingCart,
  Trash2
} from 'lucide-react';
import api from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import MenuCustomizerModal from '../../components/shared/MenuCustomizerModal';
import Modal from '../../components/shared/Modal';

function formatCurrency(value) {
  return `NT$${Number(value || 0).toFixed(0)}`;
}

function formatOrderType(type) {
  const typeMap = {
    DINE_IN: '內用',
    TAKEOUT: '外帶',
    DELIVERY: '外送',
    PHONE: '電話'
  };

  return typeMap[type] || type;
}

function calculateMaxRedeemPoints(cart) {
  const redeemRate = Number(cart.pointsRule?.redeemRate || 1);
  const availableAmount = Math.max(0, cart.subtotal() - Number(cart.discount || 0));

  if (redeemRate <= 0) {
    return 0;
  }

  return Math.floor(availableAmount / redeemRate);
}

function CheckoutModal({ open, onClose, tables, onSubmit }) {
  const cart = useCartStore();
  const [memberLookup, setMemberLookup] = useState(cart.memberPhone || '');
  const [cashReceived, setCashReceived] = useState(cart.total());

  const lookupMutation = useMutation({
    mutationFn: (phone) => api.get(`/members/lookup?phone=${phone}`),
    onSuccess: (data) => {
      cart.setMember(data || null);

      if (data) {
        toast.success(`已帶入會員：${data.name}`);
      } else {
        toast('查無會員，仍可直接結帳。');
      }
    },
    onError: (error) => toast.error(error.message || '會員查詢失敗')
  });

  useEffect(() => {
    setMemberLookup(cart.memberPhone || '');
  }, [cart.memberPhone]);

  useEffect(() => {
    setCashReceived(cart.total());
  }, [cart.items, cart.discount, cart.redeemPoints, cart.pointsRule, cart]);

  if (!open) {
    return null;
  }

  const redeemRate = Number(cart.pointsRule?.redeemRate || 1);
  const availablePoints = cart.member?.points || 0;
  const maxRedeemPoints = Math.min(availablePoints, calculateMaxRedeemPoints(cart));
  const change = Math.max(0, Number(cashReceived || 0) - cart.total());
  const earnPoints = cart.earnPoints();

  return (
    <Modal title="結帳確認" onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className="soft-panel p-5">
            <h3 className="section-title">用餐方式</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {[
                ['DINE_IN', '內用'],
                ['TAKEOUT', '外帶'],
                ['DELIVERY', '外送']
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => cart.setOrderField('orderType', value)}
                  className={`rounded-2xl border px-4 py-3 font-semibold transition ${
                    cart.orderType === value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {cart.orderType === 'DINE_IN' && (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">桌號</label>
                <select
                  className="field"
                  value={cart.tableNumber}
                  onChange={(event) => cart.setOrderField('tableNumber', event.target.value)}
                >
                  <option value="">請選擇桌號</option>
                  {tables.map((table) => (
                    <option key={table.id} value={table.number}>
                      {table.number} 號桌
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">整單備註</label>
              <textarea
                className="field min-h-24 resize-none"
                value={cart.note}
                onChange={(event) => cart.setOrderField('note', event.target.value)}
                placeholder="例如：餐點分袋、先做飲料、外帶附吸管。"
              />
            </div>
          </section>

          <section className="soft-panel p-5">
            <h3 className="section-title">會員與點數</h3>

            <div className="mt-4 flex gap-3">
              <input
                className="field"
                placeholder="輸入會員手機"
                value={memberLookup}
                onChange={(event) => setMemberLookup(event.target.value)}
              />
              <button type="button" className="ghost-button" onClick={() => lookupMutation.mutate(memberLookup)}>
                <Search size={16} />
              </button>
            </div>

            {cart.member && (
              <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm leading-7 text-brand-700">
                會員 {cart.member.name}，目前點數 {cart.member.points} 點，本筆預計新增 {earnPoints} 點。
              </div>
            )}

            {cart.member && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">折扣金額</label>
                  <input
                    className="field mono"
                    inputMode="numeric"
                    value={cart.discount}
                    onChange={(event) => cart.setOrderField('discount', Number(event.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    折抵點數
                    <span className="ml-2 text-xs text-slate-400">1 點 = NT${redeemRate}</span>
                  </label>
                  <input
                    className="field mono"
                    inputMode="numeric"
                    max={maxRedeemPoints}
                    value={cart.redeemPoints}
                    onChange={(event) => {
                      const nextValue = Math.min(Number(event.target.value || 0), maxRedeemPoints);
                      cart.setOrderField('redeemPoints', nextValue);
                    }}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    本單最多可使用 {maxRedeemPoints} 點，可折抵 {formatCurrency(maxRedeemPoints * redeemRate)}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="soft-panel p-5">
            <h3 className="section-title">付款資訊</h3>
            <div className="mt-4 grid gap-3">
              <select
                className="field"
                value={cart.paymentMethod || 'CASH'}
                onChange={(event) => cart.setOrderField('paymentMethod', event.target.value)}
              >
                <option value="CASH">現金</option>
                <option value="CARD">刷卡</option>
                <option value="LINE_PAY">LINE Pay</option>
                <option value="OTHER">其他</option>
              </select>
              <input
                className="field mono"
                inputMode="numeric"
                value={cashReceived}
                onChange={(event) => setCashReceived(event.target.value)}
                placeholder="實收金額"
              />
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>應收金額</span>
                  <span className="mono text-base font-semibold text-slate-900">{formatCurrency(cart.total())}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>點數折抵</span>
                  <span className="mono text-base font-semibold text-slate-900">{formatCurrency(cart.redeemValue())}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>找零</span>
                  <span className="mono text-base font-semibold text-brand-700">{formatCurrency(change)}</span>
                </div>
              </div>
            </div>
          </section>

          <button
            type="button"
            className="action-button w-full py-3 text-lg"
            onClick={() => onSubmit({
              paymentMethod: cart.paymentMethod || 'CASH',
              receivedAmount: Number(cashReceived || 0),
              memberId: cart.member?.id || undefined
            })}
          >
            送單並完成結帳
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function PosPage() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const cart = useCartStore();
  const setCartPointsRule = useCartStore((state) => state.setPointsRule);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [callHistory, setCallHistory] = useState([]);
  const [successOrder, setSuccessOrder] = useState(null);

  const categoriesQuery = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/menu/categories')
  });

  const availabilityQuery = useQuery({
    queryKey: ['pos-availability'],
    queryFn: () => api.get('/menu/availability')
  });

  const tablesQuery = useQuery({
    queryKey: ['pos-tables'],
    queryFn: () => api.get('/tables')
  });

  const ordersQuery = useQuery({
    queryKey: ['pos-orders'],
    queryFn: () => api.get('/orders')
  });

  const togglePauseMutation = useMutation({
    mutationFn: (paused) => api.put('/settings', { ordering_state: { paused } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pos-availability'] }),
    onError: (error) => toast.error(error.message || '更新暫停點餐狀態失敗')
  });

  const createOrderMutation = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: (data) => {
      toast.success(`訂單 ${data.orderNumber} 已送出`);
      setSuccessOrder(data);
      cart.clear();
      setShowCheckout(false);
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-availability'] });
    },
    onError: (error) => toast.error(error.message || '建立訂單失敗')
  });

  const reprintMutation = useMutation({
    mutationFn: (id) => api.post(`/orders/${id}/print`),
    onSuccess: () => toast.success('補印指令已送出'),
    onError: (error) => toast.error(error.message || '補印失敗')
  });

  const categories = categoriesQuery.data || [];
  const availability = availabilityQuery.data || {
    paused: false,
    pointsRule: { earnEvery: 30, earnPoints: 1, redeemRate: 1 },
    items: []
  };
  const tables = tablesQuery.data || [];
  const recentOrders = ordersQuery.data?.slice(0, 8) || [];

  useEffect(() => {
    setCartPointsRule(availability.pointsRule);
  }, [availability.pointsRule, setCartPointsRule]);

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    if (!successOrder) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccessOrder(null), 5000);
    return () => window.clearTimeout(timer);
  }, [successOrder]);

  useEffect(() => {
    const socket = connectSocket('pos');

    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-availability'] });
    });
    socket.on('stock:alert', (payload) => {
      toast.error(`${payload.name} 庫存不足，目前剩餘 ${payload.newStock}`);
    });
    socket.on('kitchen:call', (payload) => {
      setCallHistory((current) => [payload, ...current].slice(0, 10));
    });

    return () => {
      socket.off('order:new');
      socket.off('stock:alert');
      socket.off('kitchen:call');
    };
  }, [queryClient]);

  const filteredItems = useMemo(
    () => (selectedCategory ? availability.items.filter((item) => item.categoryId === selectedCategory) : availability.items),
    [availability.items, selectedCategory]
  );

  const handleItemClick = (item) => {
    if (!item.available) {
      return;
    }

    if (item.isCombo || item.addOnGroups?.length > 0 || item.comboGroups?.length > 0) {
      setSelectedItem(item);
      return;
    }

    cart.addItem(item);
  };

  const handleSubmitOrder = (payment) => {
    createOrderMutation.mutate({
      type: cart.orderType,
      tableNumber: cart.tableNumber || undefined,
      memberId: payment.memberId,
      note: cart.note,
      paymentMethod: payment.paymentMethod,
      receivedAmount: payment.receivedAmount,
      source: 'pos',
      autoPrint: true,
      redeemPoints: Number(cart.redeemPoints || 0),
      discount: Number(cart.discount || 0),
      items: cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        addons: item.addons,
        comboSelections: item.comboSelections,
        note: item.note
      }))
    });
  };

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="pill">收銀台 POS</p>
            <h1 className="mt-3 text-3xl font-black text-slate-900">早餐店收銀與出單中心</h1>
            <p className="mt-2 text-sm text-slate-500">
              目前登入：{user?.name} / {user?.role}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="ghost-button"
              disabled={user?.role === 'STAFF' || togglePauseMutation.isPending}
              onClick={() => togglePauseMutation.mutate(!availability.paused)}
            >
              <PauseCircle size={18} />
              {availability.paused ? '恢復點餐' : '暫停點餐'}
            </button>
            <Link className="ghost-button" to="/kds">
              <CookingPot size={18} />
              廚房看板
            </Link>
            <Link className="ghost-button" to="/caller">
              <Megaphone size={18} />
              叫號螢幕
            </Link>
            <button type="button" className="ghost-button" onClick={logout}>
              <LogOut size={18} />
              登出
            </button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <section className="panel overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex gap-2 overflow-x-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === category.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => handleItemClick(item)}
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
                    {item.description || '可直接加入購物車，也可進一步設定加料與備註。'}
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
          </section>

          <aside className="flex flex-col gap-4">
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">購物車</p>
                  <h2 className="mt-1 flex items-center gap-2 text-2xl font-black text-slate-900">
                    <ShoppingCart size={22} />
                    {cart.items.reduce((sum, item) => sum + item.quantity, 0)} 項
                  </h2>
                </div>
                <button type="button" className="ghost-button px-3 py-2" onClick={() => cart.clear()}>
                  清空
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {cart.items.length === 0 && (
                  <div className="soft-panel p-5 text-sm text-slate-500">
                    目前還沒有餐點，請從左側菜單點選商品。
                  </div>
                )}

                {cart.items.map((item) => (
                  <div key={item.signature} className="soft-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span>{item.emoji || '🍳'}</span>
                          <h3 className="truncate font-bold text-slate-900">{item.name}</h3>
                        </div>
                        <p className="mono mt-1 text-sm text-brand-700">{formatCurrency(item.unitPrice)}</p>
                        {item.modifiers?.length > 0 && (
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            {item.modifiers.map((modifier) => modifier.groupName ? `${modifier.groupName}：${modifier.name}` : modifier.name).join('、')}
                          </p>
                        )}
                        {item.note && <p className="mt-2 text-xs font-semibold text-amber-700">備註：{item.note}</p>}
                      </div>
                      <button
                        type="button"
                        className="ghost-button h-10 w-10 rounded-full p-0"
                        onClick={() => cart.removeItem(item.signature)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        className="ghost-button h-10 w-10 rounded-full p-0"
                        onClick={() => cart.updateQuantity(item.signature, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="mono w-10 text-center text-base font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        className="ghost-button h-10 w-10 rounded-full p-0"
                        onClick={() => cart.updateQuantity(item.signature, item.quantity + 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>小計</span>
                  <span className="mono">{formatCurrency(cart.subtotal())}</span>
                </div>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>折扣 / 點數折抵</span>
                  <span className="mono">
                    -{formatCurrency(Number(cart.discount || 0) + Number(cart.redeemValue() || 0))}
                  </span>
                </div>
                <div className="flex items-center justify-between text-lg font-black text-slate-900">
                  <span>合計</span>
                  <span className="mono">{formatCurrency(cart.total())}</span>
                </div>
                <button
                  type="button"
                  className="action-button mt-4 w-full py-3 text-lg"
                  disabled={cart.items.length === 0 || createOrderMutation.isPending}
                  onClick={() => setShowCheckout(true)}
                >
                  前往結帳
                </button>
              </div>
            </section>

            <section className="panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <ClipboardList size={18} className="text-brand-600" />
                <h2 className="section-title">今日訂單快覽</h2>
              </div>
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="mono font-bold text-slate-900">{order.orderNumber}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {formatOrderType(order.type)} / {order.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mono font-semibold text-brand-700">{formatCurrency(order.total)}</div>
                        <button
                          type="button"
                          className="mt-2 text-xs font-semibold text-slate-500 hover:text-brand-700"
                          onClick={() => reprintMutation.mutate(order.id)}
                        >
                          補印
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && <div className="soft-panel p-4 text-sm text-slate-500">目前尚無訂單資料。</div>}
              </div>
            </section>

            <section className="panel p-5">
              <div className="mb-4 flex items-center gap-2">
                <BellRing size={18} className="text-brand-600" />
                <h2 className="section-title">叫號記錄</h2>
              </div>
              <div className="space-y-3">
                {callHistory.map((entry, index) => (
                  <div key={`${entry.orderNumber}-${index}`} className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
                    {entry.orderNumber}
                    {entry.type === 'DINE_IN' && entry.tableNumber ? ` / 桌號 ${entry.tableNumber}` : ''}
                  </div>
                ))}
                {callHistory.length === 0 && <div className="soft-panel p-4 text-sm text-slate-500">尚未收到新的叫號通知。</div>}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <CheckoutModal
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        tables={tables}
        onSubmit={handleSubmitOrder}
      />

      {selectedItem && (
        <MenuCustomizerModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onConfirm={(addons, note, comboSelections) => {
            cart.addItem(selectedItem, addons, note, comboSelections);
            setSelectedItem(null);
          }}
        />
      )}

      {successOrder && (
        <Modal title="訂單建立成功" onClose={() => setSuccessOrder(null)}>
          <div className="space-y-5">
            <div className="soft-panel p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Order Created</p>
              <h3 className="mono mt-3 text-4xl font-black text-slate-900">{successOrder.orderNumber}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                餐點已送往廚房並同步列印。收銀畫面已回到待命狀態，可立即開始下一筆點餐。
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="soft-panel p-4">
                <div className="text-sm text-slate-500">訂單金額</div>
                <div className="mono mt-2 text-2xl font-black text-brand-700">{formatCurrency(successOrder.total)}</div>
              </div>
              <div className="soft-panel p-4">
                <div className="text-sm text-slate-500">訂單類型</div>
                <div className="mt-2 text-2xl font-black text-slate-900">{formatOrderType(successOrder.type)}</div>
              </div>
            </div>
            <button type="button" className="action-button w-full py-3 text-lg" onClick={() => setSuccessOrder(null)}>
              繼續下一筆訂單
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
