// ============================================================
// EcoSphere ESG - ESG Policies Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Shield, Plus, X, Check, Loader2, Clock, AlertCircle, FileText,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const CAT_CFG = {
  environmental: { color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', label: 'Environmental' },
  social: { color: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30', label: 'Social' },
  governance: { color: 'bg-eco-purple/20 text-eco-purple border-eco-purple/30', label: 'Governance' },
};

export default function Policies() {
  const { user, isManager } = useAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // all | pending | acknowledged
  const [expanded, setExpanded] = useState(null);
  const [acknowledging, setAcknowledging] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', content: '', version: '1.0', category: 'governance', requiresAck: true, reminderDays: 90,
  });

  useEffect(() => { fetchPolicies(); }, [tab]);

  async function fetchPolicies() {
    try {
      const params = {};
      if (tab === 'pending') params.acknowledged = 'false';
      if (tab === 'acknowledged') params.acknowledged = 'true';
      const res = await api.get('/governance/policies', { params });
      setPolicies(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleAcknowledge(policyId) {
    setAcknowledging(policyId);
    try {
      await api.post(`/governance/policies/${policyId}/acknowledge`, {});
      fetchPolicies();
    } catch (e) {
      alert(e.response?.data?.message || 'Could not acknowledge');
    } finally { setAcknowledging(null); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/governance/policies', form);
      setShowModal(false);
      setForm({ title: '', content: '', version: '1.0', category: 'governance', requiresAck: true, reminderDays: 90 });
      fetchPolicies();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create policy');
    } finally { setSaving(false); }
  }

  const pendingCount = policies.filter(p => p.requires_ack && !p.acknowledged_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ESG Policies</h1>
          <p className="text-sm text-slate-400 mt-1">Corporate governance policies and compliance framework</p>
        </div>
        {isManager && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> New Policy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All Policies', value: 'all' },
          { label: `Pending (${pendingCount})`, value: 'pending' },
          { label: 'Acknowledged', value: 'acknowledged' },
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
      ) : (
        <div className="space-y-3">
          {policies.map(policy => {
            const catCfg = CAT_CFG[policy.category] || CAT_CFG.governance;
            const isExpanded = expanded === policy.id;
            const needsAck = policy.requires_ack && !policy.acknowledged_at;

            return (
              <div key={policy.id} className={`glass-card overflow-hidden transition-all ${needsAck ? 'border-eco-amber/20' : ''}`}>
                <div
                  className="p-5 cursor-pointer flex items-start gap-4"
                  onClick={() => setExpanded(isExpanded ? null : policy.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-white">{policy.title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">v{policy.version} · {policy.creator_name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catCfg.color}`}>{catCfg.label}</span>
                        {needsAck && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-eco-amber/20 text-eco-amber border border-eco-amber/30">
                            Action Required
                          </span>
                        )}
                        {policy.acknowledged_at && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-eco-emerald/20 text-eco-emerald border border-eco-emerald/30">
                            ✓ Acknowledged
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    {/* Compliance bar */}
                    {policy.compliance_rate !== undefined && (
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-eco-emerald transition-all"
                            style={{ width: `${policy.compliance_rate}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-12 text-right">{policy.compliance_rate?.toFixed(0)}% compliant</span>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 animate-fade-in">
                    <p className="text-sm text-slate-400 mt-4 leading-relaxed whitespace-pre-wrap">{policy.content}</p>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <div className="text-xs text-slate-600">
                        {policy.reminder_days && `Reminder every ${policy.reminder_days} days`}
                      </div>
                      {needsAck && (
                        <button
                          onClick={() => handleAcknowledge(policy.id)}
                          disabled={acknowledging === policy.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-eco-emerald/20 text-eco-emerald text-xs font-medium hover:bg-eco-emerald/30 disabled:opacity-50 transition-all">
                          {acknowledging === policy.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Acknowledge Policy
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {policies.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <Shield className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No policies found</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New ESG Policy</h2>
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
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Content</label>
                <textarea value={form.content} onChange={e => setForm(p => ({...p, content: e.target.value}))} rows={5} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white resize-none focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Version</label>
                  <input value={form.version} onChange={e => setForm(p => ({...p, version: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="environmental">Environmental</option>
                    <option value="social">Social</option>
                    <option value="governance">Governance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Reminder (days)</label>
                  <input type="number" value={form.reminderDays} onChange={e => setForm(p => ({...p, reminderDays: e.target.value}))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.requiresAck} onChange={e => setForm(p => ({...p, requiresAck: e.target.checked}))}
                      className="w-4 h-4 rounded accent-eco-emerald" />
                    <span className="text-sm text-slate-400">Requires Acknowledgement</span>
                  </label>
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
