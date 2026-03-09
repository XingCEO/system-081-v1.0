import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { connectSocket } from '../../lib/socket';
import api from '../../lib/api';

function getCardTone(waitMinutes) {
  if (waitMinutes > 15) return 'border-red-300 bg-red-50';
  if (waitMinutes > 10) return 'border-amber-300 bg-amber-50';
  return 'border-slate-200 bg-white';
}

function formatOrderType(order) {
  if (order.type === 'DINE_IN') {
    return order.table?.number ? `內用 / 桌號 ${order.table.number}` : '內用';
  }

  if (order.type === 'DELIVERY') {
    return '外送';
  }

  if (order.type === 'PHONE') {
    return '電話單';
  }

  return '外帶';
}

export default function KdsPage() {
  const queryClient = useQueryClient();
  const [latestCall, setLatestCall] = useState(null);

  const ordersQuery = useQuery({
    queryKey: ['kds-orders'],
    queryFn: () => api.get('/orders/kds')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: (data) => {
      if (data.status === 'READY') {
        setLatestCall(data.orderNumber);
        toast.success(`訂單 ${data.orderNumber} 已完成，已送出叫號`);
      } else {
        toast.success(`訂單 ${data.orderNumber} 已更新為製作中`);
      }
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
    },
    onError: (error) => toast.error(error.message || '更新狀態失敗')
  });

  useEffect(() => {
    const socket = connectSocket('kds');
    socket.on('order:new', () => {
      queryClient.invalidateQueries({ queryKey: ['kds-orders'] });
      toast.success('收到新訂單');
    });
    socket.on('order:status_changed', () => queryClient.invalidateQueries({ queryKey: ['kds-orders'] }));
    socket.on('kitchen:call', (payload) => setLatestCall(payload.orderNumber));

    return () => {
      socket.off('order:new');
      socket.off('order:status_changed');
      socket.off('kitchen:call');
    };
  }, [queryClient]);

  const orders = ordersQuery.data || [];
  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt)),
    [orders]
  );

  return (
    <div className="page-shell min-h-screen px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="panel flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="pill">Kitchen Display System</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">廚房製作看板</h1>
          </div>
          <div className="flex items-center gap-3">
            {latestCall && <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">最新叫號：#{latestCall}</div>}
            <Link className="ghost-button" to="/pos">返回 POS</Link>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <section className="panel overflow-hidden p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">待製作 / 製作中</h2>
              <span className="pill">{sortedOrders.length} 張訂單</span>
            </div>

            {sortedOrders.length === 0 ? (
              <div className="soft-panel p-6 text-center text-slate-500">目前沒有待處理訂單。</div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {sortedOrders.map((order) => {
                  const waitMinutes = dayjs().diff(dayjs(order.createdAt), 'minute');
                  return (
                    <article key={order.id} className={`rounded-[28px] border p-5 shadow-soft ${getCardTone(waitMinutes)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="mono text-xl font-black text-slate-900">#{order.orderNumber}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatOrderType(order)}</p>
                        </div>
                        <div className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-slate-600">
                          {waitMinutes} 分鐘
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {order.items.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-white/80 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-bold text-slate-900">{item.menuItem.name}</span>
                              <span className="mono text-base font-semibold text-brand-700">x{item.quantity}</span>
                            </div>
                            {Array.isArray(item.addons) && item.addons.length > 0 && (
                              <p className="mt-2 text-xs leading-6 text-slate-500">{item.addons.map((addon) => addon.name).join('、')}</p>
                            )}
                            {item.note && <p className="mt-2 text-xs font-semibold text-amber-700">備註：{item.note}</p>}
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          className="ghost-button"
                          disabled={order.status === 'PREPARING' || statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: order.id, status: 'PREPARING' })}
                        >
                          開始製作
                        </button>
                        <button
                          type="button"
                          className="action-button"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ id: order.id, status: 'READY' })}
                        >
                          完成並叫號
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="panel p-5">
            <h2 className="section-title">KDS 提示</h2>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-500">
              <div className="soft-panel p-4">新訂單會透過 Socket 即時進來，不需要手動刷新。</div>
              <div className="soft-panel p-4">等待超過 10 分鐘會變橘色，超過 15 分鐘會變紅色，方便優先處理。</div>
              <div className="soft-panel p-4">按下「完成並叫號」後，前台叫號畫面與 POS 都會同步收到通知。</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
