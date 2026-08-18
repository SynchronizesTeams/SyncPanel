import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { UserDashboard } from './pages/user/UserDashboard';
import { WebsitesList } from './pages/user/WebsitesList';
import { WebsiteDetail } from './pages/user/WebsiteDetail';
import { DnsManager } from './pages/user/DnsManager';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersManager } from './pages/admin/UsersManager';
import { CloudflareConfig } from './pages/admin/CloudflareConfig';
import { AuditLogsView } from './pages/admin/AuditLogsView';
import { ServerDoctorView } from './pages/admin/ServerDoctorView';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({
  children,
  requireAdmin = false,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading CloudPanel...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const DefaultRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* User Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/websites" element={<ProtectedRoute><WebsitesList /></ProtectedRoute>} />
          <Route path="/websites/:id" element={<ProtectedRoute><WebsiteDetail /></ProtectedRoute>} />
          <Route path="/dns-records" element={<ProtectedRoute><DnsManager /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UsersManager /></ProtectedRoute>} />
          <Route path="/admin/cloudflare" element={<ProtectedRoute requireAdmin><CloudflareConfig /></ProtectedRoute>} />
          <Route path="/admin/health" element={<ProtectedRoute requireAdmin><ServerDoctorView /></ProtectedRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedRoute requireAdmin><AuditLogsView /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
