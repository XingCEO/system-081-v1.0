// 會員管理頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const levelLabels = { normal: '一般', silver: '銀卡', gold: '金卡', vip: 'VIP' };
const levelColors = { normal: 'text-pos-muted', silver: 'text-gray-400', gold: 'text-pos-warning', vip: 'text-pos-highlight' };

export default function MemberManagePage() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', email: '', gender: '', birthday: '' });

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/members', { params });
      setMembers(res.data);
    } catch { toast.error('載入失敗'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    try {
      await api.post('/members', form);
      toast.success('會員已新增');
      setShowForm(false);
      setForm({ phone: '', name: '', email: '', gender: '', birthday: '' });
      loadMembers();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">會員管理</h1>
        <button onClick={() => setShowForm(true)} className="pos-btn-primary text-sm">+ 新增會員</button>
      </div>

      <div className="flex gap-3 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadMembers()}
          className="pos-input w-auto flex-1" placeholder="搜尋手機號碼、姓名..." />
        <button onClick={loadMembers} className="pos-btn-primary text-sm">搜尋</button>
      </div>

      <div className="pos-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-pos-accent/30 text-sm text-pos-muted">
              <th className="text-left p-3">姓名</th>
              <th className="text-left p-3">手機</th>
              <th className="text-center p-3">等級</th>
              <th className="text-right p-3">點數</th>
              <th className="text-right p-3">累積消費</th>
              <th className="text-right p-3">來店次數</th>
              <th className="text-left p-3">加入時間</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id} className="border-b border-pos-accent/10 hover:bg-pos-accent/10">
                <td className="p-3 font-medium">{m.name || '-'}</td>
                <td className="p-3">{m.phone}</td>
                <td className="p-3 text-center">
                  <span className={`font-bold ${levelColors[m.level]}`}>{levelLabels[m.level]}</span>
                </td>
                <td className="p-3 text-right">{m.points}</td>
                <td className="p-3 text-right">${m.totalSpent?.toLocaleString()}</td>
                <td className="p-3 text-right">{m.visitCount}</td>
                <td className="p-3 text-sm text-pos-muted">{dayjs(m.createdAt).format('YYYY-MM-DD')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="text-center text-pos-muted py-8">{isLoading ? '載入中...' : '沒有會員資料'}</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowForm(false)}>
          <div className="bg-pos-card w-[450px] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-pos-accent/30"><h2 className="text-xl font-bold">新增會員</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm text-pos-muted mb-1 block">手機號碼 *</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="pos-input" placeholder="09xxxxxxxx" /></div>
              <div><label className="text-sm text-pos-muted mb-1 block">姓名</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pos-input" /></div>
              <div><label className="text-sm text-pos-muted mb-1 block">Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="pos-input" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm text-pos-muted mb-1 block">性別</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="pos-input">
                    <option value="">未指定</option><option value="male">男</option><option value="female">女</option><option value="other">其他</option>
                  </select></div>
                <div><label className="text-sm text-pos-muted mb-1 block">生日</label>
                  <input type="date" value={form.birthday} onChange={e => setForm({...form, birthday: e.target.value})} className="pos-input" /></div>
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