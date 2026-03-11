import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../lib/api';

function MetricCard({ label, value, hint }) {
  return (
    <article className="admin-soft p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-900">{value}</h3>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}

export default function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/reports/dashboard')
  });

  const dashboard = dashboardQuery.data || {
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    hourlyOrders: [],
    lowStockItems: []
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4" data-testid="admin-dashboard-loading">
        <section className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((card) => (
            <article key={card} className="admin-soft p-5">
              <div className="h-4 w-28 rounded-full bg-slate-100" />
              <div className="mt-4 h-10 w-24 rounded-2xl bg-slate-100" />
              <div className="mt-3 h-4 w-40 rounded-full bg-slate-100" />
            </article>
          ))}
        </section>
        <article className="admin-panel p-5">
          <div className="h-6 w-48 rounded-full bg-slate-100" />
          <div className="mt-6 h-80 rounded-[24px] bg-slate-50" />
        </article>
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <article className="admin-panel border border-red-100 bg-red-50 p-6 text-red-600" data-testid="admin-dashboard-error">
        後台儀表板資料載入失敗，請重新整理或檢查後端服務。
      </article>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-dashboard">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="今日訂單數" value={dashboard.totalOrders} hint="今天累計建立的訂單筆數" />
        <MetricCard label="今日營業額" value={`NT$${dashboard.totalRevenue.toFixed(0)}`} hint="已排除取消訂單後的營收" />
        <MetricCard label="平均客單價" value={`NT$${dashboard.averageOrderValue.toFixed(0)}`} hint="今日訂單平均金額" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">今日每小時訂單量</h2>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboard.hourlyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">低庫存警示</h2>
          <div className="mt-5 space-y-3">
            {dashboard.lowStockItems.map((item) => (
              <div key={item.id} className="rounded-2xl bg-amber-50 px-4 py-3">
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="mt-1 text-sm text-amber-700">目前庫存 {item.stock} / 警戒值 {item.stockAlert}</div>
              </div>
            ))}
            {dashboard.lowStockItems.length === 0 && (
              <div className="admin-soft p-4 text-sm text-slate-500">目前沒有低於警戒值的商品。</div>
            )}
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">今日每小時營業額</h2>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard.hourlyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="revenue" fill="#2563eb" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
