// ============================================================
// EcoSphere ESG - CSR Activities Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  HandHeart, Plus, X, Check, Loader2, Users, Clock, MapPin,
  Star, ChevronRight, Calendar,
} from 'lucide-react';

const STATUS_CFG = {
  DRAFT: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Draft' },
  SUBMITTED: { color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30', label: 'Pending' },
  APPROVED: { color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', label: 'Approved' },
  REJECTED: { color: 'bg-eco-rose/20 text-eco-rose border-eco-rose/30', label: 'Rejected' },
  COMPLETED: { color: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30', label: 'Completed' },
};

export default function CSRActivities() {
  const { user, isManager } = useAuth();
  const [activities, setActivities] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joining, setJoining] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', categoryId: '', departmentId: '',
    hoursRequired: '', maxParticipants: '', xpReward: 100,
    startDate: '', endDate: '', location: '', impactMetric: '', impactValue: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/environmental/categories'),
      api.get('/departments'),
    ]).then(([catRes, deptRes]) => {
      setCategories(catRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchActivities, 300);
    return () => clearTimeout(t);
  }, [statusFilter]);

  async function fetchActivities() {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/social/csr', { params });
      setActivities(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/social/csr', form);
      setShowModal(false);
      setForm({ title: '', description: '', categoryId: '', departmentId: '', hoursRequired: '', maxParticipants: '', xpReward: 100, startDate: '', endDate: '', location: '', impactMetric: '', impactValue: '' });
      fetchActivities();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create activity');
    } finally { setSaving(false); }
  }

  async function handleJoin(activityId) {
    setJoining(activityId);
    try {
      await api.post(`/social/csr/${activityId}/participate`, {});
      fetchActivities();
    } catch (e) {
      alert(e.response?.data?.message || 'Could not join activity');
    } finally { setJoining(null); }
  }

  async function handleApprove(activityId) {
    try {
      await api.patch(`/social/csr/${activityId}/status`, { status: 'APPROVED' });
      fetchActivities();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CSR Activities</h1>
          <p className="text-sm text-slate-400 mt-1">Corporate social responsibility programs and volunteering</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" /> New Activity
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {[{ label: 'All', value: '' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ label: v.label, value: k }))].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s.value ? 'bg-eco-emerald text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-56 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map(act => {
            const cfg = STATUS_CFG[act.status] || STATUS_CFG.DRAFT;
            const isFull = act.max_participants && act.participant_count >= act.max_participants;
            return (
              <div key={act.id} className="glass-card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{act.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{act.category_name || 'General'} · {act.dept_name || 'All Depts'}</p>
                  </div>
                  <span className={`ml-3 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                </div>

                <p className="text-xs text-slate-500 mb-4 line-clamp-2 flex-1">{act.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-sm font-bold text-white">{act.xp_reward}</p>
                    <p className="text-[10px] text-slate-600">XP</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-sm font-bold text-white">{act.hours_required || '—'}</p>
                    <p className="text-[10px] text-slate-600">Hours</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <p className="text-sm font-bold text-white">{act.participant_count || 0}{act.max_participants ? `/${act.max_participants}` : ''}</p>
                    <p className="text-[10px] text-slate-600">Joined</p>
                  </div>
                </div>

                {act.location && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3" /> {act.location}
                  </div>
                )}

                {act.start_date && (
                  <div className="flex items-center gap-1 text-xs text-slate-500 mb-4">
                    <Calendar className="w-3 h-3" />
                    {new Date(act.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}

                <div className="flex gap-2 mt-auto">
                  {act.status === 'APPROVED' && (
                    act.my_status ? (
                      <button disabled
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium opacity-50 cursor-not-allowed">
                        <Check className="w-3 h-3" /> Already Registered
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoin(act.id)}
                        disabled={isFull || joining === act.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-eco-emerald/20 text-eco-emerald text-xs font-medium hover:bg-eco-emerald/30 disabled:opacity-40 transition-all">
                        {joining === act.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <HandHeart className="w-3 h-3" />}
                        {isFull ? 'Full' : 'Participate'}
                      </button>
                    )
                  )}
                  {isManager && act.status === 'SUBMITTED' && (
                    <button onClick={() => handleApprove(act.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-eco-blue/20 text-eco-blue text-xs font-medium hover:bg-eco-blue/30 transition-all">
                      <Check className="w-3 h-3" /> Approve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activities.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <HandHeart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No CSR activities found</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New CSR Activity</h2>
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
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({...p, categoryId: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">Select...</option>
                    {categories.filter(c => c.type === 'social').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Department</label>
                  <select value={form.departmentId} onChange={e => setForm(p => ({...p, departmentId: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Hours Required</label>
                  <input type="number" value={form.hoursRequired} onChange={e => setForm(p => ({...p, hoursRequired: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">XP Reward</label>
                  <input type="number" value={form.xpReward} onChange={e => setForm(p => ({...p, xpReward: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(p => ({...p, startDate: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Location</label>
                  <input value={form.location} onChange={e => setForm(p => ({...p, location: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
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
