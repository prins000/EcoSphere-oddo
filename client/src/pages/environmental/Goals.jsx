// ============================================================
// EcoSphere ESG - Environmental Goals Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Target, Plus, X, Check, Loader2, TrendingUp, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  ON_TRACK: { label: 'On Track', color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', icon: TrendingUp },
  AT_RISK: { label: 'At Risk', color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30', icon: AlertTriangle },
  BEHIND: { label: 'Behind', color: 'bg-eco-rose/20 text-eco-rose border-eco-rose/30', icon: Clock },
  COMPLETED: { label: 'Completed', color: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle },
};

export default function Goals() {
  const { isManager, user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', departmentId: '', targetValue: '', unit: 'tCO2e', startDate: '', endDate: '' });

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchGoals, 300);
    return () => clearTimeout(t);
  }, [statusFilter]);

  async function fetchGoals() {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/environmental/goals', { params });
      setGoals(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/environmental/goals', form);
      setShowModal(false);
      setForm({ title: '', description: '', departmentId: '', targetValue: '', unit: 'tCO2e', startDate: '', endDate: '' });
      fetchGoals();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create goal');
    } finally { setSaving(false); }
  }

  const progress = (g) => {
    if (!g.target_value || parseFloat(g.target_value) === 0) return 0;
    return Math.min(100, (parseFloat(g.current_value) / parseFloat(g.target_value)) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Environmental Goals</h1>
          <p className="text-sm text-slate-400 mt-1">Track sustainability targets and reduction progress</p>
        </div>
        {isManager && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> New Goal
          </button>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {[{ label: 'All', value: '' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ label: v.label, value: k }))].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              statusFilter === s.value
                ? 'bg-eco-emerald text-white'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-48 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = progress(goal);
            const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.ON_TRACK;
            const Icon = cfg.icon;
            return (
              <div key={goal.id} className="glass-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{goal.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{goal.dept_name || 'All Departments'}</p>
                  </div>
                  <span className={`ml-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                    {cfg.label}
                  </span>
                </div>

                {goal.description && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{goal.description}</p>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Progress</span>
                    <span className="text-sm font-bold text-white">
                      {parseFloat(goal.current_value).toFixed(1)} / {parseFloat(goal.target_value).toFixed(1)} {goal.unit}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 100 ? 'bg-eco-blue' :
                        pct >= 70 ? 'bg-eco-emerald' :
                        pct >= 40 ? 'bg-eco-amber' : 'bg-eco-rose'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-slate-600 mt-1">{pct.toFixed(0)}%</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-xs text-slate-600">
                    {new Date(goal.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} →{' '}
                    {new Date(goal.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {goals.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No goals found for this filter</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Environmental Goal</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
                <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Department</label>
                  <select value={form.departmentId} onChange={e => setForm(p => ({...p, departmentId: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">Select...</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({...p, unit: e.target.value}))} placeholder="tCO2e"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Value</label>
                  <input type="number" value={form.targetValue} onChange={e => setForm(p => ({...p, targetValue: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div />
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">End Date</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(p => ({...p, endDate: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
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
    </div>
  );
}
