// ============================================================
// EcoSphere ESG - Settings Page
// 4 tabs: Account, Categories, ESG Config, Notifications
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Settings, User, Tag, Sliders, Bell, Plus, X, Check,
  Loader2, Save, Trash2, Edit2, Shield,
} from 'lucide-react';

const TABS = [
  { id: 'account',       label: 'Account',        icon: User },
  { id: 'categories',    label: 'Categories',      icon: Tag },
  { id: 'esg-config',    label: 'ESG Config',      icon: Sliders },
  { id: 'notifications', label: 'Notifications',   icon: Bell },
];

const CAT_TYPES = ['environmental', 'csr_activity', 'challenge', 'governance', 'other'];

// ── Small helpers ─────────────────────────────────────────────
function Toggle({ value, onChange, label, description }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#E2E8F0' }}>{label}</p>
        {description && <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? '#10B981' : 'rgba(255,255,255,0.1)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
    </div>
  );
}

function WeightInput({ label, value, onChange, color }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.875rem', color: '#94A3B8' }}>{label}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color }}>{value}%</span>
      </div>
      <input
        type="range" min="0" max="100" step="1" value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: color }}
      />
    </div>
  );
}

// ── Account Tab ───────────────────────────────────────────────
function AccountTab({ user }) {
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #10B981, #3B82F6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.25rem', fontWeight: 700, color: 'white',
        }}>
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC' }}>{user?.firstName} {user?.lastName}</p>
          <p style={{ fontSize: '0.8125rem', color: '#475569', marginTop: 2 }}>{user?.email}</p>
          <span style={{
            display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 6,
            background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '0.6875rem', fontWeight: 600,
          }}>
            {user?.role?.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div style={{ paddingTop: 20 }}>
        {[
          { label: 'Full Name', value: `${user?.firstName} ${user?.lastName}` },
          { label: 'Email Address', value: user?.email },
          { label: 'Role', value: user?.role?.replace(/_/g, ' ') },
          { label: 'Department', value: user?.departmentId ? `Dept ID: ${user.departmentId}` : 'Global' },
          { label: 'XP Balance', value: `${(user?.xp || 0).toLocaleString()} XP` },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ fontSize: '0.8125rem', color: '#475569' }}>{f.label}</span>
            <span style={{ fontSize: '0.8125rem', color: '#E2E8F0', fontWeight: 500 }}>{f.value || '—'}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} style={{ color: '#3B82F6' }} />
          <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
            Password changes are managed through your system administrator. Contact your ESG Manager to update your role or department assignment.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Categories Tab ────────────────────────────────────────────
