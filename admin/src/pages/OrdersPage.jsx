import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [phoneOrder, setPhoneOrder] = useState({ menuItemId: '', quantity: 1, note: '', memberPhone: '' });

  const ordersQuery = useQuery({
    queryKey: ['admin-orders', filters],
    queryFn: () => api.get(`/orders?status=${filters.status}&type=${filters.type}`)
  });

  const menuItemsQuery = useQuery({
    queryKey: ['admin-order-menu'],
    queryFn: () => api.get('/menu/availability')
  });

  const deliveryOrdersQuery = useQuery({
    queryKey: ['admin-delivery-orders'],
    queryFn: () => api.get('/delivery/orders')
  });

  const phoneOrderMutation = useMutation({
    mutationFn: (payload) => api.post('/orders/phone', payload),
    onSuccess: () => {
      toast.success('電話訂單建立成功');
      setPhoneOrder({ menuItemId: '', quantity: 1, note: '', memberPhone: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-orders'] });
    }
  });

  const orders = ordersQuery.data || [];
  const menuItems = menuItemsQuery.data?.items || [];
  const deliveryOrders = deliveryOrdersQuery.data || [];

  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="admin-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <select className="admin-field max-w-52" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">全部狀態</option>
              <option value="PENDING">待處理</option>
              <option value="PREPARING">製作中</option>
              <option value="READY">待取餐</option>
              <option value="COMPLETED">已完成</option>
            </select>
            <select className="admin-field max-w-52" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="">全部類型</option>
              <option value="DINE_IN">內用</option>
              <option value="TAKEOUT">外帶</option>
              <option value="DELIVERY">外送</option>
              <option value="PHONE">電話</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{order.orderNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">{order.type} / {order.status}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-brand-700">NT${order.total}</div>
                    <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('zh-TW')}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-500">
                  {order.items.map((item) => `${item.menuItem.name} x${item.quantity}`).join('、')}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">新增電話訂單</h2>
          <div className="mt-4 grid gap-3">
            <select className="admin-field" value={phoneOrder.menuItemId} onChange={(event) => setPhoneOrder((current) => ({ ...current, menuItemId: event.target.value }))}>
              <option value="">選擇品項</option>
              {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className="admin-field" type="number" min="1" value={phoneOrder.quantity} onChange={(event) => setPhoneOrder((current) => ({ ...current, quantity: event.target.value }))} />
            <input className="admin-field" placeholder="會員或來電電話" value={phoneOrder.memberPhone} onChange={(event) => setPhoneOrder((current) => ({ ...current, memberPhone: event.target.value }))} />
            <textarea className="admin-field min-h-24 resize-none" placeholder="備註" value={phoneOrder.note} onChange={(event) => setPhoneOrder((current) => ({ ...current, note: event.target.value }))} />
            <button
              type="button"
              className="admin-button"
              onClick={() => phoneOrderMutation.mutate({
                memberPhone: phoneOrder.memberPhone,
                note: phoneOrder.note,
                items: [
                  {
                    menuItemId: Number(phoneOrder.menuItemId),
                    quantity: Number(phoneOrder.quantity)
                  }
                ]
              })}
            >
              建立電話訂單
            </button>
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">外送平台訂單</h2>
        <div className="mt-5 space-y-3">
          {deliveryOrders.map((deliveryOrder) => (
            <div key={deliveryOrder.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{deliveryOrder.platform} / {deliveryOrder.order.orderNumber}</div>
                  <div className="mt-1 text-sm text-slate-500">{deliveryOrder.deliveryAddress || '未提供地址'}</div>
                </div>
                <div className="text-sm font-semibold text-brand-700">{deliveryOrder.status}</div>
              </div>
            </div>
          ))}
          {deliveryOrders.length === 0 && (
            <div className="admin-soft p-4 text-sm text-slate-500">尚未接收到外送平台訂單。</div>
          )}
        </div>
      </article>
    </div>
  );
}
