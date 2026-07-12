// ============================================================
// EcoSphere ESG - Emission Factors Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Globe, Search, Plus, Filter, X, Check, Loader2, Zap } from 'lucide-react';

const SOURCES = ['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'ENERGY', 'WASTE', 'OTHER'];
const SOURCE_COLORS = {
  ENERGY: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30',
  FLEET: 'bg-eco-blue/20 text-eco-blue border-eco-blue/30',
  PURCHASE: 'bg-eco-purple/20 text-eco-purple border-eco-purple/30',
  MANUFACTURING: 'bg-eco-rose/20 text-eco-rose border-eco-rose/30',
  EXPENSE: 'bg-eco-cyan/20 text-eco-cyan border-eco-cyan/30',
  WASTE: 'bg-eco-teal/20 text-eco-teal border-eco-teal/30',
  OTHER: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function Emissions() {
  const { isManager } = useAuth();
  const [factors, setFactors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', categoryId: '', source: '', unit: '', factor: '', description: '' });

  useEffect(() => {
    api.get('/environmental/categories').then(r => setCategories(r.data.data || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchFactors, 300);
    return () => clearTimeout(t);
  }, [search, sourceFilter]);

  async function fetchFactors() {
    try {
      const params = {};
      if (search) params.search = search;
      if (sourceFilter) params.source = sourceFilter;
      const res = await api.get('/environmental/emission-factors', { params });
      setFactors(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/environmental/emission-factors', form);
      setShowModal(false);
      setForm({ name: '', categoryId: '', source: '', unit: '', factor: '', description: '' });
      fetchFactors();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create emission factor');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-2xl font-bold text-white">Emission Factors</h1>
          <p className="text-sm text-slate-400 mt-1">CO₂ equivalent coefficients for carbon calculations</p>
        </div>
        {isManager && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all" style={{ flexShrink: 0 }}>
            <Plus className="w-4 h-4" /> <span>Add Factor</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div className="relative" style={{ flex: '1 1 160px', minWidth: 0 }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search factors..."
            className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-eco-emerald/50 transition-all" style={{ width: '100%' }} />
        </div>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" style={{ flex: '0 1 auto' }}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="table-responsive">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Name', 'Category', 'Source', 'Unit', 'Factor (kg CO₂e)', 'Usage'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : factors.map(f => (
                <tr key={f.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white">{f.name}</p>
                    {f.description && <p className="text-xs text-slate-600 mt-0.5">{f.description}</p>}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {f.category_icon && <span>{f.category_icon}</span>}
                      <span className="text-sm text-slate-400">{f.category_name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${SOURCE_COLORS[f.source] || SOURCE_COLORS.OTHER}`}>
                      {f.source}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">per {f.unit}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-mono font-bold text-eco-emerald">{parseFloat(f.factor).toFixed(4)}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{f.usage_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {factors.length === 0 && !loading && (
          <div className="py-16 text-center text-slate-600">No emission factors found</div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-lg p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Emission Factor</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                  <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Category</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({...p, categoryId: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Source</label>
                  <select value={form.source} onChange={e => setForm(p => ({...p, source: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                    <option value="">Select...</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unit</label>
                  <input value={form.unit} onChange={e => setForm(p => ({...p, unit: e.target.value}))} placeholder="e.g. kWh" required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Factor (kg CO₂e per unit)</label>
                  <input type="number" step="0.0001" value={form.factor} onChange={e => setForm(p => ({...p, factor: e.target.value}))} required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                  <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
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
