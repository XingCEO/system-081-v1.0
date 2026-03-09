// 訂單管理頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const statusMap = {
  pending: { label: '待處理', color: 'bg-pos-accent/20 text-pos-muted' },
  preparing: { label: '製作中', color: 'bg-primary-500/20 text-primary-400' },
  ready: { label: '待取餐', color: 'bg-pos-warning/20 text-pos-warning' },
  completed: { label: '已完成', color: 'bg-pos-success/20 text-pos-success' },
  cancelled: { label: '已取消', color: 'bg-pos-highlight/20 text-pos-highlight' },
};

export default function OrderManagePage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filter, setFilter] = useState({ status: '', type: '', date: dayjs().format('YYYY-MM-DD') });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => { loadOrders(); }, [filter]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const params = { ...filter, page: pagination.page, limit: 30 };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await api.get('/orders', { params });
      setOrders(res.data);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      toast.error('載入訂單失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      toast.success('狀態已更新');
      loadOrders();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">訂單管理</h1>

      {/* 篩選列 */}
      <div className="flex gap-3 mb-4">
        <input type="date" value={filter.date}
          onChange={e => setFilter({...filter, date: e.target.value})}
          className="pos-input w-auto" />
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="pos-input w-auto">
          <option value="">全部狀態</option>
          {Object.entries(statusMap).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})} className="pos-input w-auto">
          <option value="">全部類型</option>
          <option value="dine_in">內用</option>
          <option value="takeout">外帶</option>
          <option value="delivery">外送</option>
        </select>
        <button onClick={loadOrders} className="pos-btn-primary text-sm">重新整理</button>
      </div>

      {/* 訂單列表 */}
      <div className="pos-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-accent/30 text-sm text-pos-muted">
              <th className="text-left p-3">訂單編號</th>
              <th className="text-left p-3">類型</th>
              <th className="text-left p-3">來源</th>
              <th className="text-left p-3">品項</th>
              <th className="text-right p-3">金額</th>
              <th className="text-center p-3">付款</th>
              <th className="text-center p-3">狀態</th>
              <th className="text-left p-3">時間</th>
              <th className="text-center p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b border-pos-accent/10 hover:bg-pos-accent/10 cursor-pointer"
                  onClick={() => setSelectedOrder(order)}>
                <td className="p-3 font-bold">{order.orderNumber}</td>
                <td className="p-3 text-sm">
                  {order.type === 'dine_in' ? '🪑 內用' : order.type === 'takeout' ? '🥡 外帶' : '🛵 外送'}
                  {order.tableNumber && ` (${order.tableNumber})`}
                </td>
                <td className="p-3 text-sm text-pos-muted">{order.source}</td>
                <td className="p-3 text-sm text-pos-muted">
                  {order.items?.map(i => `${i.name}×${i.quantity}`).join(', ').slice(0, 30)}
                  {order.items?.map(i => `${i.name}×${i.quantity}`).join(', ').length > 30 ? '...' : ''}
                </td>
                <td className="p-3 text-right font-medium">${order.totalAmount}</td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.paymentStatus === 'paid' ? 'bg-pos-success/20 text-pos-success' : 'bg-pos-accent/20 text-pos-muted'
                  }`}>
                    {order.paymentStatus === 'paid' ? '已付' : '未付'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusMap[order.status]?.color || ''}`}>
                    {statusMap[order.status]?.label || order.status}
                  </span>
                </td>
                <td className="p-3 text-sm text-pos-muted">{dayjs(order.createdAt).format('HH:mm')}</td>
                <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                  {order.status === 'pending' && (
                    <button onClick={() => handleStatusChange(order.id, 'preparing')}
                      className="text-xs text-primary-400 hover:text-primary-300">開始製作</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => handleStatusChange(order.id, 'ready')}
                      className="text-xs text-pos-warning hover:text-pos-warning/80">完成製作</button>
                  )}
                  {order.status === 'ready' && (
                    <button onClick={() => handleStatusChange(order.id, 'completed')}
                      className="text-xs text-pos-success hover:text-pos-success/80">完成取餐</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="text-center text-pos-muted py-8">
            {isLoading ? '載入中...' : '沒有訂單'}
          </div>
        )}
      </div>

      {/* 訂單詳情彈窗 */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setSelectedOrder(null)}>
          <div className="bg-pos-card w-[500px] max-h-[80vh] rounded-2xl shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-pos-accent/30 flex justify-between">
              <h2 className="text-xl font-bold">訂單 {selectedOrder.orderNumber}</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-2xl text-pos-muted">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-pos-muted">類型：</span>{selectedOrder.type === 'dine_in' ? '內用' : '外帶'}</div>
                <div><span className="text-pos-muted">桌號：</span>{selectedOrder.tableNumber || '-'}</div>
                <div><span className="text-pos-muted">來源：</span>{selectedOrder.source}</div>
                <div><span className="text-pos-muted">建立者：</span>{selectedOrder.createdBy?.name || '-'}</div>
                <div><span className="text-pos-muted">時間：</span>{dayjs(selectedOrder.createdAt).format('YYYY-MM-DD HH:mm')}</div>
                <div><span className="text-pos-muted">付款：</span>{selectedOrder.paymentMethod || '-'}</div>
              </div>
              <div className="border-t border-pos-accent/20 pt-3">
                <h3 className="font-bold mb-2">品項</h3>
                {selectedOrder.items?.map(item => (
                  <div key={item.id} className="flex justify-between py-1 text-sm">
                    <span>{item.name} ×{item.quantity}</span>
                    <span>${item.totalPrice}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-pos-accent/20 pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>小計</span><span>${selectedOrder.subtotal}</span></div>
                <div className="flex justify-between"><span>稅額</span><span>${selectedOrder.taxAmount}</span></div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-pos-highlight"><span>折扣</span><span>-${selectedOrder.discountAmount}</span></div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-pos-accent/20">
                  <span>合計</span><span className="text-primary-400">${selectedOrder.totalAmount}</span>
                </div>
              </div>
              {selectedOrder.note && (
                <div className="text-sm bg-pos-warning/10 p-3 rounded-xl text-pos-warning">📝 {selectedOrder.note}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
