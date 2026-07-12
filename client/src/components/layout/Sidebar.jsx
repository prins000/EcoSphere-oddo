import { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Leaf, Users, Shield, Trophy,
  Bell, Settings, LogOut, Factory, Target,
  HandHeart, Scale, BarChart2, Globe, X,
} from 'lucide-react';

const NAV = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  null,
  { label: 'Environmental', group: true },
  { path: '/environmental/departments', icon: Factory,  label: 'Departments' },
  { path: '/environmental/carbon',      icon: Leaf,     label: 'Carbon' },
  { path: '/environmental/goals',       icon: Target,   label: 'Goals' },
  { path: '/environmental/emissions',   icon: Globe,    label: 'Emissions' },
  null,
  { label: 'Social', group: true },
  { path: '/social/csr',           icon: HandHeart, label: 'CSR Activities' },
  { path: '/social/participation', icon: Users,     label: 'Participation' },
  null,
  { label: 'Governance', group: true },
  { path: '/governance/policies', icon: Shield, label: 'Policies' },
  { path: '/governance/audits',   icon: Scale,  label: 'Audits' },
  null,
  { label: 'Rewards', group: true },
  { path: '/gamification/challenges',  icon: BarChart2, label: 'Challenges' },
  { path: '/gamification/leaderboard', icon: Trophy,    label: 'Leaderboard' },
];

export default function Sidebar({ isMobile, isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close on navigation (mobile)
  useEffect(() => {
    if (isMobile) onClose();
  }, [location.pathname]);

  const sidebarStyle = isMobile
    ? {
        position: 'fixed',
        top: 0,
        left: isOpen ? 0 : -260,
        zIndex: 50,
        transition: 'left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        width: 240,
        height: '100vh',
        boxShadow: isOpen ? '0 0 40px rgba(0,0,0,0.6)' : 'none',
      }
    : {
        position: 'relative',
        width: 240,
        flexShrink: 0,
      };

  return (
    <aside style={{
      ...sidebarStyle,
      background: '#0D1117',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Logo row */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
            EcoSphere
          </span>
        </div>
        {/* Close button on mobile */}
        {isMobile && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {NAV.map((item, i) => {
          if (item === null) return <div key={i} style={{ height: 6 }} />;
          if (item.group) return (
            <p key={item.label} style={{
              fontSize: '0.6875rem', fontWeight: 600, color: '#2D3748',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '8px 12px 4px',
            }}>
              {item.label}
            </p>
          );
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '10px' }}>
        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', marginBottom: 2,
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: '#1F2937',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8', flexShrink: 0,
            }}>
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#E2E8F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.firstName} {user.lastName}
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.role?.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        )}
        <button onClick={() => { navigate('/notifications'); }} className="nav-item" style={{ width: '100%' }}>
          <Bell size={15} style={{ opacity: 0.7 }} /> Notifications
        </button>
        <button onClick={() => navigate('/settings')} className="nav-item" style={{ width: '100%' }}>
          <Settings size={15} style={{ opacity: 0.7 }} /> Settings
        </button>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="nav-item"
          style={{ width: '100%', color: '#EF4444', marginTop: 2 }}
        >
          <LogOut size={15} style={{ opacity: 0.8 }} /> Sign out
        </button>
      </div>
    </aside>
  );
}
