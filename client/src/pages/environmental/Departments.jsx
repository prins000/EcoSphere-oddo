// ============================================================
// EcoSphere ESG - Departments Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Factory, Search, Plus, Users, Leaf, Target, HandHeart,
  ChevronRight, X, Check, Loader2,
} from 'lucide-react';

export default function Departments() {
  const { isManager } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => { fetchDepts(); }, []);

  async function fetchDepts() {
    try {
      const params = {};
      if (search) params.search = search;
      const res = await api.get('/departments', { params });
      setDepartments(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(fetchDepts, 400);
    return () => clearTimeout(t);
  }, [search]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/departments', form);
      setShowModal(false);
      setForm({ name: '', code: '', description: '' });
      fetchDepts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create department');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Departments</h1>
          <p className="text-sm text-slate-400 mt-1">Manage organizational units and their ESG performance</p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg hover:shadow-eco-emerald/20 transition-all"
          >
            <Plus className="w-4 h-4" /> New Department
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search departments..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-eco-emerald/50 transition-all"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-44 skeleton" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(dept => (
            <div key={dept.id} className="glass-card p-5 group cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eco-emerald/20 to-eco-blue/20 border border-eco-emerald/20 flex items-center justify-center">
                  <Factory className="w-5 h-5 text-eco-emerald" />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  dept.is_active
                    ? 'bg-eco-emerald/10 text-eco-emerald border-eco-emerald/20'
                    : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                }`}>
                  {dept.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h3 className="text-base font-semibold text-white mb-0.5">{dept.name}</h3>
              <p className="text-xs text-slate-500 mb-4">{dept.code}</p>
              {dept.description && (
                <p className="text-xs text-slate-500 mb-4 line-clamp-2">{dept.description}</p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
                {[
                  { icon: Users, val: dept.user_count || 0, label: 'Members' },
                  { icon: Leaf, val: dept.carbon_count || 0, label: 'Logs' },
                  { icon: Target, val: dept.goal_count || 0, label: 'Goals' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <p className="text-sm font-bold text-white">{s.val}</p>
                    <p className="text-[10px] text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {departments.length === 0 && !loading && (
        <div className="glass-card p-12 text-center">
          <Factory className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No departments found</p>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card w-full max-w-md p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Department</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-eco-rose/10 border border-eco-rose/20 text-eco-rose text-sm">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: 'name', label: 'Department Name', placeholder: 'e.g. Engineering' },
                { key: 'code', label: 'Code (3-5 chars)', placeholder: 'e.g. ENG' },
                { key: 'description', label: 'Description (optional)', placeholder: 'Brief description...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    required={f.key !== 'description'}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-eco-emerald/50 transition-all"
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
