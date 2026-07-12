// ============================================================
// EcoSphere ESG - Challenges Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Trophy, Plus, X, Check, Loader2, Users, Target, Zap, Clock, Star, ChevronRight } from 'lucide-react';

const STATUS_CFG = {
  DRAFT:        { color: 'bg-slate-700/40 text-slate-300 border-slate-600/30', label: 'Draft' },
  UPCOMING:     { color: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30', label: 'Upcoming' },
  ACTIVE:       { color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', label: 'Active' },
  UNDER_REVIEW: { color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30', label: 'Under Review' },
  COMPLETED:    { color: 'bg-eco-purple/20 text-eco-purple border-eco-purple/30', label: 'Completed' },
  CANCELLED:    { color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', label: 'Cancelled' },
  ARCHIVED:     { color: 'bg-slate-800/40 text-slate-500 border-slate-700/30', label: 'Archived' },
};

// Valid transitions for manager
const TRANSITIONS = {
  DRAFT:        ['ACTIVE', 'ARCHIVED'],
  UPCOMING:     ['ACTIVE', 'CANCELLED', 'ARCHIVED'],
  ACTIVE:       ['UNDER_REVIEW', 'COMPLETED', 'CANCELLED', 'ARCHIVED'],
  UNDER_REVIEW: ['COMPLETED', 'ACTIVE', 'CANCELLED', 'ARCHIVED'],
  COMPLETED:    ['ARCHIVED'],
  CANCELLED:    ['ARCHIVED'],
  ARCHIVED:     [],
};

const TYPE_CFG = {
  environmental: 'from-eco-emerald to-eco-teal',
  social: 'from-eco-blue to-eco-cyan',
  governance: 'from-eco-purple to-eco-blue',
};

export default function Challenges() {
  const { user, isManager } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [joining, setJoining] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [progressInputs, setProgressInputs] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', type: 'environmental', xpReward: 100, targetValue: '', unit: '',
    startDate: '', endDate: '', maxParticipants: '',
  });

  useEffect(() => {
    const t = setTimeout(fetchChallenges, 300);
    return () => clearTimeout(t);
  }, [statusFilter]);

  async function fetchChallenges() {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/gamification/challenges', { params });
      setChallenges(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleJoin(challengeId) {
    setJoining(challengeId);
    try {
      await api.post(`/gamification/challenges/${challengeId}/join`, {});
      fetchChallenges();
    } catch (e) {
      alert(e.response?.data?.message || 'Could not join challenge');
    } finally { setJoining(null); }
  }

  async function handleUpdateProgress(challengeId) {
    const progress = progressInputs[challengeId];
    if (!progress) return;
    setUpdating(challengeId);
    try {
      await api.patch(`/gamification/challenges/${challengeId}/progress`, { progress: parseFloat(progress) });
      setProgressInputs(p => ({ ...p, [challengeId]: '' }));
      fetchChallenges();
    } catch (e) {
      alert(e.response?.data?.message || 'Could not update progress');
    } finally { setUpdating(null); }
  }

  const [saveAsDraft, setSaveAsDraft] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form };
      if (saveAsDraft) payload.status = 'DRAFT';
      await api.post('/gamification/challenges', payload);
      setShowModal(false); setSaveAsDraft(false);
      setForm({ title: '', description: '', type: 'environmental', xpReward: 100, targetValue: '', unit: '', startDate: '', endDate: '', maxParticipants: '' });
      fetchChallenges();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create challenge');
    } finally { setSaving(false); setSaveAsDraft(false); }
  }

  async function handleStatusChange(challengeId, newStatus) {
    try {
      await api.put(`/gamification/challenges/${challengeId}/status`, { status: newStatus });
      fetchChallenges();
    } catch (e) {
      alert(e.response?.data?.message || 'Status change failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Challenges</h1>
          <p className="text-sm text-slate-400 mt-1">Join ESG challenges, track progress, and earn XP rewards</p>
        </div>
        {isManager && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-amber to-eco-rose text-white text-sm font-medium hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> New Challenge
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {[{ label: 'All', value: '' }, ...Object.entries(STATUS_CFG).map(([k, v]) => ({ label: v.label, value: k }))].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === s.value ? 'bg-eco-amber text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="glass-card h-64 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(ch => {
            const cfg = STATUS_CFG[ch.status] || STATUS_CFG.ACTIVE;
            const grad = TYPE_CFG[ch.type] || TYPE_CFG.environmental;
            const pct = ch.target_value ? Math.min(100, ((ch.my_progress || 0) / parseFloat(ch.target_value)) * 100) : 0;
            const hasJoined = !!ch.my_progress !== undefined && ch.participant_count > 0 && ch.my_status;

            return (
              <div key={ch.id} className="glass-card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center flex-shrink-0`}>
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-eco-amber/20 text-eco-amber border border-eco-amber/30">
                      {ch.xp_reward} XP
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-semibold text-white mb-1">{ch.title}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 flex-1">{ch.description}</p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-white">{ch.participant_count || 0}</p>
                    <p className="text-[10px] text-slate-600">Joined</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-white">{parseFloat(ch.target_value || 0).toFixed(0)}</p>
                    <p className="text-[10px] text-slate-600">{ch.unit || 'Target'}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-sm font-bold text-white">
                      {ch.end_date ? Math.max(0, Math.ceil((new Date(ch.end_date) - new Date()) / 86400000)) : '∞'}
                    </p>
                    <p className="text-[10px] text-slate-600">Days Left</p>
                  </div>
                </div>

                {/* My progress */}
                {ch.my_status && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">My Progress</span>
                      <span className="text-xs font-bold text-white">{ch.my_progress || 0} / {ch.target_value} {ch.unit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-auto">
                  {ch.status === 'ACTIVE' && !ch.my_status && (
                    <button onClick={() => handleJoin(ch.id)} disabled={joining === ch.id}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-eco-amber/20 text-eco-amber text-xs font-medium hover:bg-eco-amber/30 disabled:opacity-40 transition-all">
                      {joining === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Join Challenge
                    </button>
                  )}
                  {ch.status === 'ACTIVE' && ch.my_status && !ch.my_completed && (
                    <>
                      <button disabled className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-slate-400 text-xs font-medium opacity-50 cursor-not-allowed">
                        <Check className="w-3 h-3" /> Participated
                      </button>
                      <div className="flex gap-2 w-full">
                        <input
                          type="number"
                          value={progressInputs[ch.id] || ''}
                          onChange={e => setProgressInputs(p => ({ ...p, [ch.id]: e.target.value }))}
                          placeholder={`Progress (${ch.unit})`}
                          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-eco-amber/50 transition-all"
                        />
                        <button onClick={() => handleUpdateProgress(ch.id)} disabled={updating === ch.id || !progressInputs[ch.id]}
                          className="px-3 py-2 rounded-lg bg-eco-amber/20 text-eco-amber text-xs font-medium hover:bg-eco-amber/30 disabled:opacity-40 transition-all">
                          {updating === ch.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                      </div>
                    </>
                  )}
                  {ch.my_completed && (
                    <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-eco-emerald/10 text-eco-emerald text-xs font-medium">
                      <Star className="w-3 h-3" /> Completed!
                    </div>
                  )}
                </div>

                {/* Badge reward */}
                {ch.badge_name && (
                  <p className="text-[10px] text-slate-600 mt-2 text-center">
                    🏅 Earn badge: <span className="text-slate-500">{ch.badge_name}</span>
                  </p>
                )}

                {/* Manager lifecycle controls */}
                {isManager && TRANSITIONS[ch.status]?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-slate-600 mb-1.5 font-medium">Move to:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {TRANSITIONS[ch.status].map(next => {
                        const nextCfg = STATUS_CFG[next];
                        return (
                          <button key={next} onClick={() => handleStatusChange(ch.id, next)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border transition-all hover:opacity-80 ${nextCfg?.color}`}>
                            <ChevronRight className="w-2.5 h-2.5" /> {nextCfg?.label || next}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {challenges.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No challenges found</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Challenge</h2>
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
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({...p, type: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="environmental">Environmental</option>
                    <option value="social">Social</option>
                    <option value="governance">Governance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">XP Reward</label>
                  <input type="number" value={form.xpReward} onChange={e => setForm(p => ({...p, xpReward: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Target Value</label>
                  <input type="number" value={form.targetValue} onChange={e => setForm(p => ({...p, targetValue: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({...p, unit: e.target.value}))} placeholder="days, km, %" required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
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
                  className="py-2.5 px-4 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">Cancel</button>
                <button type="button" disabled={saving} onClick={() => {
                    setSaveAsDraft(true);
                    setTimeout(() => document.getElementById('challengeSubmit').click(), 0);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-all">
                  Save as Draft
                </button>
                <button id="challengeSubmit" type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-eco-amber to-eco-rose text-white text-sm font-medium disabled:opacity-50 transition-all">
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
