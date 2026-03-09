import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import api from '../lib/api';

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(month);

  const dailyQuery = useQuery({
    queryKey: ['admin-report-daily', selectedDate],
    queryFn: () => api.get(`/reports/daily?date=${selectedDate}`)
  });

  const monthlyQuery = useQuery({
    queryKey: ['admin-report-monthly', selectedMonth],
    queryFn: () => api.get(`/reports/monthly?month=${selectedMonth}`)
  });

  const topItemsQuery = useQuery({
    queryKey: ['admin-report-top-items', selectedDate],
    queryFn: () => api.get(`/reports/top-items?range=${selectedDate},${selectedDate}`)
  });

  const profitQuery = useQuery({
    queryKey: ['admin-report-profit', selectedDate],
    queryFn: () => api.get(`/reports/profit?range=${selectedDate},${selectedDate}`)
  });

  const daily = dailyQuery.data;
  const monthly = monthlyQuery.data;
  const topItems = topItemsQuery.data?.items || [];
  const profit = profitQuery.data || { revenue: 0, cost: 0, grossProfit: 0, grossMargin: 0 };

  return (
    <div className="space-y-4">
      <section className="admin-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input className="admin-field max-w-56" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <input className="admin-field max-w-56" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          <a className="admin-button" href={`/api/reports/export?type=excel&range=${selectedDate},${selectedDate}`} target="_blank" rel="noreferrer">匯出 Excel</a>
          <a className="admin-ghost" href={`/api/reports/export?type=pdf&range=${selectedDate},${selectedDate}`} target="_blank" rel="noreferrer">匯出 PDF</a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">當日營收</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">NT${daily?.summary.totalRevenue?.toFixed(0) || 0}</h2>
        </div>
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">當日訂單</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">{daily?.summary.totalOrders || 0}</h2>
        </div>
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">毛利</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">NT${profit.grossProfit.toFixed(0)}</h2>
        </div>
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">毛利率</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">{profit.grossMargin.toFixed(1)}%</h2>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">月營業額走勢</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly?.series || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="totalRevenue" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="admin-panel p-5">
          <h2 className="text-xl font-bold text-slate-900">高峰時段</h2>
          <div className="mt-5 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily?.peakHours || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Bar dataKey="orders" fill="#2563eb" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <article className="admin-panel p-5">
        <h2 className="text-xl font-bold text-slate-900">熱銷商品 Top 10</h2>
        <div className="mt-5 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topItems} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis type="category" dataKey="name" width={110} stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="quantity" fill="#2563eb" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
