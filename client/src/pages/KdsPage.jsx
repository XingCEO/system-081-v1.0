// KDS 廚房顯示系統
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket } from '../lib/socket';
import api from '../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function KdsPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();

    const socket = connectSocket('kds');
    socket.on('new-order', (order) => {
      setOrders(prev => [...prev, order]);
      // 播放提示音
      playNotificationSound();
      toast('新訂單！', { icon: '🔔' });
    });
    socket.on('order-updated', (order) => {
      setOrders(prev => prev.map(o => o.id === order.id ? order : o));
    });
    socket.on('order-bumped', (order) => {
      setOrders(prev => prev.filter(o => o.id !== order.id));
    });
    socket.on('item-updated', (item) => {
      setOrders(prev => prev.map(o => {
        if (o.id === item.orderId) {
          return { ...o, items: o.items.map(i => i.id === item.id ? item : i) };
        }
        return o;
      }));
    });

    return () => disconnectSocket('kds');
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get('/kds/orders');
      setOrders(res.data);
    } catch (err) {
      toast.error('載入訂單失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const playNotificationSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  // 更新品項狀態
  const handleItemStatus = async (itemId, status) => {
    try {
      await api.put(`/kds/items/${itemId}/status`, { status });
    } catch (err) {
      toast.error('更新失敗');
    }
  };

  // 一鍵完成訂單
  const handleBump = async (orderId) => {
    try {
      await api.post(`/kds/orders/${orderId}/bump`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast.success('訂單已完成！');
    } catch (err) {
      toast.error('操作失敗');
    }
  };

  // 計算等待時間
  const getWaitTime = (createdAt) => {
    const minutes = dayjs().diff(dayjs(createdAt), 'minute');
    return minutes;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-pos-bg">
        <div className="text-pos-muted text-xl">載入中...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-pos-bg">
      {/* 頂部列 */}
      <header className="flex items-center justify-between px-6 py-3 bg-pos-card border-b border-pos-accent/30">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <h1 className="text-xl font-bold">廚房顯示系統 (KDS)</h1>
          <span className="text-sm bg-primary-600/20 text-primary-400 px-3 py-1 rounded-full">
            {orders.length} 張待處理
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadOrders} className="px-4 py-2 bg-pos-accent/50 rounded-lg text-sm hover:bg-pos-accent">
            重新整理
          </button>
          <button onClick={() => navigate('/pos')} className="px-4 py-2 bg-pos-accent/50 rounded-lg text-sm hover:bg-pos-accent">
            返回 POS
          </button>
        </div>
      </header>

      {/* 訂單卡片 */}
      <div className="flex-1 overflow-x-auto p-4">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-pos-muted">
            <span className="text-6xl mb-4">✨</span>
            <span className="text-xl">目前沒有待處理訂單</span>
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {orders.map((order) => {
              const waitTime = getWaitTime(order.createdAt);
              const isUrgent = waitTime > 15;
              const isWarning = waitTime > 10;

              return (
                <div
                  key={order.id}
                  className={`w-[300px] flex-shrink-0 flex flex-col rounded-2xl border-2 overflow-hidden ${
                    isUrgent ? 'border-pos-highlight bg-pos-highlight/5' :
                    isWarning ? 'border-pos-warning bg-pos-warning/5' :
                    'border-pos-accent/30 bg-pos-card'
                  }`}
                >
                  {/* 訂單標題 */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    isUrgent ? 'bg-pos-highlight/20' :
                    isWarning ? 'bg-pos-warning/20' :
                    'bg-pos-accent/20'
                  }`}>
                    <div>
                      <span className="text-xl font-bold">{order.orderNumber}</span>
                      <span className="ml-2 text-sm text-pos-muted">
                        {order.type === 'dine_in' ? '內用' : order.type === 'takeout' ? '外帶' : '外送'}
                        {order.tableNumber && ` · ${order.tableNumber}`}
                      </span>
                    </div>
                    <div className={`text-sm font-bold ${
                      isUrgent ? 'text-pos-highlight' :
                      isWarning ? 'text-pos-warning' :
                      'text-pos-muted'
                    }`}>
                      {waitTime}分鐘
                    </div>
                  </div>

                  {/* 品項列表 */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {order.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          const nextStatus =
                            item.status === 'pending' ? 'preparing' :
                            item.status === 'preparing' ? 'ready' : null;
                          if (nextStatus) handleItemStatus(item.id, nextStatus);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all ${
                          item.status === 'ready' ? 'bg-pos-success/20 line-through opacity-50' :
                          item.status === 'preparing' ? 'bg-primary-600/20' :
                          'bg-pos-bg/50 hover:bg-pos-accent/30'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">
                            {item.status === 'ready' ? '✅' : item.status === 'preparing' ? '🔥' : '⏳'}{' '}
                            {item.name}
                          </span>
                          <span className="text-lg font-bold">×{item.quantity}</span>
                        </div>
                        {item.options && item.options !== '[]' && (
                          <div className="text-xs text-pos-muted mt-1">
                            {JSON.parse(item.options).map(o => o.name).join(', ')}
                          </div>
                        )}
                        {item.note && (
                          <div className="text-xs text-pos-warning mt-1">⚠️ {item.note}</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 完成按鈕 */}
                  <div className="p-3 border-t border-pos-accent/20">
                    {order.note && (
                      <div className="text-xs text-pos-warning mb-2 p-2 bg-pos-warning/10 rounded-lg">
                        📝 {order.note}
                      </div>
                    )}
                    <button
                      onClick={() => handleBump(order.id)}
                      className="w-full py-3 rounded-xl bg-pos-success hover:brightness-110
                                 text-white font-bold text-lg active:scale-95 transition-all"
                    >
                      完成出餐
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