function CategoriesTab({ isManager }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'environmental', description: '', icon: '📋', color: '#10B981' });
  const [error, setError] = useState('');

  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    try {
      const r = await api.get('/categories');
      setCategories(r.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function openEdit(cat) {
    setEditing(cat);
    setForm({ name: cat.name, type: cat.type, description: cat.description || '', icon: cat.icon || '📋', color: cat.color || '#10B981' });
    setShowModal(true);
  }

  function openNew() {
    setEditing(null);
    setForm({ name: '', type: 'environmental', description: '', icon: '📋', color: '#10B981' });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
      } else {
        await api.post('/categories', form);
      }
      setShowModal(false);
      fetchCategories();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save category');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (e) { alert(e.response?.data?.message || 'Could not delete'); }
    finally { setDeleting(null); }
  }

  const grouped = CAT_TYPES.reduce((acc, t) => {
    acc[t] = categories.filter(c => c.type === t);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <p style={{ fontSize: '0.875rem', color: '#475569' }}>{categories.length} categories across {Object.values(grouped).filter(g => g.length).length} types</p>
        {isManager && (
          <button onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10B981', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> New Category
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} className="skeleton" />)}
        </div>
      ) : (
        CAT_TYPES.map(type => grouped[type].length === 0 ? null : (
          <div key={type} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {type.replace(/_/g, ' ')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {grouped[type].map(cat => (
                <div key={cat.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: '#E2E8F0' }}>{cat.name}</span>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: cat.color || '#64748B', flexShrink: 0,
                  }} />
                  {cat.description && <span style={{ fontSize: '0.75rem', color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</span>}
                  {isManager && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(cat)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, display: 'flex' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} disabled={!!deleting} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4, display: 'flex', opacity: deleting === cat.id ? 0.5 : 1 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC' }}>{editing ? 'Edit Category' : 'New Category'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <p style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, color: '#EF4444', fontSize: '0.8125rem' }}>{error}</p>}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  style={{ width: '100%', marginTop: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F8FAFC', fontSize: '0.875rem', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required
                  style={{ width: '100%', marginTop: 6, padding: '8px 12px', background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F8FAFC', fontSize: '0.875rem', fontFamily: 'inherit' }}>
                  {CAT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>Icon (emoji)</label>
                  <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4}
                    style={{ width: '100%', marginTop: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F8FAFC', fontSize: '1rem', textAlign: 'center', fontFamily: 'inherit' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>Color</label>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    style={{ width: '100%', marginTop: 6, height: 38, padding: 4, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, cursor: 'pointer' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  style={{ width: '100%', marginTop: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F8FAFC', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#94A3B8', cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 18px', background: '#10B981', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {editing ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ESG Config Tab ────────────────────────────────────────────
function ESGConfigTab({ isAdmin }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [envW, setEnvW] = useState(40);
  const [socW, setSocW] = useState(30);
  const [govW, setGovW] = useState(30);
  const [toggles, setToggles] = useState({ autoEmissionCalc: false, evidenceRequired: false, badgeAutoAward: true });

  useEffect(() => {
    api.get('/settings').then(r => {
      const s = r.data.data;
      setSettings(s);
      setEnvW(parseFloat(s.env_weight));
      setSocW(parseFloat(s.social_weight));
      setGovW(parseFloat(s.governance_weight));
      setToggles({ autoEmissionCalc: s.auto_emission_calc, evidenceRequired: s.evidence_required, badgeAutoAward: s.badge_auto_award });
    }).finally(() => setLoading(false));
  }, []);

  const total = envW + socW + govW;

  async function handleSave() {
    if (Math.abs(total - 100) > 0.1) return;
    setSaving(true);
    try {
      await api.put('/settings', {
        envWeight: envW, socialWeight: socW, governanceWeight: govW,
        autoEmissionCalc: toggles.autoEmissionCalc,
        evidenceRequired: toggles.evidenceRequired,
        badgeAutoAward: toggles.badgeAutoAward,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ height: 200 }} className="skeleton rounded-xl" />;

  return (
    <div style={{ maxWidth: 540 }}>
      {/* ESG Weights */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>ESG Score Weights</h3>
        <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 20 }}>Weights must sum to 100%. Currently: {total}%</p>
        <WeightInput label="Environmental" value={envW} onChange={setEnvW} color="#10B981" />
        <WeightInput label="Social" value={socW} onChange={setSocW} color="#F59E0B" />
        <WeightInput label="Governance" value={govW} onChange={setGovW} color="#8B5CF6" />
        {Math.abs(total - 100) > 0.1 && (
          <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: -8 }}>⚠ Weights must sum to exactly 100 (current: {total})</p>
        )}
      </div>

      {/* Feature Toggles */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 16 }}>Feature Toggles</h3>
        <Toggle label="Auto Emission Calculation" value={toggles.autoEmissionCalc} onChange={v => setToggles(t => ({ ...t, autoEmissionCalc: v }))}
          description="Automatically calculate carbon from Purchase/Manufacturing/Expense/Fleet records using emission factors" />
        <Toggle label="Evidence Required for CSR" value={toggles.evidenceRequired} onChange={v => setToggles(t => ({ ...t, evidenceRequired: v }))}
          description="CSR participation cannot be approved without an attached proof file" />
        <Toggle label="Badge Auto-Award" value={toggles.badgeAutoAward} onChange={v => setToggles(t => ({ ...t, badgeAutoAward: v }))}
          description="Automatically award badges when an employee satisfies the unlock rule — no manual admin action needed" />
      </div>

      <button onClick={handleSave} disabled={saving || Math.abs(total - 100) > 0.1} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
        background: saved ? '#10B981' : '#3B82F6', border: 'none', borderRadius: 10,
        color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
        opacity: (saving || Math.abs(total - 100) > 0.1) ? 0.6 : 1, transition: 'all 0.2s',
      }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? 'Saved!' : 'Save Configuration'}
      </button>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────
function NotificationsTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notifs, setNotifs] = useState({
    notifyCompliance: true, notifyCsrApproval: true,
    notifyPolicyReminder: true, notifyBadgeUnlock: true, notifyChallenge: true,
  });

  useEffect(() => {
    api.get('/settings').then(r => {
      const s = r.data.data;
      setSettings(s);
      setNotifs({
        notifyCompliance: s.notify_compliance,
        notifyCsrApproval: s.notify_csr_approval,
        notifyPolicyReminder: s.notify_policy_reminder,
        notifyBadgeUnlock: s.notify_badge_unlock,
        notifyChallenge: s.notify_challenge,
      });
    }).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put('/settings', notifs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('Save failed'); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ height: 200 }} className="skeleton rounded-xl" />;

  const items = [
    { key: 'notifyCompliance', label: 'New Compliance Issue', description: 'Notify when a new compliance issue is raised' },
    { key: 'notifyCsrApproval', label: 'CSR & Challenge Decisions', description: 'Notify on approval or rejection of CSR/challenge submissions' },
    { key: 'notifyPolicyReminder', label: 'Policy Acknowledgement Reminders', description: 'Remind employees about unacknowledged policies' },
    { key: 'notifyBadgeUnlock', label: 'Badge Unlocks', description: 'Notify when a badge is automatically awarded' },
    { key: 'notifyChallenge', label: 'Challenge Updates', description: 'Notify on challenge status changes and progress milestones' },
  ];

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#F8FAFC', marginBottom: 4 }}>In-App Notification Events</h3>
        <p style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 20 }}>Choose which events trigger in-app notifications for your team</p>
        {items.map(item => (
          <Toggle key={item.key} label={item.label} description={item.description}
            value={notifs[item.key]} onChange={v => setNotifs(n => ({ ...n, [item.key]: v }))} />
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
        background: saved ? '#10B981' : '#3B82F6', border: 'none', borderRadius: 10,
        color: 'white', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
      }}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
        {saved ? 'Saved!' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, isManager } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [tab, setTab] = useState('account');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ fontSize: '0.875rem', color: '#475569', marginTop: 4 }}>Account preferences, categories, ESG configuration, and notifications</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              color: tab === t.id ? '#F8FAFC' : '#475569',
              borderBottom: tab === t.id ? '2px solid #10B981' : '2px solid transparent',
              transition: 'all 0.15s', marginBottom: -1,
            }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === 'account'       && <AccountTab user={user} />}
        {tab === 'categories'    && <CategoriesTab isManager={isManager || isAdmin} />}
        {tab === 'esg-config'    && <ESGConfigTab isAdmin={isAdmin || isManager} />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
}
