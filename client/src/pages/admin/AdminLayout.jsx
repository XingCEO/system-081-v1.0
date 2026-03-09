// 後台管理版面
import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/admin', label: '儀表板', icon: '📊', end: true },
  { path: '/admin/menu', label: '菜單管理', icon: '📋' },
  { path: '/admin/orders', label: '訂單管理', icon: '🧾' },
  { path: '/admin/tables', label: '桌位管理', icon: '🪑' },
  { path: '/admin/members', label: '會員管理', icon: '👥' },
  { path: '/admin/staff', label: '員工管理', icon: '🧑‍💼' },
  { path: '/admin/reports', label: '營業報表', icon: '📈' },
  { path: '/admin/settings', label: '系統設定', icon: '⚙️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex bg-pos-bg overflow-hidden">
      {/* 側邊欄 */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} flex flex-col bg-pos-card border-r border-pos-accent/30 transition-all duration-300`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-pos-accent/30">
          <span className="text-2xl">🍽️</span>
          {sidebarOpen && <span className="font-bold text-lg">081 後台</span>}
        </div>

        {/* 導航 */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-pos-muted hover:text-pos-text hover:bg-pos-accent/20'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 底部 */}
        <div className="p-3 border-t border-pos-accent/30">
          <button
            onClick={() => navigate('/pos')}
            className="w-full py-2 rounded-xl bg-primary-600/20 text-primary-400 text-sm font-medium
                       hover:bg-primary-600/30 transition-colors"
          >
            {sidebarOpen ? '← 返回 POS' : '←'}
          </button>
        </div>
      </aside>

      {/* 主要內容區 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* 頂部列 */}
        <header className="flex items-center justify-between px-6 py-3 bg-pos-card/50 border-b border-pos-accent/30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-pos-muted hover:text-pos-text transition-colors"
          >
            ☰
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-pos-muted">{user?.name} ({user?.role})</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3 py-1 text-sm bg-pos-highlight/20 text-pos-highlight rounded-lg"
            >
              登出
            </button>
          </div>
        </header>

        {/* 頁面內容 */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
