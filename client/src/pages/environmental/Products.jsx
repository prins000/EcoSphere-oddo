// ============================================================
// EcoSphere ESG - Product ESG Profiles Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Package, Plus, X, Check, Loader2, Search, Leaf, Recycle, Star, Edit2, Trash2 } from 'lucide-react';

const LIFECYCLE_STAGES = ['raw_material', 'manufacturing', 'distribution', 'use', 'end_of_life'];

export default function Products() {
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [emissionFactors, setEmissionFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const BLANK_FORM = { productName: '', productCode: '', emissionFactorId: '', carbonFootprint: '', recyclablePercent: '0', sustainableSource: false, ecoLabel: '', lifecycleStage: 'manufacturing', description: '' };
  const [form, setForm] = useState(BLANK_FORM);

  useEffect(() => {
    api.get('/environmental/emission-factors')
      .then(r => setEmissionFactors(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 350);
    return () => clearTimeout(t);
  }, [search]);

  async function fetchProducts() {
    try {
      const params = {};
      if (search) params.search = search;
      const r = await api.get('/environmental/products', { params });
      setProducts(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/environmental/products/${editing.id}`, form);
      } else {
        await api.post('/environmental/products', form);
      }
      setShowModal(false); setEditing(null);
      setForm(BLANK_FORM);
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save product profile');
    } finally { setSaving(false); }
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      productName: p.product_name, productCode: p.product_code,
      emissionFactorId: p.emission_factor_id || '',
      carbonFootprint: p.carbon_footprint, recyclablePercent: p.recyclable_percent || '0',
      sustainableSource: p.sustainable_source || false, ecoLabel: p.eco_label || '',
      lifecycleStage: p.lifecycle_stage || 'manufacturing', description: p.description || '',
    });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this product profile? This cannot be undone.')) return;
    setDeleting(id);
    try { await api.delete(`/environmental/products/${id}`); fetchProducts(); }
    catch (e) { alert(e.response?.data?.message || 'Could not delete'); }
    finally { setDeleting(null); }
  }

  const scoreColor = (footprint) => {
    if (footprint < 1) return '#10B981';
    if (footprint < 5) return '#F59E0B';
    return '#EF4444';
  };

  const scoreLabel = (footprint) => {
    if (footprint < 1) return 'Low Impact';
    if (footprint < 5) return 'Medium Impact';
    return 'High Impact';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Product ESG Profiles</h1>
          <p className="text-sm text-slate-400 mt-1">Track carbon footprint and sustainability attributes per product</p>
        </div>
        {isManager && (
          <button onClick={() => { setEditing(null); setForm(BLANK_FORM); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-eco-emerald to-eco-blue text-white text-sm font-medium hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> New Product
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-eco-emerald/50" />
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products.length, color: 'text-eco-blue' },
          { label: 'Sustainable Sourced', value: products.filter(p => p.sustainable_source).length, color: 'text-eco-emerald' },
          { label: 'Avg Recyclability', value: `${products.length ? (products.reduce((s, p) => s + parseFloat(p.recyclable_percent || 0), 0) / products.length).toFixed(0) : 0}%`, color: 'text-eco-amber' },
          { label: 'Avg Carbon Footprint', value: `${products.length ? (products.reduce((s, p) => s + parseFloat(p.carbon_footprint || 0), 0) / products.length).toFixed(2) : 0} tCO₂`, color: 'text-eco-rose' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-48 skeleton" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">{search ? 'No products match your search.' : 'No product ESG profiles yet.'}</p>
          {isManager && !search && (
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-eco-emerald/20 border border-eco-emerald/30 text-eco-emerald text-sm rounded-lg hover:bg-eco-emerald/30 transition-all">
              Add First Product
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="glass-card p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-eco-emerald/20 to-eco-blue/20 border border-eco-emerald/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-eco-emerald" />
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: scoreColor(p.carbon_footprint), fontSize: '0.6875rem', fontWeight: 600, background: `${scoreColor(p.carbon_footprint)}15`, padding: '3px 8px', borderRadius: 6 }}>
                    {scoreLabel(p.carbon_footprint)}
                  </span>
                  {isManager && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(p)} title="Edit" className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-white mb-0.5">{p.product_name}</h3>
              <p className="text-xs text-slate-500 mb-3">{p.product_code}</p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/4 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Carbon Footprint</p>
                  <p className="text-sm font-semibold text-white">{parseFloat(p.carbon_footprint).toFixed(2)} <span className="text-xs text-slate-500">tCO₂e</span></p>
                </div>
                <div className="bg-white/4 rounded-lg p-2.5">
                  <p className="text-xs text-slate-500">Recyclability</p>
                  <p className="text-sm font-semibold text-eco-emerald">{parseFloat(p.recyclable_percent || 0).toFixed(0)}%</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.sustainable_source && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-eco-emerald/10 text-eco-emerald border border-eco-emerald/20">
                    <Leaf className="w-3 h-3" /> Sustainable
                  </span>
                )}
                {p.eco_label && (
                  <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-eco-blue/10 text-eco-blue border border-eco-blue/20">
                    <Star className="w-3 h-3" /> {p.eco_label}
                  </span>
                )}
                {p.lifecycle_stage && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                    {p.lifecycle_stage.replace(/_/g, ' ')}
                  </span>
                )}
              </div>

              {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-white/8 rounded-2xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-semibold text-white">{editing ? 'Edit Product ESG Profile' : 'New Product ESG Profile'}</h3>
              <button onClick={() => { setShowModal(false); setEditing(null); setError(''); }} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && <p className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Product Name *</label>
                  <input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} required
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Product Code *</label>
                  <input value={form.productCode} onChange={e => setForm(f => ({ ...f, productCode: e.target.value }))} required
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Emission Factor (optional)</label>
                <select value={form.emissionFactorId} onChange={e => setForm(f => ({ ...f, emissionFactorId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-[#1F2937] border border-white/10 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-eco-emerald/50">
                  <option value="">None</option>
                  {emissionFactors.map(ef => <option key={ef.id} value={ef.id}>{ef.name} ({ef.factor} {ef.unit})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Carbon Footprint (tCO₂e) *</label>
                  <input type="number" step="0.001" min="0" value={form.carbonFootprint} onChange={e => setForm(f => ({ ...f, carbonFootprint: e.target.value }))} required
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Recyclable %</label>
                  <input type="number" min="0" max="100" step="1" value={form.recyclablePercent} onChange={e => setForm(f => ({ ...f, recyclablePercent: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Eco Label</label>
                  <input value={form.ecoLabel} onChange={e => setForm(f => ({ ...f, ecoLabel: e.target.value }))} placeholder="e.g. ISO 14001"
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50" />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Lifecycle Stage</label>
                  <select value={form.lifecycleStage} onChange={e => setForm(f => ({ ...f, lifecycleStage: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 bg-[#1F2937] border border-white/10 rounded-lg text-sm text-slate-300">
                    {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="sustainableSource" checked={form.sustainableSource} onChange={e => setForm(f => ({ ...f, sustainableSource: e.target.checked }))}
                  className="w-4 h-4 accent-eco-emerald" />
                <label htmlFor="sustainableSource" className="text-sm text-slate-300">Sustainably Sourced</label>
              </div>

              <div>
                <label className="text-xs text-slate-500 font-medium">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-eco-emerald/50 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditing(null); setError(''); }}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-sm hover:bg-white/10 transition-all">Cancel</button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-eco-emerald text-white rounded-lg text-sm font-medium hover:bg-eco-emerald/90 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editing ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
