import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Search, Bell, Menu } from 'lucide-react';
import api from '../../services/api';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/environmental/departments': 'Departments',
  '/environmental/emissions': 'Emission Factors',
  '/environmental/carbon': 'Carbon Tracking',
  '/environmental/goals': 'Environmental Goals',
  '/social/csr': 'CSR Activities',
  '/social/participation': 'Participation',
  '/governance/policies': 'Policies',
  '/governance/audits': 'Audits',
  '/gamification/challenges': 'Challenges',
  '/gamification/leaderboard': 'Leaderboard',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
};

export default function Header({ onMenuClick, isMobile }) {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] || 'EcoSphere';

  useEffect(() => {
    api.get('/notifications?limit=1').then(r => {
      setUnread(r.data.unreadCount || 0);
    }).catch(() => {});
  }, [location.pathname]);

  return (
    <header style={{
      height: 54,
      background: '#0B1220',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: isMobile ? '0 16px' : '0 24px',
      flexShrink: 0,
      gap: 12,
    }}>

      {/* Left: Hamburger (mobile) + Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {isMobile && (
          <button
            onClick={onMenuClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, borderRadius: 8,
              background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
              color: '#94A3B8', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
          >
            <Menu size={16} />
          </button>
        )}
        <h2 style={{
          fontSize: isMobile ? '0.875rem' : '0.9375rem',
          fontWeight: 600,
          color: '#F8FAFC',
          letterSpacing: '-0.02em',
          whiteSpace: 'nowrap',
        }}>
          {title}
        </h2>
      </div>

      {/* Center: Search (hidden on small mobile unless expanded) */}
      {!isMobile && (
        <div style={{ position: 'relative', flex: '0 1 300px' }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search…"
            style={{
              width: '100%',
              paddingLeft: 32, paddingRight: 40,
              paddingTop: 7, paddingBottom: 7,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 8,
              fontSize: '0.8125rem',
              color: '#F8FAFC',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(16,185,129,0.35)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.background = 'rgba(255,255,255,0.04)'; }}
          />
          <span style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.6875rem', color: '#374151',
            fontFamily: 'monospace',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '1px 5px',
          }}>⌘K</span>
        </div>
      )}

      {/* Right: Search icon (mobile) + Notifications + Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Mobile search icon */}
        {isMobile && (
          <button style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.07)',
            color: '#64748B', cursor: 'pointer',
          }}>
            <Search size={15} />
          </button>
        )}

        {/* Notifications */}
        <button style={{
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: 'transparent',
          border: '1px solid rgba(255,255,255,0.07)', color: '#64748B', cursor: 'pointer',
          transition: 'color 0.15s, border-color 0.15s',
        }}>
          <Bell size={15} />
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 5,
              width: 6, height: 6, borderRadius: '50%', background: '#10B981',
            }} />
          )}
        </button>

        {/* Divider */}
        {!isMobile && <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} />}

        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: '#1F2937',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8',
          border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', flexShrink: 0,
        }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
