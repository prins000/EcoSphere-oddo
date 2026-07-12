// ============================================================
// EcoSphere ESG - App Router
// Main application routing with auth protection
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Notifications from './pages/Notifications';

// Environmental
import Departments from './pages/environmental/Departments';
import Emissions from './pages/environmental/Emissions';
import CarbonTracking from './pages/environmental/CarbonTracking';
import Goals from './pages/environmental/Goals';

// Social
import CSRActivities from './pages/social/CSRActivities';
import Participation from './pages/social/Participation';

// Governance
import Policies from './pages/governance/Policies';
import Audits from './pages/governance/Audits';

// Gamification
import Challenges from './pages/gamification/Challenges';
import Leaderboard from './pages/gamification/Leaderboard';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-eco-emerald to-eco-blue animate-pulse" />
          <p className="text-sm text-slate-500">Loading EcoSphere...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Public route - redirect to dashboard if already logged in
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected with layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Environmental */}
        <Route path="environmental/departments" element={<Departments />} />
        <Route path="environmental/emissions" element={<Emissions />} />
        <Route path="environmental/carbon" element={<CarbonTracking />} />
        <Route path="environmental/goals" element={<Goals />} />

        {/* Social */}
        <Route path="social/csr" element={<CSRActivities />} />
        <Route path="social/participation" element={<Participation />} />

        {/* Governance */}
        <Route path="governance/policies" element={<Policies />} />
        <Route path="governance/audits" element={<Audits />} />

        {/* Gamification */}
        <Route path="gamification/challenges" element={<Challenges />} />
        <Route path="gamification/leaderboard" element={<Leaderboard />} />

        {/* Tools */}
        <Route path="notifications" element={<Notifications />} />

        {/* Settings - simple placeholder */}
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Simple settings page
function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Account and application preferences</p>
      </div>
      <div className="glass-card p-6 max-w-lg">
        <h3 className="text-base font-semibold text-white mb-4">Account Info</h3>
        <div className="space-y-3">
          {[
            { label: 'Full Name', value: `${user?.firstName} ${user?.lastName}` },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: user?.role?.replace(/_/g, ' ') },
            { label: 'Department', value: user?.departmentId ? `Dept #${user.departmentId}` : 'N/A' },
            { label: 'XP Balance', value: `${user?.xp || 0} XP` },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-xs text-slate-500">{s.label}</span>
              <span className="text-sm text-white">{s.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
