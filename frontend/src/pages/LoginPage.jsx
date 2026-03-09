import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockKeyhole, ShieldCheck, TimerReset } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithPassword, loginWithPin, loading } = useAuthStore();
  const [mode, setMode] = useState('pin');
  const [form, setForm] = useState({ name: '', password: '', pin: '' });

  const targetPath = useMemo(() => location.state?.from || '/pos', [location.state]);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    try {
      await loginWithPassword(form.name, form.password);
      toast.success('登入成功');
      navigate(targetPath, { replace: true });
    } catch (error) {
      toast.error(error.message || '帳號或密碼錯誤');
    }
  };

  const handlePinLogin = async (event) => {
    event.preventDefault();
    try {
      await loginWithPin(form.pin);
      toast.success('登入成功');
      navigate(targetPath, { replace: true });
    } catch (error) {
      toast.error(error.message || 'PIN 錯誤');
    }
  };

  return (
    <div className="page-shell flex items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel overflow-hidden p-8 lg:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-600 text-2xl text-white">
              🍳
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-600">Breakfast POS</p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">早餐店營運工作台</h1>
            </div>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            收銀、廚房、叫號與會員流程都集中在同一套系統。店員可用 PIN 快速登入，主管也能用帳密管理完整營運資料。
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: '權限分流', text: '依角色顯示不同功能，前台與後台權限分開管理。' },
              { icon: TimerReset, title: '即時同步', text: 'POS 建單後，KDS 與叫號畫面會立刻收到最新狀態。' },
              { icon: LockKeyhole, title: '快速登入', text: '支援員工 PIN 與管理者帳密登入，交班更順手。' }
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="soft-panel p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <Icon size={20} />
                </div>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel p-6 md:p-8">
          <div className="mb-6 flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {[
              { id: 'pin', label: 'PIN 快速登入' },
              { id: 'password', label: '帳密登入' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`flex-1 rounded-full px-4 py-3 text-sm font-semibold transition ${
                  mode === tab.id ? 'bg-white text-brand-700 shadow-soft' : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {mode === 'pin' ? (
            <form className="space-y-5" onSubmit={handlePinLogin}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">PIN 碼</label>
                <input
                  className="field text-center text-2xl tracking-[0.5em]"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="0000"
                  value={form.pin}
                  onChange={(event) => setForm((current) => ({ ...current, pin: event.target.value }))}
                />
              </div>
              <button className="action-button w-full py-3 text-lg" disabled={loading} type="submit">
                {loading ? '登入中...' : '使用 PIN 登入'}
              </button>
              <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                測試 PIN：`0000` 老闆、`1111` 店長、`2222` 店員
              </div>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handlePasswordLogin}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">帳號</label>
                <input
                  className="field"
                  placeholder="例如：admin"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">密碼</label>
                <input
                  className="field"
                  type="password"
                  placeholder="請輸入密碼"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                />
              </div>
              <button className="action-button w-full py-3 text-lg" disabled={loading} type="submit">
                {loading ? '登入中...' : '登入系統'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
