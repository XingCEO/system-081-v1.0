import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BellRing, ClipboardList, CookingPot, LogOut, Megaphone, PauseCircle, Search, ShoppingCart } from 'lucide-react';
import api from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import MenuCustomizerModal from '../../components/shared/MenuCustomizerModal';
import Modal from '../../components/shared/Modal';

function CheckoutModal({ open, onClose, tables, onSubmit }) {
  const cart = useCartStore();
  const [cashReceived, setCashReceived] = useState(cart.total());
  const [memberLookup, setMemberLookup] = useState(cart.memberPhone || '');
  const [foundMember, setFoundMember] = useState(cart.member || null);

  const lookupMutation = useMutation({
    mutationFn: (phone) => api.get(`/members/lookup?phone=${phone}`),
    onSuccess: (data) => {
      setFoundMember(data || null);
      cart.setMember(data || null);
      if (!data) {
        toast('查無會員資料');
      }
    }
  });

  useEffect(() => {
    setCashReceived(cart.total());
  }, [cart]);

  if (!open) {
    return null;
  }

  const pointsToEarn = Math.floor(cart.total() / 30);
  const change = Math.max(0, Number(cashReceived || 0) - cart.total());

  return (
    <Modal title="確認結帳" onClose={onClose} wide>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <section className="soft-panel p-5">
            <h3 className="section-title">訂單資訊</h3>
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
                <select className="field" value={cart.tableNumber} onChange={(event) => cart.setOrderField('tableNumber', event.target.value)}>
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
              <textarea className="field min-h-24 resize-none" value={cart.note} onChange={(event) => cart.setOrderField('note', event.target.value)} placeholder="例如：叫號後先保溫" />
            </div>
          </section>

          <section className="soft-panel p-5">
            <h3 className="section-title">會員與點數</h3>
            <div className="mt-4 flex gap-3">
              <input className="field" placeholder="輸入會員電話" value={memberLookup} onChange={(event) => setMemberLookup(event.target.value)} />
              <button type="button" className="ghost-button" onClick={() => lookupMutation.mutate(memberLookup)}>
                查詢
              </button>
            </div>
            {foundMember && (
              <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm leading-7 text-brand-700">
                會員：{foundMember.name}，目前 {foundMember.points} 點，本單可得 {pointsToEarn} 點。
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="soft-panel p-5">
            <h3 className="section-title">付款方式</h3>
            <div className="mt-4 grid gap-3">
              <select className="field" defaultValue="CASH" onChange={(event) => cart.setOrderField('paymentMethod', event.target.value)}>
                <option value="CASH">現金</option>
                <option value="CARD">刷卡</option>
                <option value="OTHER">其他</option>
              </select>
              <input className="field mono" inputMode="numeric" value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} placeholder="實收金額" />
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>合計</span>
                  <span className="mono text-base font-semibold text-slate-900">${cart.total()}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>找零</span>
                  <span className="mono text-base font-semibold text-brand-700">${change}</span>
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
              memberId: foundMember?.id
            })}
          >
            送出訂單並列印
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
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [callHistory, setCallHistory] = useState([]);

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
    mutationFn: (paused) => api.put('/settings', {
      ordering_state: { paused }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-availability'] });
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: (payload) => api.post('/orders', payload),
    onSuccess: () => {
      toast.success('訂單建立成功，已送單與列印');
      cart.clear();
      setShowCheckout(false);
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-availability'] });
    },
    onError: (error) => {
      toast.error(error.message || '建立訂單失敗');
    }
  });

  const categories = categoriesQuery.data || [];
  const availability = availabilityQuery.data || { paused: false, items: [] };
  const tables = tablesQuery.data || [];
  const recentOrders = ordersQuery.data?.slice(0, 8) || [];

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    const socket = connectSocket('pos');
    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['pos-orders'] });
      queryClient.invalidateQueries({ queryKey: ['pos-availability'] });
    });
    socket.on('stock:alert', (payload) => {
      toast.error(`${payload.name} 庫存只剩 ${payload.newStock} 份`);
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

  const filteredItems = useMemo(() => (
    selectedCategory
      ? availability.items.filter((item) => item.categoryId === selectedCategory)
      : availability.items
  ), [availability.items, selectedCategory]);

  const handleItemClick = (item) => {
    if (!item.available) {
      return;
    }

    if (item.addOnGroups?.length > 0) {
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
      items: cart.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        addons: item.addons,
        note: item.note
      }))
    });
  };

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="pill">收銀台 POS</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">晨光早餐店收銀站</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">{user?.name} / {user?.role}</span>
            <Link className="ghost-button" to="/kds"><CookingPot size={18} /> 廚房 KDS</Link>
            <Link className="ghost-button" to="/caller"><Megaphone size={18} /> 叫號屏</Link>
            <button type="button" className="ghost-button" onClick={logout}><LogOut size={18} /> 登出</button>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === category.id
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`ghost-button ${availability.paused ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}`}
                  disabled={!['OWNER', 'MANAGER'].includes(user?.role)}
                  onClick={() => togglePauseMutation.mutate(!availability.paused)}
                >
                  <PauseCircle size={18} />
                  {availability.paused ? '恢復點餐' : '暫停點餐'}
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={!item.available}
                  onClick={() => handleItemClick(item)}
                  className={`soft-panel p-5 text-left transition ${
                    item.available
                      ? 'hover:-translate-y-1 hover:border-brand-200'
                      : 'cursor-not-allowed opacity-40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-4xl">{item.emoji || '🍳'}</span>
                    {!item.available && <span className="pill border-red-100 bg-red-50 text-red-600">售完</span>}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-900">{item.name}</h2>
                  <p className="mt-2 min-h-10 text-sm leading-7 text-slate-500">{item.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-2xl font-black text-brand-600">${item.currentPrice}</div>
                    {item.currentPrice !== item.basePrice && (
                      <div className="mono text-sm text-slate-400 line-through">${item.basePrice}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="panel flex flex-col p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">右側購物車</p>
                <h2 className="text-2xl font-black text-slate-900">本單 {cart.items.reduce((sum, item) => sum + item.quantity, 0)} 件</h2>
              </div>
              <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
                <ShoppingCart size={16} className="mr-2 inline" />
                ${cart.total()}
              </div>
            </div>

            <div className="mt-5 flex-1 space-y-3 overflow-y-auto">
              {cart.items.length === 0 ? (
                <div className="soft-panel p-5 text-sm leading-7 text-slate-500">
                  左側點一下商品就會加入購物車，可選加料、調整數量，再進入結帳。
                </div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.signature} className="soft-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span>{item.emoji || '🍳'}</span>
                          <h3 className="font-bold text-slate-900">{item.name}</h3>
                        </div>
                        <p className="mono mt-1 text-sm text-brand-600">${item.unitPrice}</p>
                        {item.addons.length > 0 && (
                          <p className="mt-2 text-xs leading-6 text-slate-500">{item.addons.map((addon) => addon.name).join('、')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => cart.updateQuantity(item.signature, item.quantity - 1)}>-</button>
                        <span className="mono w-8 text-center">{item.quantity}</span>
                        <button type="button" className="ghost-button h-10 w-10 rounded-full p-0" onClick={() => cart.updateQuantity(item.signature, item.quantity + 1)}>+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 grid gap-3">
              <div className="soft-panel p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                  <span>小計</span>
                  <span className="mono">${cart.subtotal()}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-black text-slate-900">
                  <span>合計</span>
                  <span className="mono">${cart.total()}</span>
                </div>
              </div>
              <button type="button" className="action-button w-full py-3 text-lg" disabled={cart.items.length === 0} onClick={() => setShowCheckout(true)}>
                前往結帳
              </button>
            </div>
          </section>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="panel p-5">
            <div className="flex items-center gap-3">
              <ClipboardList size={18} className="text-brand-600" />
              <h2 className="section-title">今日訂單快覽</h2>
            </div>
            <div className="mt-4 space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="mono font-semibold text-slate-900">{order.orderNumber}</span>
                    <span className="pill">{order.status}</span>
                  </div>
                  <div className="mt-2 text-slate-500">NT${order.total}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel p-5">
            <div className="flex items-center gap-3">
              <Megaphone size={18} className="text-brand-600" />
              <h2 className="section-title">叫號記錄</h2>
            </div>
            <div className="mt-4 space-y-3">
              {callHistory.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">目前還沒有完成叫號。</div>
              ) : (
                callHistory.map((entry, index) => (
                  <div key={`${entry.orderNumber}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                    <div className="mono text-lg font-bold text-slate-900">#{entry.orderNumber}</div>
                    <div className="text-sm text-slate-500">{entry.type}</div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="panel p-5">
            <div className="flex items-center gap-3">
              <BellRing size={18} className="text-brand-600" />
              <h2 className="section-title">現場提示</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-500">
              <div className="rounded-2xl bg-slate-50 p-4">點餐暫停開關已放在上方，可由老闆或店長直接控制。</div>
              <div className="rounded-2xl bg-slate-50 p-4">每滿 NT$30 自動累積 1 點，結帳視窗會同步顯示。</div>
              <div className="rounded-2xl bg-slate-50 p-4">KDS 完成後會透過 Socket.IO 即時推到叫號畫面與這裡的記錄區。</div>
            </div>
          </article>
        </section>

        {selectedItem && (
          <MenuCustomizerModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onConfirm={(addons, note) => {
              cart.addItem(selectedItem, addons, note);
              setSelectedItem(null);
            }}
          />
        )}

        <CheckoutModal open={showCheckout} onClose={() => setShowCheckout(false)} tables={tables} onSubmit={handleSubmitOrder} />
      </div>
    </div>
  );
}
