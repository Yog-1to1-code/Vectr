import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { ROUTES } from './constants';

import LoginPage from './pages/LoginPage';
import PATPage from './pages/PATPage';
import DashboardPage from './pages/DashboardPage';
import ContributePage from './pages/ContributePage';
import IssueDashboardPage from './pages/IssueDashboardPage';
import DraftPRPage from './pages/DraftPRPage';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path={ROUTES.LOGIN} element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginPage />} />

      {/* Auth required — standalone layout */}
      <Route path={ROUTES.PAT} element={<ProtectedRoute><PATPage /></ProtectedRoute>} />

      {/* Auth required — with sidebar */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.CONTRIBUTE} element={<ContributePage />} />
        <Route path={ROUTES.ISSUE} element={<IssueDashboardPage />} />
        <Route path={ROUTES.DRAFT_PR} element={<DraftPRPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.LOGIN} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
