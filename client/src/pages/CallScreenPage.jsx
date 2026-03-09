// 叫號屏頁面
import { useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../lib/socket';
import dayjs from 'dayjs';

export default function CallScreenPage() {
  const [readyOrders, setReadyOrders] = useState([]);
  const [calledNumber, setCalledNumber] = useState(null);
  const [currentTime, setCurrentTime] = useState(dayjs().format('HH:mm:ss'));
  const audioRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket('call');

    socket.on('order-ready', (order) => {
      setReadyOrders(prev => {
        const exists = prev.find(o => o.id === order.id);
        if (exists) return prev;
        return [order, ...prev].slice(0, 20);
      });

      // 叫號動畫
      setCalledNumber(order.callNumber || order.orderNumber);
      playCallSound();

      setTimeout(() => setCalledNumber(null), 10000);
    });

    socket.on('call-number', (data) => {
      setCalledNumber(data.callNumber);
      playCallSound();
      setTimeout(() => setCalledNumber(null), 10000);
    });

    // 更新時鐘
    const timer = setInterval(() => {
      setCurrentTime(dayjs().format('HH:mm:ss'));
    }, 1000);

    return () => {
      disconnectSocket('call');
      clearInterval(timer);
    };
  }, []);

  const playCallSound = () => {
    try {
      const ctx = new AudioContext();
      // 叮咚聲
      const playTone = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.value = 0.4;
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      playTone(880, ctx.currentTime, 0.2);
      playTone(1100, ctx.currentTime + 0.25, 0.3);
    } catch {}
  };

  // 移除已取餐的訂單
  const dismissOrder = (orderId) => {
    setReadyOrders(prev => prev.filter(o => o.id !== orderId));
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-pos-bg to-[#0a0a1e] overflow-hidden">
      {/* 頂部 */}
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🍽️</span>
          <div>
            <h1 className="text-2xl font-bold">081 餐飲</h1>
            <p className="text-sm text-pos-muted">取餐叫號</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-pos-muted">{currentTime}</div>
      </header>

      {/* 主要顯示區 */}
      <div className="flex-1 flex">
        {/* 左側 - 大字叫號 */}
        <div className="flex-1 flex items-center justify-center">
          {calledNumber ? (
            <div className="call-pulse text-center">
              <div className="text-pos-muted text-2xl mb-4">請取餐</div>
              <div className="text-[180px] font-black text-primary-400 leading-none">
                {calledNumber}
              </div>
              <div className="mt-6 text-xl text-pos-success">餐點準備好了！</div>
            </div>
          ) : (
            <div className="text-center text-pos-muted">
              <div className="text-8xl mb-4">📢</div>
              <div className="text-2xl">等待叫號中...</div>
            </div>
          )}
        </div>

        {/* 右側 - 等待列表 */}
        <div className="w-[350px] bg-pos-card/50 border-l border-pos-accent/20 p-6">
          <h2 className="text-lg font-bold mb-4 text-pos-muted">待取餐</h2>
          <div className="space-y-3">
            {readyOrders.length === 0 ? (
              <div className="text-center text-pos-muted py-8">
                目前沒有待取餐的訂單
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => dismissOrder(order.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:opacity-70 ${
                    order.orderNumber === calledNumber || order.callNumber === calledNumber
                      ? 'bg-primary-600/30 border-2 border-primary-400 call-pulse'
                      : 'bg-pos-accent/20 border border-pos-accent/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">
                      {order.callNumber || order.orderNumber}
                    </span>
                    <span className="text-sm text-pos-muted">
                      {order.type === 'dine_in' ? '內用' : '外帶'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 底部跑馬燈 */}
      <div className="bg-pos-card/50 border-t border-pos-accent/20 py-3 px-8">
        <div className="overflow-hidden">
          <div className="animate-marquee whitespace-nowrap text-pos-muted">
            歡迎光臨 081 餐飲 ✨ 請憑號碼取餐 ✨ Wi-Fi 密碼：081-guest ✨ 營業時間 10:00-22:00 ✨
          </div>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
