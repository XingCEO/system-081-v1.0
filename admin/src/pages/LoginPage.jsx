import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BarChart3, LockKeyhole, Settings2 } from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading } = useAdminAuthStore();
  const [form, setForm] = useState({ name: 'admin', password: 'admin123' });

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await login(form.name, form.password);
      toast.success('後台登入成功');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || '後台登入失敗');
    }
  };

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center px-3 py-6 md:px-5 xl:px-6">
      <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.75fr)]">
        <section className="admin-panel p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Admin Console</p>
          <h1 className="mt-3 text-4xl font-black text-slate-900">早餐店營運管理後台</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
            這裡可查看營業數據、管理菜單與訂單、調整通知設定與維護會員資料。
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: '營運數據',
                description: '即時掌握今日營業額、熱門商品、尖峰時段與低庫存狀況。'
              },
              {
                icon: Settings2,
                title: '系統設定',
                description: '可調整點數規則、LINE Notify、列印機與備份還原。'
              },
              {
                icon: LockKeyhole,
                title: '權限管理',
                description: '依角色控管後台功能，讓老闆、店長與員工各自使用合適權限。'
              }
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="admin-soft p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <form className="admin-panel space-y-5 p-8" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">帳號</label>
            <input
              className="admin-field"
              data-testid="admin-login-name-input"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">密碼</label>
            <input
              className="admin-field"
              type="password"
              data-testid="admin-login-password-input"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
          </div>
          <button className="admin-button w-full py-3 text-lg" disabled={loading} type="submit" data-testid="admin-login-submit">
            {loading ? '登入中...' : '登入後台'}
          </button>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-500">
            預設帳號：admin / admin123
          </div>
        </form>
      </div>
    </div>
  );
}
