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
import Settings from './pages/Settings';
import Reports from './pages/Reports';

// Environmental
import Departments from './pages/environmental/Departments';
import Emissions from './pages/environmental/Emissions';
import CarbonTracking from './pages/environmental/CarbonTracking';
import Goals from './pages/environmental/Goals';
import Products from './pages/environmental/Products';

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
        <Route path="environmental/products" element={<Products />} />

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
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
