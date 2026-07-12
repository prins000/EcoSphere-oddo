// ============================================================
// EcoSphere ESG - Sidebar Navigation
// Premium glassmorphism sidebar with collapsible navigation
// ============================================================

import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Leaf,
  Users,
  Shield,
  Trophy,
  FileText,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Globe,
  Factory,
  Target,
  HandHeart,
  Scale,
  Sparkles,
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'Environmental',
    items: [
      { path: '/environmental/departments', icon: Factory, label: 'Departments' },
      { path: '/environmental/emissions', icon: Globe, label: 'Emissions' },
      { path: '/environmental/carbon', icon: Leaf, label: 'Carbon Tracking' },
      { path: '/environmental/goals', icon: Target, label: 'Goals' },
    ],
  },
  {
    title: 'Social',
    items: [
      { path: '/social/csr', icon: HandHeart, label: 'CSR Activities' },
      { path: '/social/participation', icon: Users, label: 'Participation' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { path: '/governance/policies', icon: Shield, label: 'Policies' },
      { path: '/governance/audits', icon: Scale, label: 'Audits' },
    ],
  },
  {
    title: 'Gamification',
    items: [
      { path: '/gamification/challenges', icon: Trophy, label: 'Challenges' },
      { path: '/gamification/leaderboard', icon: Sparkles, label: 'Leaderboard' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { path: '/reports', icon: FileText, label: 'Reports' },
      { path: '/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar flex flex-col ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* ── Logo ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eco-emerald to-eco-blue flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <h1 className="text-lg font-bold bg-gradient-to-r from-eco-emerald to-eco-blue bg-clip-text text-transparent">
              EcoSphere
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">ESG Platform</p>
          </div>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'active' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Info & Collapse ────────────────────────── */}
      <div className="border-t border-white/5 p-3 space-y-2">
        {/* User card */}
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-eco-purple to-eco-blue flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user.role?.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/settings')}
            className="nav-item flex-1"
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="nav-item w-full text-eco-rose hover:text-eco-rose-light hover:bg-eco-rose/10"
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
