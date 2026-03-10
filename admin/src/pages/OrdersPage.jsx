import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Dialog from '../components/Dialog';
import api from '../lib/api';

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

function formatOrderStatus(status) {
  const statusMap = {
    PENDING: '待處理',
    PREPARING: '製作中',
    READY: '待取餐',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  };

  return statusMap[status] || status;
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
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
      toast.success('電話訂單建立完成');
      setPhoneOrder({ menuItemId: '', quantity: 1, note: '', memberPhone: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-orders'] });
    },
    onError: (error) => toast.error(error.message || '電話訂單建立失敗')
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('訂單狀態已更新');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error) => toast.error(error.message || '更新訂單狀態失敗')
  });

  const printMutation = useMutation({
    mutationFn: (id) => api.post(`/orders/${id}/print`),
    onSuccess: () => toast.success('補印指令已送出'),
    onError: (error) => toast.error(error.message || '補印失敗')
  });

  const deliveryStatusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/delivery/orders/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('外送單狀態已更新');
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-orders'] });
    },
    onError: (error) => toast.error(error.message || '更新外送單狀態失敗')
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
              <option value="CANCELLED">已取消</option>
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
              <button
                key={order.id}
                type="button"
                className="w-full rounded-2xl bg-slate-50 p-4 text-left transition hover:bg-brand-50"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{order.orderNumber}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {formatOrderType(order.type)} / {formatOrderStatus(order.status)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-brand-700">{formatCurrency(order.total)}</div>
                    <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('zh-TW')}</div>
                  </div>
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-500">
                  {order.items.map((item) => `${item.menuItem.name} x${item.quantity}`).join('、')}
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">手動新增電話訂單</h2>
          <div className="mt-4 grid gap-3">
            <select
              className="admin-field"
              value={phoneOrder.menuItemId}
              onChange={(event) => setPhoneOrder((current) => ({ ...current, menuItemId: event.target.value }))}
            >
              <option value="">請選擇商品</option>
              {menuItems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <input
              className="admin-field"
              type="number"
              min="1"
              value={phoneOrder.quantity}
              onChange={(event) => setPhoneOrder((current) => ({ ...current, quantity: event.target.value }))}
            />
            <input
              className="admin-field"
              placeholder="會員手機，可留空"
              value={phoneOrder.memberPhone}
              onChange={(event) => setPhoneOrder((current) => ({ ...current, memberPhone: event.target.value }))}
            />
            <textarea
              className="admin-field min-h-24 resize-none"
              placeholder="訂單備註"
              value={phoneOrder.note}
              onChange={(event) => setPhoneOrder((current) => ({ ...current, note: event.target.value }))}
            />
            <button
              type="button"
              className="admin-button"
              onClick={() => phoneOrderMutation.mutate({
                memberPhone: phoneOrder.memberPhone || undefined,
                note: phoneOrder.note || undefined,
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900">{deliveryOrder.platform} / {deliveryOrder.order.orderNumber}</div>
                  <div className="mt-1 text-sm text-slate-500">{deliveryOrder.deliveryAddress || '未提供地址'}</div>
                </div>
                <select
                  className="admin-field max-w-52"
                  value={deliveryOrder.status}
                  onChange={(event) => deliveryStatusMutation.mutate({ id: deliveryOrder.id, status: event.target.value })}
                >
                  <option value="RECEIVED">RECEIVED</option>
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY">READY</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>
          ))}
          {deliveryOrders.length === 0 && (
            <div className="admin-soft p-4 text-sm text-slate-500">目前沒有外送平台訂單。</div>
          )}
        </div>
      </article>

      {selectedOrder && (
        <Dialog title={`訂單詳情 ${selectedOrder.orderNumber}`} onClose={() => setSelectedOrder(null)} wide>
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-4">
              <div className="admin-soft p-4">
                <div className="text-sm text-slate-500">訂單資訊</div>
                <div className="mt-2 space-y-2 text-sm leading-7 text-slate-700">
                  <div>類型：{formatOrderType(selectedOrder.type)}</div>
                  <div>狀態：{formatOrderStatus(selectedOrder.status)}</div>
                  <div>金額：{formatCurrency(selectedOrder.total)}</div>
                  <div>付款方式：{selectedOrder.paymentMethod || '未設定'}</div>
                  <div>桌號：{selectedOrder.table?.number || '-'}</div>
                  <div>會員：{selectedOrder.member?.name || '非會員'}</div>
                  <div>備註：{selectedOrder.note || '-'}</div>
                </div>
              </div>

              <div className="grid gap-3">
                {['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="admin-ghost"
                    onClick={() => statusMutation.mutate({ id: selectedOrder.id, status })}
                  >
                    變更為 {formatOrderStatus(status)}
                  </button>
                ))}
                <button type="button" className="admin-button" onClick={() => printMutation.mutate(selectedOrder.id)}>
                  補印訂單
                </button>
              </div>
            </section>

            <section className="admin-soft p-4">
              <h3 className="font-bold text-slate-900">餐點明細</h3>
              <div className="mt-4 space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{item.menuItem.name}</div>
                      <div className="text-sm text-slate-500">x{item.quantity}</div>
                    </div>
                    {Array.isArray(item.addons) && item.addons.length > 0 && (
                      <div className="mt-2 text-sm text-slate-500">
                        {item.addons.map((addon) => addon.groupName ? `${addon.groupName}：${addon.name}` : addon.name).join('、')}
                      </div>
                    )}
                    {item.note && <div className="mt-2 text-sm font-semibold text-amber-700">備註：{item.note}</div>}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Dialog>
      )}
    </div>
  );
}
