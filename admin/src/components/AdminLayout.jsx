import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingBag,
  Store,
  TableProperties,
  Users
} from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';

const navigation = [
  { to: '/', label: '儀表板', icon: LayoutDashboard, end: true },
  { to: '/menu', label: '菜單管理', icon: ShoppingBag },
  { to: '/orders', label: '訂單管理', icon: ClipboardList },
  { to: '/reports', label: '報表分析', icon: BarChart3 },
  { to: '/members', label: '會員管理', icon: Users },
  { to: '/staff', label: '員工管理', icon: Users },
  { to: '/tables', label: '桌位與預約', icon: TableProperties },
  { to: '/notifications', label: '通知中心', icon: Bell },
  { to: '/settings', label: '系統設定', icon: Settings }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuthStore();

  return (
    <div className="admin-shell px-3 py-3 md:px-5 xl:px-6">
      <div className="grid min-h-[calc(100dvh-1.5rem)] gap-4 xl:grid-cols-[288px_minmax(0,1fr)]">
        <aside className="admin-panel flex flex-col p-5 xl:sticky xl:top-3 xl:h-[calc(100dvh-1.5rem)]">
          <div className="mb-8">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-600 text-2xl text-white">
              <Store size={26} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Breakfast POS</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">後台管理</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {user?.name} / {user?.role}
            </p>
          </div>

          <div className="mb-6 rounded-[28px] bg-brand-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Control Tower</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{navigation.length} 個模組</div>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              側邊欄已改成常駐式滿版後台，桌機與平板橫向都會維持清楚的工作區。
            </p>
          </div>

          <nav className="space-y-2 overflow-y-auto pr-1">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                }`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="admin-ghost mt-auto w-full"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <LogOut size={18} />
            登出
          </button>
        </aside>

        <main className="min-w-0 space-y-4">
          <header className="admin-panel relative overflow-hidden px-5 py-5 md:px-6">
            <div className="absolute inset-y-0 right-0 hidden w-96 bg-gradient-to-l from-brand-50 via-brand-50/60 to-transparent lg:block" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-brand-600">營運管理中心</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">早餐店 POS 後台總覽</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  這個後台已調整成全寬工作檯，左側導覽固定、右側內容滿版延展，方便管理菜單、訂單、會員與系統設定。
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/80 bg-white/90 px-4 py-3 shadow-panel backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-600">Role</div>
                  <div className="mt-1 text-lg font-black text-slate-900">{user?.role || 'ADMIN'}</div>
                </div>
                <div className="rounded-3xl border border-white/80 bg-white/90 px-4 py-3 shadow-panel backdrop-blur">
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Scope</div>
                  <div className="mt-1 text-lg font-black text-slate-900">Menu / Orders / Reports</div>
                </div>
              </div>
            </div>
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
