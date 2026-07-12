// ============================================================
// EcoSphere ESG - Audits & Compliance Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Scale, Plus, X, Check, Loader2, AlertTriangle, AlertCircle,
  CheckCircle2, Clock, ShieldAlert, ChevronDown, ChevronUp,
} from 'lucide-react';

const AUDIT_STATUS = {
  SCHEDULED: { color: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30', label: 'Scheduled' },
  IN_PROGRESS: { color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30', label: 'In Progress' },
  COMPLETED: { color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', label: 'Completed' },
  CANCELLED: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Cancelled' },
};

const SEVERITY = {
  LOW: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  MEDIUM: { color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30' },
  HIGH: { color: 'bg-eco-rose/20 text-eco-rose border-eco-rose/30' },
  CRITICAL: { color: 'bg-red-600/30 text-red-400 border-red-600/30' },
};

const ISSUE_STATUS = {
  OPEN: { color: 'text-eco-rose', label: 'Open' },
  IN_PROGRESS: { color: 'text-eco-amber', label: 'In Progress' },
  RESOLVED: { color: 'text-eco-emerald', label: 'Resolved' },
  CLOSED: { color: 'text-slate-400', label: 'Closed' },
};

export default function Audits() {
  const { user, isManager } = useAuth();
  const [audits, setAudits] = useState([]);
  const [issues, setIssues] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('audits');
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [auditForm, setAuditForm] = useState({ title: '', description: '', type: 'internal', scope: 'environmental', departmentId: '', scheduledDate: '' });
  const [issueForm, setIssueForm] = useState({ title: '', description: '', severity: 'MEDIUM', dueDate: '', auditId: '' });

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data.data || []));
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [audRes, issRes] = await Promise.all([
        api.get('/governance/audits'),
        api.get('/governance/issues'),
      ]);
      setAudits(audRes.data.data || []);
      setIssues(issRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreateAudit(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/governance/audits', auditForm);
      setShowAuditModal(false);
      setAuditForm({ title: '', description: '', type: 'internal', scope: 'environmental', departmentId: '', scheduledDate: '' });
      fetchData();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create audit');
    } finally { setSaving(false); }
  }

  async function handleCreateIssue(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/governance/issues', issueForm);
      setShowIssueModal(false);
      setIssueForm({ title: '', description: '', severity: 'MEDIUM', dueDate: '', auditId: '' });
      fetchData();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create issue');
    } finally { setSaving(false); }
  }

  const overdueCount = issues.filter(i => i.is_overdue).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audits & Compliance</h1>
          <p className="text-sm text-slate-400 mt-1">ESG audit management and compliance issue tracking</p>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <>
              <button onClick={() => setShowIssueModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 transition-all">
                <AlertTriangle className="w-4 h-4" /> Log Issue
              </button>
              <button onClick={() => setShowAuditModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
                <Plus className="w-4 h-4" /> New Audit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Audits', value: audits.length, color: 'text-eco-blue' },
          { label: 'In Progress', value: audits.filter(a => a.status === 'IN_PROGRESS').length, color: 'text-eco-amber' },
          { label: 'Open Issues', value: issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length, color: 'text-eco-rose' },
          { label: 'Overdue Issues', value: overdueCount, color: overdueCount > 0 ? 'text-red-400' : 'text-eco-emerald' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { label: `Audits (${audits.length})`, value: 'audits' },
          { label: `Issues (${issues.length})`, value: 'issues' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.value ? 'bg-eco-emerald text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-24 skeleton" />)}
        </div>
      ) : tab === 'audits' ? (
        <div className="space-y-3">
          {audits.map(audit => {
            const cfg = AUDIT_STATUS[audit.status] || AUDIT_STATUS.SCHEDULED;
            const isExpanded = expandedAudit === audit.id;
            return (
              <div key={audit.id} className="glass-card overflow-hidden">
                <div className="p-5 cursor-pointer flex items-start gap-4" onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}>
                  <div className="w-10 h-10 rounded-xl bg-eco-purple/10 flex items-center justify-center flex-shrink-0">
                    <Scale className="w-5 h-5 text-eco-purple" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{audit.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{audit.type?.toUpperCase()} · {audit.scope?.toUpperCase()} · {audit.dept_name || 'All Depts'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                        {audit.score && <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-eco-emerald/20 text-eco-emerald border border-eco-emerald/30">Score: {audit.score}</span>}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-600">Scheduled: {new Date(audit.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {audit.auditor_name && <span className="text-xs text-slate-600">Auditor: {audit.auditor_name}</span>}
                    </div>
                  </div>
                </div>
                {isExpanded && audit.findings && (
                  <div className="px-5 pb-5 border-t border-white/5 animate-fade-in">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Findings</p>
                    <p className="text-sm text-slate-400">{audit.findings}</p>
                  </div>
                )}
              </div>
            );
          })}
          {audits.length === 0 && <div className="glass-card p-12 text-center text-slate-600">No audits found</div>}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Issue', 'Severity', 'Status', 'Owner', 'Due Date'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.id} className={`border-b border-white/5 hover:bg-white/2 transition-colors ${issue.is_overdue ? 'bg-eco-rose/2' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        {issue.is_overdue && <AlertCircle className="w-4 h-4 text-eco-rose flex-shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-sm font-medium text-white">{issue.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">{issue.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SEVERITY[issue.severity]?.color || SEVERITY.MEDIUM.color}`}>{issue.severity}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-medium ${ISSUE_STATUS[issue.status]?.color || 'text-slate-400'}`}>{ISSUE_STATUS[issue.status]?.label || issue.status}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{issue.owner_name || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm ${issue.is_overdue ? 'text-eco-rose font-medium' : 'text-slate-400'}`}>
                        {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {issues.length === 0 && <div className="py-16 text-center text-slate-600">No compliance issues found</div>}
        </div>
      )}

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Audit</h2>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>}
            <form onSubmit={handleCreateAudit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                <input value={auditForm.title} onChange={e => setAuditForm(p => ({...p, title: e.target.value}))} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                  <select value={auditForm.type} onChange={e => setAuditForm(p => ({...p, type: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Scope</label>
                  <select value={auditForm.scope} onChange={e => setAuditForm(p => ({...p, scope: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="environmental">Environmental</option>
                    <option value="social">Social</option>
                    <option value="governance">Governance</option>
                    <option value="full">Full ESG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Department</label>
                  <select value={auditForm.departmentId} onChange={e => setAuditForm(p => ({...p, departmentId: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Scheduled Date</label>
                  <input type="date" value={auditForm.scheduledDate} onChange={e => setAuditForm(p => ({...p, scheduledDate: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAuditModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Log Compliance Issue</h2>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>}
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                <input value={issueForm.title} onChange={e => setIssueForm(p => ({...p, title: e.target.value}))} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <textarea value={issueForm.description} onChange={e => setIssueForm(p => ({...p, description: e.target.value}))} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Severity</label>
                  <select value={issueForm.severity} onChange={e => setIssueForm(p => ({...p, severity: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Due Date</label>
                  <input type="date" value={issueForm.dueDate} onChange={e => setIssueForm(p => ({...p, dueDate: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowIssueModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-eco-rose to-eco-rose-dark text-white text-sm font-medium disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} Log Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
