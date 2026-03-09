import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAdminAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAdminAuthStore();
  const [form, setForm] = useState({ name: 'admin', password: 'admin123' });

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(form.name, form.password);
      toast.success('登入成功');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || '登入失敗');
    }
  };

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="admin-panel grid w-full max-w-5xl gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Admin Console</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">早餐店營運後台</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            菜單、訂單、報表、會員、員工與系統設定都集中在同一個後台入口，方便店長與老闆快速掌握整體營運。
          </p>
        </section>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">帳號</label>
            <input className="admin-field" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">密碼</label>
            <input className="admin-field" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </div>
          <button className="admin-button w-full py-3 text-lg" disabled={loading} type="submit">
            {loading ? '登入中...' : '登入後台'}
          </button>
        </form>
      </div>
    </div>
  );
}
