// 員工管理頁面
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const roleLabels = { admin: '管理員', manager: '店長', cashier: '收銀員', kitchen: '廚房', server: '服務員' };

export default function StaffManagePage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({ name: '', pin: '', role: 'cashier' });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch { toast.error('載入失敗'); }
    finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    try {
      if (editingUser) {
        const data = { name: form.name, role: form.role };
        if (form.pin) data.pin = form.pin;
        await api.put(`/auth/users/${editingUser.id}`, data);
        toast.success('員工已更新');
      } else {
        await api.post('/auth/users', form);
        toast.success('員工已新增');
      }
      setShowForm(false);
      setEditingUser(null);
      setForm({ name: '', pin: '', role: 'cashier' });
      loadUsers();
    } catch (err) { toast.error(err.message); }
  };

  const handleToggle = async (user) => {
    try {
      await api.put(`/auth/users/${user.id}`, { isActive: !user.isActive });
      loadUsers();
    } catch (err) { toast.error(err.message); }
  };

  const startEdit = (user) => {
    setForm({ name: user.name, pin: '', role: user.role });
    setEditingUser(user);
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">員工管理</h1>
        <button onClick={() => { setShowForm(true); setEditingUser(null); setForm({ name: '', pin: '', role: 'cashier' }); }}
          className="pos-btn-primary text-sm">+ 新增員工</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(user => (
          <div key={user.id} className={`pos-card p-5 ${!user.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600/20 flex items-center justify-center text-xl">
                  {user.name[0]}
                </div>
                <div>
                  <div className="font-bold">{user.name}</div>
                  <div className="text-sm text-pos-muted">{roleLabels[user.role] || user.role}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${user.isActive ? 'bg-pos-success/20 text-pos-success' : 'bg-pos-highlight/20 text-pos-highlight'}`}>
                {user.isActive ? '啟用' : '停用'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(user)} className="flex-1 py-2 rounded-lg bg-pos-accent/30 text-sm text-pos-muted hover:text-pos-text">編輯</button>
              <button onClick={() => handleToggle(user)} className="flex-1 py-2 rounded-lg bg-pos-accent/30 text-sm text-pos-muted hover:text-pos-text">
                {user.isActive ? '停用' : '啟用'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowForm(false)}>
          <div className="bg-pos-card w-[400px] rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-pos-accent/30">
              <h2 className="text-xl font-bold">{editingUser ? '編輯員工' : '新增員工'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-sm text-pos-muted mb-1 block">姓名 *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="pos-input" /></div>
              <div><label className="text-sm text-pos-muted mb-1 block">PIN 碼 (4-6位數字) {editingUser ? '(留空不修改)' : '*'}</label>
                <input value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} className="pos-input" type="password" maxLength={6} placeholder="●●●●" /></div>
              <div><label className="text-sm text-pos-muted mb-1 block">角色</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="pos-input">
                  {Object.entries(roleLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
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