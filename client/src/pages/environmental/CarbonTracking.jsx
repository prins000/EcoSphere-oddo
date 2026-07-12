// ============================================================
// EcoSphere ESG - Carbon Tracking Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Leaf, Plus, X, Check, Loader2, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#06B6D4'];
const SOURCES = ['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'ENERGY', 'WASTE', 'OTHER'];

const SOURCE_COLORS = {
  ENERGY: 'bg-eco-amber/20 text-eco-amber', FLEET: 'bg-eco-blue/20 text-eco-blue',
  PURCHASE: 'bg-eco-purple/20 text-eco-purple', MANUFACTURING: 'bg-eco-rose/20 text-eco-rose',
  EXPENSE: 'bg-eco-cyan/20 text-eco-cyan', WASTE: 'bg-eco-teal/20 text-eco-teal',
  OTHER: 'bg-slate-500/20 text-slate-400',
};

export default function CarbonTracking() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [sourceFilter, setSourceFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    emissionFactorId: '', source: '', quantity: '', description: '', transactionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    Promise.all([
      api.get('/environmental/emission-factors'),
      api.get('/departments'),
    ]).then(([efRes, deptRes]) => {
      setEmissionFactors(efRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, sourceFilter]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const params = { page, limit: 15 };
      if (sourceFilter) params.source = sourceFilter;
      const [txRes, sumRes] = await Promise.all([
        api.get('/environmental/carbon', { params }),
        api.get('/environmental/carbon/summary'),
      ]);
      setTransactions(txRes.data.data || []);
      setPagination(txRes.data.pagination || {});
      setSummary(sumRes.data.data || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/environmental/carbon', form);
      setShowModal(false);
      setForm({ emissionFactorId: '', source: '', quantity: '', description: '', transactionDate: new Date().toISOString().split('T')[0] });
      fetchTransactions();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to log transaction');
    } finally { setSaving(false); }
  }

  const bySource = summary?.bySource || [];
  const monthly = summary?.monthly || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Carbon Tracking</h1>
          <p className="text-sm text-slate-400 mt-1">Log and monitor carbon emissions by source</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" /> Log Emission
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total This Month', value: `${(parseFloat(summary.currentMonthKg || 0) / 1000).toFixed(2)} tCO₂`, color: 'text-eco-rose' },
            { label: 'Total Transactions', value: summary.totalTransactions || 0, color: 'text-eco-blue' },
            { label: 'Top Source', value: bySource[0]?.source || '—', color: 'text-eco-amber' },
            { label: 'Avg per Log', value: `${((parseFloat(summary.currentMonthKg || 0)) / Math.max(summary.totalTransactions || 1, 1)).toFixed(0)} kg`, color: 'text-eco-emerald' },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {monthly.length > 0 && (
          <div className="lg:col-span-2 glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Monthly Carbon Trend (tCO₂)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthly.map(m => ({ ...m, carbon_tonnes: (parseFloat(m.carbon_kg) / 1000).toFixed(2) }))}>
                <defs>
                  <linearGradient id="carbonGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="month" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#E2E8F0' }} />
                <Area type="monotone" dataKey="carbon_tonnes" stroke="#10B981" strokeWidth={2} fill="url(#carbonGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {bySource.length > 0 && (
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">By Source</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bySource} dataKey="carbon_kg" nameKey="source" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                  {bySource.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1E293B', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8, color: '#E2E8F0' }} formatter={(v) => [`${parseFloat(v).toFixed(0)} kg`, 'Carbon']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {bySource.slice(0, 4).map((s, i) => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-400">{s.source}</span>
                  </div>
                  <span className="text-slate-500">{parseFloat(s.carbon_kg).toFixed(0)} kg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters + Table */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-500" />
        <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Date', 'Description', 'Source', 'Quantity', 'Carbon (kg)', 'Logged By'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {[...Array(6)].map((_, j) => <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : transactions.map(tx => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4 text-sm text-slate-400">
                    {new Date(tx.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-white">{tx.description || '—'}</p>
                    <p className="text-xs text-slate-600">{tx.factor_name}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SOURCE_COLORS[tx.source] || SOURCE_COLORS.OTHER}`}>{tx.source}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{parseFloat(tx.quantity).toLocaleString()} {tx.unit}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-eco-emerald">{parseFloat(tx.carbon_kg).toFixed(2)}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500">{tx.user_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && !loading && (
          <div className="py-16 text-center text-slate-600">No transactions found</div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 disabled:opacity-30 transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Emission Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Log Carbon Emission</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Emission Factor</label>
                <select value={form.emissionFactorId} onChange={e => {
                  const ef = emissionFactors.find(f => f.id === e.target.value);
                  setForm(p => ({ ...p, emissionFactorId: e.target.value, source: ef?.source || '' }));
                }} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all">
                  <option value="">Select...</option>
                  {emissionFactors.map(ef => <option key={ef.id} value={ef.id}>{ef.name} ({ef.factor} kg CO₂/{ef.unit})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Quantity</label>
                <input type="number" step="0.01" value={form.quantity} onChange={e => setForm(p => ({...p, quantity: e.target.value}))} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Transaction Date</label>
                <input type="date" value={form.transactionDate} onChange={e => setForm(p => ({...p, transactionDate: e.target.value}))} required
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50 transition-all" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
