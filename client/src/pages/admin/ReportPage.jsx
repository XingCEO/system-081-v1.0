// 營業報表頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function ReportPage() {
  const [salesData, setSalesData] = useState(null);
  const [itemsData, setItemsData] = useState([]);
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD')
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sales');

  useEffect(() => { loadReports(); }, [dateRange]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const [salesRes, itemsRes] = await Promise.all([
        api.get('/reports/sales', { params: dateRange }),
        api.get('/reports/items', { params: dateRange })
      ]);
      setSalesData(salesRes.data);
      setItemsData(itemsRes.data);
    } catch { toast.error('載入報表失敗'); }
    finally { setIsLoading(false); }
  };

  const handleDailyClose = async () => {
    if (!confirm('確定要執行日結？此操作無法撤銷。')) return;
    try {
      await api.post('/reports/daily-close');
      toast.success('日結完成！');
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">營業報表</h1>
        <button onClick={handleDailyClose} className="pos-btn-danger text-sm">執行日結</button>
      </div>

      {/* 日期範圍 */}
      <div className="flex gap-3 mb-6 items-center">
        <input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} className="pos-input w-auto" />
        <span className="text-pos-muted">至</span>
        <input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} className="pos-input w-auto" />
        <div className="flex gap-2 ml-4">
          {[
            { label: '今日', start: dayjs().format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD') },
            { label: '本週', start: dayjs().startOf('week').format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD') },
            { label: '本月', start: dayjs().startOf('month').format('YYYY-MM-DD'), end: dayjs().format('YYYY-MM-DD') },
          ].map(q => (
            <button key={q.label} onClick={() => setDateRange({ startDate: q.start, endDate: q.end })}
              className="px-3 py-1.5 text-xs bg-pos-accent/30 rounded-lg text-pos-muted hover:text-pos-text">{q.label}</button>
          ))}
        </div>
      </div>

      {/* 標籤 */}
      <div className="flex gap-4 mb-6 border-b border-pos-accent/30">
        {[{ key: 'sales', label: '營業統計' }, { key: 'items', label: '品項銷售' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'text-primary-400 border-b-2 border-primary-400' : 'text-pos-muted'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-pos-muted py-12">載入中...</div>
      ) : activeTab === 'sales' && salesData ? (
        <>
          {/* 摘要卡片 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="pos-card p-5">
              <div className="text-sm text-pos-muted">總訂單數</div>
              <div className="text-3xl font-bold text-primary-400 mt-1">{salesData.summary.totalOrders}</div>
            </div>
            <div className="pos-card p-5">
              <div className="text-sm text-pos-muted">總營收</div>
              <div className="text-3xl font-bold text-pos-success mt-1">${Math.round(salesData.summary.totalRevenue).toLocaleString()}</div>
            </div>
            <div className="pos-card p-5">
              <div className="text-sm text-pos-muted">總折扣</div>
              <div className="text-3xl font-bold text-pos-highlight mt-1">${Math.round(salesData.summary.totalDiscount).toLocaleString()}</div>
            </div>
            <div className="pos-card p-5">
              <div className="text-sm text-pos-muted">平均客單價</div>
              <div className="text-3xl font-bold text-pos-warning mt-1">${Math.round(salesData.summary.avgOrderAmount)}</div>
            </div>
          </div>

          {/* 每日營收表 */}
          <div className="pos-card overflow-hidden">
            <div className="px-5 py-3 border-b border-pos-accent/30"><h3 className="font-bold">每日營收</h3></div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-pos-accent/30 text-sm text-pos-muted">
                  <th className="text-left p-3">日期</th>
                  <th className="text-right p-3">訂單數</th>
                  <th className="text-right p-3">營收</th>
                  <th className="text-right p-3">折扣</th>
                </tr>
              </thead>
              <tbody>
                {salesData.salesByDate.map(day => (
                  <tr key={day.date} className="border-b border-pos-accent/10">
                    <td className="p-3">{day.date}</td>
                    <td className="p-3 text-right">{day.orders}</td>
                    <td className="p-3 text-right font-medium">${Math.round(day.revenue).toLocaleString()}</td>
                    <td className="p-3 text-right text-pos-muted">${Math.round(day.discount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 付款方式統計 */}
          {salesData.byPayment && Object.keys(salesData.byPayment).length > 0 && (
            <div className="pos-card mt-6 overflow-hidden">
              <div className="px-5 py-3 border-b border-pos-accent/30"><h3 className="font-bold">付款方式統計</h3></div>
              <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(salesData.byPayment).map(([method, data]) => (
                  <div key={method} className="bg-pos-bg/50 rounded-xl p-4">
                    <div className="text-sm text-pos-muted">{method === 'cash' ? '💵 現金' : method === 'card' ? '💳 刷卡' : method}</div>
                    <div className="text-xl font-bold mt-1">${Math.round(data.amount).toLocaleString()}</div>
                    <div className="text-xs text-pos-muted">{data.count} 筆</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : activeTab === 'items' ? (
        <div className="pos-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-pos-accent/30 text-sm text-pos-muted">
                <th className="text-left p-3">排名</th>
                <th className="text-left p-3">品名</th>
                <th className="text-right p-3">數量</th>
                <th className="text-right p-3">營收</th>
              </tr>
            </thead>
            <tbody>
              {itemsData.map((item, i) => (
                <tr key={i} className="border-b border-pos-accent/10">
                  <td className="p-3">
                    <span className={`w-7 h-7 inline-flex items-center justify-center rounded-full text-sm font-bold ${i < 3 ? 'bg-pos-warning text-gray-900' : 'bg-pos-accent/30 text-pos-muted'}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3 text-right">{item._sum.quantity}</td>
                  <td className="p-3 text-right font-medium">${Math.round(item._sum.totalPrice).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {itemsData.length === 0 && <div className="text-center text-pos-muted py-8">此期間沒有銷售資料</div>}
        </div>
      ) : null}
    </div>
  );
}