import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import PosPage from './pages/pos/PosPage';
import KioskPage from './pages/kiosk/KioskPage';
import QrPage from './pages/qr/QrPage';
import KdsPage from './pages/kds/KdsPage';
import CallerPage from './pages/caller/CallerPage';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/kiosk" element={<KioskPage />} />
      <Route path="/qr" element={<QrPage />} />
      <Route path="/caller" element={<CallerPage />} />
      <Route
        path="/pos"
        element={(
          <ProtectedRoute>
            <PosPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/kds"
        element={(
          <ProtectedRoute>
            <KdsPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/" element={<Navigate to="/pos" replace />} />
      <Route path="*" element={<Navigate to="/pos" replace />} />
    </Routes>
  );
}
