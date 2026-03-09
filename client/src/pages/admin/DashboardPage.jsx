// 後台儀表板
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 30000); // 每 30 秒刷新
    return () => clearInterval(timer);
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get('/reports/dashboard');
      setData(res.data);
    } catch (err) {
      toast.error('載入儀表板失敗');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-pos-muted">載入中...</div>;
  }

  if (!data) return null;

  const stats = [
    { label: '今日訂單', value: data.todayOrders, icon: '🧾', color: 'text-primary-400' },
    { label: '今日營收', value: `$${Math.round(data.todayRevenue).toLocaleString()}`, icon: '💰', color: 'text-pos-success' },
    { label: '待處理', value: data.pendingOrders, icon: '⏳', color: 'text-pos-warning' },
    { label: '製作中', value: data.preparingOrders, icon: '🔥', color: 'text-pos-highlight' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">儀表板</h1>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="pos-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-pos-muted">{stat.label}</div>
                <div className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 近期訂單 */}
        <div className="pos-card p-5">
          <h2 className="text-lg font-bold mb-4">近期訂單</h2>
          <div className="space-y-2">
            {data.recentOrders?.slice(0, 8).map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-pos-accent/20 last:border-0">
                <div>
                  <span className="font-bold">{order.orderNumber}</span>
                  <span className="text-xs text-pos-muted ml-2">
                    {order.type === 'dine_in' ? '內用' : '外帶'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'completed' ? 'bg-pos-success/20 text-pos-success' :
                    order.status === 'preparing' ? 'bg-primary-500/20 text-primary-400' :
                    order.status === 'ready' ? 'bg-pos-warning/20 text-pos-warning' :
                    'bg-pos-accent/20 text-pos-muted'
                  }`}>
                    {order.status === 'pending' ? '待處理' :
                     order.status === 'preparing' ? '製作中' :
                     order.status === 'ready' ? '待取餐' :
                     order.status === 'completed' ? '已完成' :
                     order.status === 'cancelled' ? '已取消' : order.status}
                  </span>
                  <span className="font-medium">${order.totalAmount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 熱銷品項 */}
        <div className="pos-card p-5">
          <h2 className="text-lg font-bold mb-4">今日熱銷</h2>
          <div className="space-y-2">
            {data.topItems?.slice(0, 8).map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-pos-accent/20 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index < 3 ? 'bg-pos-warning text-gray-900' : 'bg-pos-accent/30 text-pos-muted'
                  }`}>
                    {index + 1}
                  </span>
                  <span>{item.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-pos-muted">{item._sum.quantity} 份</span>
                  <span className="font-medium">${Math.round(item._sum.totalPrice)}</span>
                </div>
              </div>
            ))}
            {(!data.topItems || data.topItems.length === 0) && (
              <div className="text-center text-pos-muted py-4">今日尚無銷售資料</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
