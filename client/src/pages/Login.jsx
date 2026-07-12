import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const DEMO = [
  { role: 'Admin',       email: 'admin@ecosphere.com',    password: 'admin123' },
  { role: 'ESG Manager', email: 'manager@ecosphere.com',  password: 'manager123' },
  { role: 'Dept Head',   email: 'head@ecosphere.com',     password: 'head123' },
  { role: 'Employee',    email: 'employee@ecosphere.com', password: 'emp123' },
];

// ── Shared input style ─────────────────────────────────────────
const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#1F2937',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  fontSize: '0.875rem',
  color: '#F8FAFC',
  outline: 'none',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
};

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { login }   = useAuth();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (d) => { setEmail(d.email); setPassword(d.password); setError(''); };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0B1220',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {/* Subtle background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 300,
          background: 'radial-gradient(ellipse, rgba(16,185,129,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: 400, position: 'relative', animation: 'fade-in 0.25s ease-out' }}>

        {/* ── Logo ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 44, height: 44, borderRadius: 12,
            background: '#10B981',
            marginBottom: 16,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.03em', marginBottom: 6 }}>
            EcoSphere
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#475569' }}>
            ESG Management Platform
          </p>
        </div>

        {/* ── Login card ───────────────────────────────────── */}
        <div style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '32px 32px 28px',
          marginBottom: 12,
        }}>
          <h2 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.02em', marginBottom: 4 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: 28 }}>
            Sign in to continue to your workspace
          </p>

          {/* Error */}
          {error && (
            <div style={{
              marginBottom: 20,
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.18)',
              borderRadius: 8,
              fontSize: '0.8125rem',
              color: '#EF4444',
              animation: 'scale-in 0.15s ease-out',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginBottom: 6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>
                  Password
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = 'rgba(16,185,129,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#374151', padding: 0, display: 'flex', alignItems: 'center',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#374151'}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 20px',
                background: loading ? '#059669' : '#10B981',
                border: 'none',
                borderRadius: 10,
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: loading ? 0.8 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                letterSpacing: '-0.01em',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#059669'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#10B981'; }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* ── Demo accounts ────────────────────────────────── */}
        <div style={{
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '20px 24px',
        }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Demo accounts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {DEMO.map(d => (
              <button
                key={d.role}
                onClick={() => fillDemo(d)}
                style={{
                  padding: '10px 12px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s, border-color 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#CBD5E1', marginBottom: 2 }}>{d.role}</p>
                <p style={{ fontSize: '0.6875rem', color: '#374151' }}>{d.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.75rem', color: '#1F2937' }}>
          EcoSphere ESG Platform · 2026
        </p>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
