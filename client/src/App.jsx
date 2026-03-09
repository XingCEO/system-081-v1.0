import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// 頁面
import LoginPage from './pages/LoginPage';
import PosPage from './pages/PosPage';
import KdsPage from './pages/KdsPage';
import CallScreenPage from './pages/CallScreenPage';
import KioskPage from './pages/KioskPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import MenuManagePage from './pages/admin/MenuManagePage';
import OrderManagePage from './pages/admin/OrderManagePage';
import TableManagePage from './pages/admin/TableManagePage';
import MemberManagePage from './pages/admin/MemberManagePage';
import StaffManagePage from './pages/admin/StaffManagePage';
import ReportPage from './pages/admin/ReportPage';
import SettingPage from './pages/admin/SettingPage';

// 受保護路由
function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      {/* 公開頁面 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/call-screen" element={<CallScreenPage />} />
      <Route path="/kiosk" element={<KioskPage />} />

      {/* POS 收銀台 */}
      <Route path="/pos" element={
        <ProtectedRoute>
          <PosPage />
        </ProtectedRoute>
      } />

      {/* KDS 廚房顯示 */}
      <Route path="/kds" element={
        <ProtectedRoute roles={['admin', 'manager', 'kitchen']}>
          <KdsPage />
        </ProtectedRoute>
      } />

      {/* 後台管理 */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin', 'manager']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="menu" element={<MenuManagePage />} />
        <Route path="orders" element={<OrderManagePage />} />
        <Route path="tables" element={<TableManagePage />} />
        <Route path="members" element={<MemberManagePage />} />
        <Route path="staff" element={<StaffManagePage />} />
        <Route path="reports" element={<ReportPage />} />
        <Route path="settings" element={<SettingPage />} />
      </Route>

      {/* 預設導向 */}
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
