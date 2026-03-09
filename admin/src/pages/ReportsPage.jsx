import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import api from '../lib/api';

function getAccessToken() {
  try {
    const raw = localStorage.getItem('breakfast-admin-auth');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed.state?.accessToken || '';
  } catch {
    return '';
  }
}

async function downloadReport(type, range) {
  const response = await fetch(`/api/reports/export?type=${type}&range=${range}`, {
    headers: {
      Authorization: `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    throw new Error('匯出失敗');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = type === 'excel' ? 'breakfast-report.xlsx' : 'breakfast-report.pdf';
  link.click();
  window.URL.revokeObjectURL(url);
}

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

  const exportMutation = useMutation({
    mutationFn: ({ type, range }) => downloadReport(type, range),
    onSuccess: () => toast.success('報表已下載'),
    onError: (error) => toast.error(error.message || '報表下載失敗')
  });

  const daily = dailyQuery.data;
  const monthly = monthlyQuery.data;
  const topItems = topItemsQuery.data?.items || [];
  const profit = profitQuery.data || { revenue: 0, cost: 0, grossProfit: 0, grossMargin: 0 };
  const selectedRange = `${selectedDate},${selectedDate}`;

  return (
    <div className="space-y-4">
      <section className="admin-panel p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input className="admin-field max-w-56" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          <input className="admin-field max-w-56" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
          <button type="button" className="admin-button" onClick={() => exportMutation.mutate({ type: 'excel', range: selectedRange })}>匯出 Excel</button>
          <button type="button" className="admin-ghost" onClick={() => exportMutation.mutate({ type: 'pdf', range: selectedRange })}>匯出 PDF</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">當日營業額</p>
          <h2 className="mt-3 text-3xl font-black text-slate-900">NT${daily?.summary.totalRevenue?.toFixed(0) || 0}</h2>
        </div>
        <div className="admin-soft p-5">
          <p className="text-sm text-slate-500">當日訂單數</p>
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
          <h2 className="text-xl font-bold text-slate-900">月營業額趨勢</h2>
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
