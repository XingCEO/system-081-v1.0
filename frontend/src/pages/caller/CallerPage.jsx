import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { connectSocket } from '../../lib/socket';
import AutoScaleStage from '../../components/shared/AutoScaleStage';

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.25;
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
    oscillator.onended = () => {
      context.close().catch(() => {});
    };
  } catch {
    // Browsers may block autoplay before the screen is interacted with.
  }
}

export default function CallerPage() {
  const [latestCall, setLatestCall] = useState(null);
  const [history, setHistory] = useState([]);
  const soundLockedRef = useRef(true);

  const queueQuery = useQuery({
    queryKey: ['caller-queue'],
    queryFn: () => api.get('/orders/kds')
  });

  useEffect(() => {
    const socket = connectSocket('caller');
    socket.on('order:new', () => queueQuery.refetch());
    socket.on('order:status_changed', () => queueQuery.refetch());
    socket.on('kitchen:call', (payload) => {
      setLatestCall(payload.orderNumber);
      setHistory((current) => [payload.orderNumber, ...current.filter((entry) => entry !== payload.orderNumber)].slice(0, 10));
      if (!soundLockedRef.current) {
        playChime();
      }
    });

    return () => {
      socket.off('order:new');
      socket.off('order:status_changed');
      socket.off('kitchen:call');
    };
  }, [queueQuery]);

  const preparingOrders = useMemo(
    () => (queueQuery.data || []).filter((order) => order.status === 'PREPARING'),
    [queueQuery.data]
  );

  return (
    <AutoScaleStage
      designWidth={1600}
      designHeight={920}
      minScale={0.72}
      maxScale={1.08}
      shellClassName="page-shell px-4 py-4 md:px-6"
    >
      <div className="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[1fr_420px]" onPointerDown={() => { soundLockedRef.current = false; }}>
        <section className="panel p-8">
          <p className="pill text-base">叫號顯示螢幕</p>
          <h1 className="mt-5 text-5xl font-black text-slate-900 lg:text-6xl">最新叫號</h1>
          <div className="mt-10 rounded-[40px] border border-brand-100 bg-brand-50 p-12 text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.5em] text-brand-600">Now Calling</div>
            <div className="mono mt-6 text-7xl font-black text-brand-700 lg:text-8xl">
              {latestCall || '--'}
            </div>
          </div>

          <div className="mt-10">
            <h2 className="section-title">正在製作</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {preparingOrders.map((order) => (
                <div key={order.id} className="soft-panel p-5">
                  <div className="mono text-2xl font-black text-slate-900">{order.orderNumber}</div>
                  <p className="mt-2 text-sm text-slate-500">{order.type}</p>
                </div>
              ))}
              {preparingOrders.length === 0 && (
                <div className="soft-panel p-5 text-sm text-slate-500">目前沒有正在製作的訂單。</div>
              )}
            </div>
          </div>
        </section>

        <aside className="panel p-6">
          <h2 className="section-title">最近 10 筆叫號</h2>
          <div className="mt-4 space-y-3">
            {history.map((orderNumber) => (
              <div key={orderNumber} className="rounded-3xl bg-slate-50 px-5 py-4">
                <div className="mono text-3xl font-black text-slate-900">{orderNumber}</div>
              </div>
            ))}
            {history.length === 0 && (
              <div className="soft-panel p-5 text-sm text-slate-500">目前尚未收到叫號通知。</div>
            )}
          </div>
        </aside>
      </div>
    </AutoScaleStage>
  );
}
