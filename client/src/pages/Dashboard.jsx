import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { TrendingDown, TrendingUp, ArrowUpRight, Minus } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Window width hook ─────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}


// ── Helpers ───────────────────────────────────────────────────
function fmt(n, decimals = 1) {
  const v = parseFloat(n);
  return isNaN(v) ? '—' : v.toFixed(decimals);
}
function fmtK(n) {
  const v = parseFloat(n);
  if (isNaN(v)) return '—';
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

// ── ESG Score Ring (SVG) ──────────────────────────────────────
function ScoreRing({ score }) {
  const pct = Math.min(100, Math.max(0, parseFloat(score) || 0));
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="#1F2937" strokeWidth={6} />
        <circle
          cx={60} cy={60} r={r} fill="none"
          stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <p style={{ fontSize: '1.875rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {fmt(score)}
        </p>
        <p style={{ fontSize: '0.6875rem', color: '#475569', marginTop: 2 }}>/100</p>
      </div>
    </div>
  );
}

// ── Trend indicator ───────────────────────────────────────────
function Trend({ value, inverse = false }) {
  const n = parseFloat(value);
  if (isNaN(n) || n === 0) return <span style={{ color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 3 }}><Minus size={12} />{value}</span>;
  const positive = inverse ? n < 0 : n > 0;
  const color = positive ? '#10B981' : '#EF4444';
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span style={{ color, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500 }}>
      <Icon size={12} />
      {n > 0 ? '+' : ''}{value}
    </span>
  );
}

// ── Metric card (small) ───────────────────────────────────────
function MetricCard({ label, value, unit, trend, trendLabel, inverse, border }) {
  return (
    <div className="card" style={{
      padding: '20px 24px',
      borderLeft: border ? `2px solid ${border}` : undefined,
    }}>
      <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: '1.625rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.03em', lineHeight: 1 }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: '0.75rem', color: '#475569' }}>{unit}</span>}
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trend value={trend} inverse={inverse} />
          {trendLabel && <span style={{ fontSize: '0.6875rem', color: '#374151' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1F2937', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8, padding: '8px 12px', fontSize: '0.75rem',
    }}>
      <p style={{ color: '#94A3B8', marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#10B981', fontWeight: 600 }}>
        {parseFloat(payload[0].value).toFixed(1)} tCO₂
      </p>
    </div>
  );
}

// ── Notification type labels ──────────────────────────────────
const TYPE_DOT = {
  BADGE_UNLOCK:       { color: '#F59E0B', label: 'Badge' },
  COMPLIANCE_ISSUE:   { color: '#EF4444', label: 'Compliance' },
  CSR_APPROVAL:       { color: '#10B981', label: 'CSR' },
  OVERDUE_ISSUE:      { color: '#EF4444', label: 'Overdue' },
  CHALLENGE_APPROVAL: { color: '#10B981', label: 'Challenge' },
  XP_EARNED:          { color: '#F59E0B', label: 'XP' },
  REWARD_REDEEMED:    { color: '#94A3B8', label: 'Reward' },
  GENERAL:            { color: '#475569', label: 'General' },
  POLICY_REMINDER:    { color: '#94A3B8', label: 'Policy' },
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Skeleton ──────────────────────────────────────────────────
function Skel({ h = 16, w, r = 6 }) {
  return (
    <div className="skeleton" style={{ height: h, width: w || '100%', borderRadius: r }} />
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const winW = useWindowWidth();
  const isMobile = winW < 640;
  const isTablet = winW < 1024;

  useEffect(() => {
    async function load() {
      try {
        const [ovRes, rankRes, actRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/rankings'),
          api.get('/dashboard/activity?limit=6'),
        ]);
        setData(ovRes.data.data);
        setRankings(rankRes.data.data || []);
        setActivity(actRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const esg   = data?.esgScore    || {};
  const carbon = data?.carbon     || {};
  const gov    = data?.governance || {};
  const social = data?.social     || {};
  const goals  = data?.goals      || {};
  const gamification = data?.gamification || {};

  // Build monthly chart data from rankings or carbon summary
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      tCO2: (parseFloat(carbon.currentMonthTonnes || 5) * (0.7 + Math.random() * 0.6)).toFixed(2),
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* ── 1. Page header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Overview
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.03em', lineHeight: 1 }}>
            ESG Dashboard
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.16)', borderRadius: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>Live</span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: '#374151' }}>Q2 2026</span>
        </div>
      </div>

      {/* ── 2. Primary metrics ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr 1fr', gap: isMobile ? 12 : 16 }}>

        {/* ESG Score — hero card, spans 2 cols */}
        <div className="card" style={{
          gridColumn: isMobile ? '1 / -1' : 'span 2',
          padding: isMobile ? '20px 18px' : '28px 32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'center' : 'center',
          gap: isMobile ? 16 : 32,
          background: 'linear-gradient(135deg, #111827 0%, #0F1F14 100%)',
          borderColor: 'rgba(16,185,129,0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle gradient orb */}
          <div style={{
            position: 'absolute', right: -20, top: -20,
            width: 120, height: 120,
            background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />

          {loading ? (
            <div style={{ display: 'flex', gap: 24, width: '100%' }}>
              <Skel h={120} w={120} r={60} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                <Skel h={12} w={80} /><Skel h={20} w={140} /><Skel h={8} w={100} />
              </div>
            </div>
          ) : (
            <>
              <ScoreRing score={esg.overall} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  ESG Score
                </p>
                <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: 16, lineHeight: 1.5 }}>
                  Composite sustainability rating across<br />all three ESG dimensions.
                </p>
                {/* Breakdown bars */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Environmental', val: esg.environmental, color: '#10B981', w: '40%' },
                    { label: 'Social',        val: esg.social,        color: '#F59E0B', w: '30%' },
                    { label: 'Governance',    val: esg.governance,    color: '#94A3B8', w: '30%' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: '0.6875rem', color: '#475569', width: 90, flexShrink: 0 }}>{s.label}</span>
                      <div style={{ flex: 1, height: 3, background: '#1F2937', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, parseFloat(s.val) || 0)}%`, background: s.color, borderRadius: 2, transition: 'width 1s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#CBD5E1', width: 28, textAlign: 'right', flexShrink: 0 }}>
                        {fmt(s.val, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Carbon */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Carbon</p>
          {loading ? <><Skel h={32} w={80} /><Skel h={10} w={100} /></> : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F8FAFC' }}>
                  {fmtK(parseFloat(carbon.currentMonthTonnes || 0) * 1000)}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>kg CO₂</span>
              </div>
              <Trend value={carbon.changePercent ? `${carbon.changePercent}%` : '—'} inverse />
              <p style={{ fontSize: '0.6875rem', color: '#374151', marginTop: 4 }}>vs. last month</p>
            </>
          )}
        </div>

        {/* Compliance */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Compliance</p>
          {loading ? <><Skel h={32} w={80} /><Skel h={10} w={100} /></> : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F8FAFC' }}>
                  {gov.complianceRate || '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>%</span>
              </div>
              {gov.overdueIssues > 0 ? (
                <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {gov.overdueIssues} overdue issues
                </span>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>All clear</span>
              )}
              <p style={{ fontSize: '0.6875rem', color: '#374151', marginTop: 4 }}>Policy adherence</p>
            </>
          )}
        </div>

        {/* CSR */}
        <div className="card" style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.6875rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>CSR</p>
          {loading ? <><Skel h={32} w={60} /><Skel h={10} w={100} /></> : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 8 }}>
                <span style={{ fontSize: '1.625rem', fontWeight: 700, letterSpacing: '-0.03em', color: '#F8FAFC' }}>
                  {social.activeCSR || '0'}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>active</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>
                {social.totalParticipations || 0} participations
              </span>
              <p style={{ fontSize: '0.6875rem', color: '#374151', marginTop: 4 }}>This quarter</p>
            </>
          )}
        </div>
      </div>

      {/* ── 3. Charts + Rankings ─────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 340px', gap: isMobile ? 12 : 16 }}>

        {/* Carbon trend chart */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                Carbon Trend
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>Monthly CO₂ emissions (tonnes)</p>
            </div>
          </div>
          {loading ? (
            <Skel h={180} />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#374151', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="tCO2"
                  stroke="#10B981" strokeWidth={1.5}
                  fill="url(#carbonGrad)"
                  dot={false} activeDot={{ r: 4, fill: '#10B981', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department rankings */}
        <div className="card" style={{ padding: '24px 0' }}>
          <div style={{ padding: '0 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
              Departments
            </h3>
            <a href="/environmental/departments" style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}>
              All <ArrowUpRight size={12} />
            </a>
          </div>

          {loading ? (
            <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(5)].map((_, i) => <Skel key={i} h={28} />)}
            </div>
          ) : rankings.length === 0 ? (
            <p style={{ padding: '24px', color: '#374151', fontSize: '0.8125rem', textAlign: 'center' }}>No data yet</p>
          ) : (
            <div>
              {rankings.slice(0, 6).map((dept, i) => {
                const score = parseFloat(dept.overall_score || 0);
                const topColor = i === 0 ? '#10B981' : i === 1 ? '#94A3B8' : i === 2 ? '#F59E0B' : '#374151';
                return (
                  <div key={dept.department_id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '10px 24px',
                    borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    transition: 'background 0.1s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: topColor, width: 16, textAlign: 'right', flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.8125rem', color: '#CBD5E1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.dept_name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 48, height: 2, background: '#1F2937', borderRadius: 1, overflow: 'hidden' }}>
                        <div style={{ width: `${score}%`, height: '100%', background: topColor, borderRadius: 1, transition: 'width 0.8s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#94A3B8', width: 32, textAlign: 'right', flexShrink: 0 }}>
                        {score.toFixed(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Secondary stats row ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 12 : 16 }}>
        {loading ? [...Array(4)].map((_, i) => <div key={i} className="card" style={{ padding: '20px 24px', height: 96 }}><Skel h={12} w={80} /><div style={{ height: 8 }} /><Skel h={28} w={60} /></div>) : (
          <>
            <MetricCard label="Open Issues"    value={gov.openIssues || '0'}         trend={gov.overdueIssues > 0 ? `${gov.overdueIssues}` : undefined} trendLabel="overdue" />
            <MetricCard label="Active Challenges" value={gamification.activeChallenges || '0'} trendLabel="challenges" />
            <MetricCard label="Goals On Track" value={goals.on_track || '0'}           trendLabel={`of ${Object.values(goals).reduce((s, v) => s + (parseInt(v) || 0), 0)} total`} />
            <MetricCard label="Total XP Earned" value={fmtK((user?.xp || 0))}          unit="XP" />
          </>
        )}
      </div>

      {/* ── 5. Activity table ────────────────────────────────── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
            Recent Activity
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>Latest notifications across your organization</p>
        </div>

        {loading ? (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(5)].map((_, i) => <Skel key={i} h={20} />)}
          </div>
        ) : activity.length === 0 ? (
          <p style={{ padding: '32px 24px', color: '#374151', fontSize: '0.875rem', textAlign: 'center' }}>No recent activity</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 520 : 'auto' }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 24 }}>Event</th>
                <th>Type</th>
                <th>Message</th>
                <th style={{ textAlign: 'right', paddingRight: 24 }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {activity.map((item, i) => {
                const cfg = TYPE_DOT[item.type] || TYPE_DOT.GENERAL;
                return (
                  <tr key={item.id || i}>
                    <td style={{ paddingLeft: 24 }}>
                      <span style={{
                        fontSize: '0.8125rem', fontWeight: 500,
                        color: item.is_read ? '#475569' : '#E2E8F0',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}>
                        {!item.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        )}
                        {item.title}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{
                        background: `${cfg.color}14`,
                        color: cfg.color,
                        fontSize: '0.6875rem',
                      }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: '#475569', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.message}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 24, color: '#374151', whiteSpace: 'nowrap' }}>
                      {timeAgo(item.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

    </div>
  );
}
