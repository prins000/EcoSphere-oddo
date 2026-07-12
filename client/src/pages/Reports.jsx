// ============================================================
// EcoSphere ESG - Reports Page
// Environmental, Social, Governance, ESG Summary, Custom Builder
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  BarChart3, Download, Filter, Loader2, Leaf, Users, Shield,
  Trophy, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  RefreshCw, FileText,
} from 'lucide-react';

// ── Utilities ─────────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${(r[k] ?? '').toString().replace(/"/g, '""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, color = '#10B981', icon: Icon }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>{label}</p>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <p style={{ fontSize: '1.625rem', fontWeight: 700, color, lineHeight: 1 }}>{value ?? '—'}</p>
      {sub && <p style={{ fontSize: '0.75rem', color: '#374151', marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function DataTable({ rows, emptyMsg = 'No data' }) {
  if (!rows || rows.length === 0) return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#374151', fontSize: '0.875rem' }}>{emptyMsg}</div>
  );
  const keys = Object.keys(rows[0]);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{ textAlign: 'left', padding: '8px 12px', color: '#374151', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                {k.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {keys.map(k => (
                <td key={k} style={{ padding: '9px 12px', color: '#CBD5E1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row[k] === null || row[k] === undefined ? '—' :
                   typeof row[k] === 'number' ? row[k].toLocaleString() :
                   String(row[k]).length > 60 ? String(row[k]).slice(0, 57) + '...' : String(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Filter Bar ────────────────────────────────────────────────
function FilterBar({ filters, onChange, departments, showEmployee = false, showCategory = false, showChallenge = false, challenges = [] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
      <select value={filters.departmentId || ''} onChange={e => onChange({ ...filters, departmentId: e.target.value })}
        style={{ padding: '6px 10px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
        <option value="">All Departments</option>
        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <input type="date" value={filters.startDate || ''} onChange={e => onChange({ ...filters, startDate: e.target.value })}
        style={{ padding: '6px 10px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }} />
      <input type="date" value={filters.endDate || ''} onChange={e => onChange({ ...filters, endDate: e.target.value })}
        style={{ padding: '6px 10px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }} />
      {showChallenge && (
        <select value={filters.challengeId || ''} onChange={e => onChange({ ...filters, challengeId: e.target.value })}
          style={{ padding: '6px 10px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
          <option value="">All Challenges</option>
          {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, collapsible = false, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</p>
        {collapsible && (
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', display: 'flex' }}>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      {open && children}
    </div>
  );
}

// ── REPORT TABS ───────────────────────────────────────────────

// Environmental Report
function EnvReport({ departments }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/reports/environmental', { params: filters });
      setData(r.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const s = data?.summary || {};
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <FilterBar filters={filters} onChange={setFilters} departments={departments} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#94A3B8', fontSize: '0.8125rem', cursor: 'pointer' }}>
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={() => exportCSV(data?.bySource, 'environmental_report.csv')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#10B981', border: 'none', borderRadius: 7, color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="Total CO₂ (tonnes)" value={parseFloat(s.total_co2 || 0).toFixed(2)} color="#10B981" icon={Leaf} />
            <StatCard label="Transactions" value={s.total_transactions} color="#3B82F6" icon={BarChart3} />
            <StatCard label="Avg per Transaction" value={parseFloat(s.avg_co2 || 0).toFixed(2)} sub="tCO₂e" color="#F59E0B" />
            <StatCard label="Active Goals" value={data.goals?.filter(g => g.status === 'ON_TRACK').length} color="#8B5CF6" />
          </div>

          <Section title="Emissions by Source" collapsible>
            <DataTable rows={data.bySource} emptyMsg="No carbon transactions yet" />
          </Section>

          <Section title="Emissions by Department" collapsible>
            <DataTable rows={data.byDepartment} emptyMsg="No department data" />
          </Section>

          <Section title="Environmental Goals" collapsible>
            <DataTable rows={data.goals?.map(g => ({ title: g.title, status: g.status, dept: g.dept_name || 'All', target: `${g.target_value} ${g.unit}`, progress: `${g.progress_pct}%`, end_date: g.end_date?.split('T')[0] }))} emptyMsg="No goals set" />
          </Section>
        </>
      )}
    </div>
  );
}

// Social Report
function SocialReport({ departments }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/reports/social', { params: filters }); setData(r.data.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const s = data?.csrSummary || {};
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <FilterBar filters={filters} onChange={setFilters} departments={departments} />
        <button onClick={() => exportCSV(data?.topParticipants, 'social_report.csv')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#F59E0B', border: 'none', borderRadius: 7, color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="CSR Activities" value={s.total_activities} color="#F59E0B" icon={Users} />
            <StatCard label="Total Participations" value={s.total_participations} color="#10B981" />
            <StatCard label="Volunteer Hours" value={parseFloat(s.total_hours || 0).toFixed(0)} sub="approved hours" color="#3B82F6" />
            <StatCard label="XP Awarded" value={(s.total_xp || 0).toLocaleString()} color="#8B5CF6" />
          </div>

          <Section title="Top Participants" collapsible>
            <DataTable rows={data.topParticipants} emptyMsg="No participation records" />
          </Section>

          <Section title="Workforce Diversity by Role" collapsible>
            <DataTable rows={data.diversityByRole} emptyMsg="No role data" />
          </Section>

          <Section title="Employees by Department" collapsible>
            <DataTable rows={data.diversityByDept} emptyMsg="No department data" />
          </Section>
        </>
      )}
    </div>
  );
}

// Governance Report
function GovernanceReport({ departments }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/reports/governance', { params: filters }); setData(r.data.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetch(); }, [fetch]);

  const a = data?.auditSummary || {};
  const p = data?.policyStats || {};
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <FilterBar filters={filters} onChange={setFilters} departments={departments} />
        <button onClick={() => exportCSV(data?.overdueIssues, 'governance_report.csv')} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#8B5CF6', border: 'none', borderRadius: 7, color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <StatCard label="Total Audits" value={a.total_audits} color="#8B5CF6" icon={Shield} />
            <StatCard label="Completed" value={a.completed} color="#10B981" />
            <StatCard label="Total Policies" value={p.total_policies} color="#3B82F6" />
            <StatCard label="Overdue Issues" value={data.overdueIssues?.length} color="#EF4444" icon={AlertTriangle} />
          </div>

          {data.overdueIssues?.length > 0 && (
            <Section title="⚠ Overdue Compliance Issues" collapsible>
              <DataTable rows={data.overdueIssues} emptyMsg="No overdue issues" />
            </Section>
          )}

          <Section title="Issues by Severity & Status" collapsible>
            <DataTable rows={data.issuesBySeverity} emptyMsg="No issues" />
          </Section>

          <Section title="Recent Audits" collapsible>
            <DataTable rows={data.recentAudits?.map(r => ({ title: r.title, status: r.status, type: r.type, department: r.dept_name, date: r.scheduled_date?.split('T')[0] }))} emptyMsg="No audits" />
          </Section>
        </>
      )}
    </div>
  );
}

// ESG Summary Report
function SummaryReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/summary').then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 10 }} />;
  if (!data) return null;

  const { weights, scores, departmentScores, topDepartments } = data;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => exportCSV(departmentScores?.map(d => ({ department: d.dept_name, environmental: d.environmental_score, social: d.social_score, governance: d.governance_score, total: d.total_score })), 'esg_summary.csv')}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#3B82F6', border: 'none', borderRadius: 7, color: 'white', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard label={`Environmental (${weights?.environmental}%)`} value={scores?.environmental} color="#10B981" icon={Leaf} />
        <StatCard label={`Social (${weights?.social}%)`} value={scores?.social} color="#F59E0B" icon={Users} />
        <StatCard label={`Governance (${weights?.governance}%)`} value={scores?.governance} color="#8B5CF6" icon={Shield} />
        <StatCard label="Overall ESG Score" value={scores?.overall} color="#3B82F6" icon={TrendingUp} />
      </div>

      <Section title="Department ESG Rankings" collapsible>
        <DataTable rows={topDepartments?.map(d => ({ department: d.name, environmental: parseFloat(d.environmental_score || 0).toFixed(1), social: parseFloat(d.social_score || 0).toFixed(1), governance: parseFloat(d.governance_score || 0).toFixed(1), total: parseFloat(d.total_score || 0).toFixed(1) }))} emptyMsg="No department scores recorded yet" />
      </Section>
    </div>
  );
}

// Custom Report Builder
function CustomReport({ departments }) {
  const [module, setModule] = useState('environmental');
  const [filters, setFilters] = useState({});
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    api.get('/gamification/challenges').then(r => setChallenges(r.data.data || [])).catch(() => {});
  }, []);

  async function runReport() {
    setLoading(true);
    try {
      const r = await api.get('/reports/custom', { params: { module, ...filters } });
      setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  return (
    <div>
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Build Your Report</p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          {/* Module select */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', marginBottom: 4 }}>Module</label>
            <select value={module} onChange={e => { setModule(e.target.value); setFilters({}); setData(null); }}
              style={{ padding: '7px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
              <option value="environmental">Environmental</option>
              <option value="social">Social</option>
              <option value="governance">Governance</option>
              <option value="gamification">Gamification</option>
            </select>
          </div>

          {/* Department filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', marginBottom: 4 }}>Department</label>
            <select value={filters.departmentId || ''} onChange={e => setFilters(f => ({ ...f, departmentId: e.target.value }))}
              style={{ padding: '7px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', marginBottom: 4 }}>From</label>
            <input type="date" value={filters.startDate || ''} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
              style={{ padding: '7px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', marginBottom: 4 }}>To</label>
            <input type="date" value={filters.endDate || ''} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
              style={{ padding: '7px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }} />
          </div>

          {module === 'gamification' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.6875rem', color: '#475569', marginBottom: 4 }}>Challenge</label>
              <select value={filters.challengeId || ''} onChange={e => setFilters(f => ({ ...f, challengeId: e.target.value }))}
                style={{ padding: '7px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, color: '#CBD5E1', fontSize: '0.8125rem', fontFamily: 'inherit' }}>
                <option value="">All Challenges</option>
                {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runReport} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#3B82F6', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Filter size={14} />}
            Generate Report
          </button>
          {data?.data?.length > 0 && (
            <button onClick={() => exportCSV(data.data, `${module}_custom_report.csv`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', background: '#10B981', border: 'none', borderRadius: 8, color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              <Download size={14} /> Export CSV
            </button>
          )}
        </div>
      </div>

      {data && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', color: '#475569' }}>
              {data.count} row{data.count !== 1 ? 's' : ''} · {module} module
            </p>
            <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#94A3B8', fontSize: '0.75rem', cursor: 'pointer' }}>
              <FileText size={12} /> Print / PDF
            </button>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
            <DataTable rows={data.data} emptyMsg="No records match your filters" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────
const REPORT_TABS = [
  { id: 'environmental', label: 'Environmental', icon: Leaf, color: '#10B981' },
  { id: 'social',        label: 'Social',        icon: Users, color: '#F59E0B' },
  { id: 'governance',    label: 'Governance',     icon: Shield, color: '#8B5CF6' },
  { id: 'summary',       label: 'ESG Summary',    icon: TrendingUp, color: '#3B82F6' },
  { id: 'custom',        label: 'Custom Builder',  icon: Filter, color: '#06B6D4' },
];

export default function Reports() {
  const [tab, setTab] = useState('environmental');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Reports</h1>
        <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: 4 }}>Environmental, Social, Governance reports and Custom Report Builder</p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {REPORT_TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 500,
              color: active ? '#F8FAFC' : '#475569',
              borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: -1,
            }}>
              <Icon size={14} style={{ color: active ? t.color : undefined }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 24 }}>
        {tab === 'environmental' && <EnvReport departments={departments} />}
        {tab === 'social'        && <SocialReport departments={departments} />}
        {tab === 'governance'    && <GovernanceReport departments={departments} />}
        {tab === 'summary'       && <SummaryReport />}
        {tab === 'custom'        && <CustomReport departments={departments} />}
      </div>
    </div>
  );
}
