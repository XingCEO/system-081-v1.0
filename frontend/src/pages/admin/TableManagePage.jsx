// 桌位管理頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const statusColors = {
  available: 'bg-pos-success/20 border-pos-success text-pos-success',
  occupied: 'bg-pos-highlight/20 border-pos-highlight text-pos-highlight',
  reserved: 'bg-pos-warning/20 border-pos-warning text-pos-warning',
  cleaning: 'bg-primary-500/20 border-primary-500 text-primary-400',
};

const statusLabels = {
  available: '空桌', occupied: '使用中', reserved: '已預約', cleaning: '清潔中'
};

export default function TableManagePage() {
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ number: '', name: '', capacity: 4, zone: 'A區' });

  useEffect(() => { loadTables(); }, []);

  const loadTables = async () => {
    try {
      const res = await api.get('/tables', { params: { all: true } });
      setTables(res.data);
    } catch { toast.error('載入失敗'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    try {
      await api.post('/tables', form);
      toast.success('桌位已新增');
      setShowForm(false);
      setForm({ number: '', name: '', capacity: 4, zone: 'A區' });
      loadTables();
    } catch (err) { toast.error(err.message); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/tables/${id}/status`, { status });
      loadTables();
    } catch (err) { toast.error(err.message); }
  };

  const zones = [...new Set(tables.map(t => t.zone))];

  if (isLoading) return <div className="flex items-center justify-center h-full text-pos-muted">載入中...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">桌位管理</h1>
        <button onClick={() => setShowForm(true)} className="pos-btn-primary text-sm">+ 新增桌位</button>
      </div>

      {/* 狀態圖例 */}
      <div className="flex gap-4 mb-6">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="flex items-center gap-2 text-sm">
            <div className={`w-4 h-4 rounded border-2 ${statusColors[key]}`}></div>
            <span className="text-pos-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* 依區域顯示 */}
      {zones.map(zone => (
        <div key={zone} className="mb-8">
          <h2 className="text-lg font-bold mb-3">{zone}</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {tables.filter(t => t.zone === zone).map(table => (
              <div key={table.id}
                className={`pos-card p-4 text-center border-2 cursor-pointer transition-all hover:scale-105 ${statusColors[table.status] || ''}`}>
                <div className="text-2xl font-bold">{table.number}</div>
                <div className="text-xs text-pos-muted mt-1">{table.capacity} 人座</div>
                <div className="text-xs mt-2 font-medium">{statusLabels[table.status]}</div>
                <div className="flex gap-1 mt-2 justify-center">
                  {table.status !== 'available' && (
                    <button onClick={() => handleStatusChange(table.id, 'available')}
                      className="text-xs px-2 py-0.5 rounded bg-pos-success/20 text-pos-success">空桌</button>
                  )}
                  {table.status === 'available' && (
                    <button onClick={() => handleStatusChange(table.id, 'occupied')}
                      className="text-xs px-2 py-0.5 rounded bg-pos-highlight/20 text-pos-highlight">入座</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* 新增桌位彈窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowForm(false)}>
          <div className="bg-pos-card w-[400px] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-pos-accent/30">
              <h2 className="text-xl font-bold">新增桌位</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-pos-muted mb-1 block">桌號 *</label>
                <input value={form.number} onChange={e => setForm({...form, number: e.target.value})} className="pos-input" placeholder="例：A01" />
              </div>
              <div>
                <label className="text-sm text-pos-muted mb-1 block">區域</label>
                <input value={form.zone} onChange={e => setForm({...form, zone: e.target.value})} className="pos-input" />
              </div>
              <div>
                <label className="text-sm text-pos-muted mb-1 block">座位數</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} className="pos-input" />
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-pos-accent/30">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-pos-accent/30 text-pos-muted">取消</button>
              <button onClick={handleSave} className="flex-[2] py-3 rounded-xl bg-primary-600 text-white font-bold">儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}