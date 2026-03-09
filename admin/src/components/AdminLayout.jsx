import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, ClipboardList, LayoutDashboard, LogOut, Settings, Users, UtensilsCrossed } from 'lucide-react';
import { useAdminAuthStore } from '../stores/authStore';

const navigation = [
  { to: '/', label: '儀表板', icon: LayoutDashboard, end: true },
  { to: '/menu', label: '菜單管理', icon: UtensilsCrossed },
  { to: '/orders', label: '訂單管理', icon: ClipboardList },
  { to: '/reports', label: '報表分析', icon: BarChart3 },
  { to: '/members', label: '會員管理', icon: Users },
  { to: '/staff', label: '員工管理', icon: Users },
  { to: '/tables', label: '桌位與預約', icon: Bell },
  { to: '/settings', label: '系統設定', icon: Settings }
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuthStore();

  return (
    <div className="admin-shell px-4 py-4 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1680px] gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="admin-panel flex flex-col p-5">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand-600">Breakfast POS</p>
            <h1 className="mt-2 text-3xl font-black text-slate-900">後台管理中心</h1>
            <p className="mt-3 text-sm leading-7 text-slate-500">{user?.name} / {user?.role}</p>
          </div>

          <nav className="space-y-2">
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

        <main className="space-y-4">
          <header className="admin-panel flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-brand-600">營運總覽</p>
              <h2 className="text-2xl font-black text-slate-900">早餐店營運監控台</h2>
            </div>
            <div className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
              即時營運狀態
            </div>
          </header>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
