// ============================================================
// EcoSphere ESG - Notifications Page
// ============================================================

import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Bell, CheckCheck, Check, Loader2,
  Trophy, AlertTriangle, CheckCircle2, AlertCircle,
  Star, Gift, FileText, Zap,
} from 'lucide-react';

const TYPE_CONFIG = {
  BADGE_UNLOCK:     { icon: Trophy, color: 'text-eco-amber', bg: 'bg-eco-amber/10' },
  COMPLIANCE_ISSUE: { icon: AlertTriangle, color: 'text-eco-rose', bg: 'bg-eco-rose/10' },
  CSR_APPROVAL:     { icon: CheckCircle2, color: 'text-eco-emerald', bg: 'bg-eco-emerald/10' },
  OVERDUE_ISSUE:    { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-600/10' },
  CHALLENGE_APPROVAL:{ icon: Zap, color: 'text-eco-blue', bg: 'bg-eco-blue/10' },
  XP_EARNED:        { icon: Star, color: 'text-eco-amber', bg: 'bg-eco-amber/10' },
  REWARD_REDEEMED:  { icon: Gift, color: 'text-eco-purple', bg: 'bg-eco-purple/10' },
  POLICY_REMINDER:  { icon: FileText, color: 'text-eco-purple', bg: 'bg-eco-purple/10' },
  GENERAL:          { icon: Bell, color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { fetchNotifications(); }, [filter]);

  async function fetchNotifications() {
    try {
      const params = { limit: 50 };
      if (filter === 'unread') params.unread = true;
      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif));
    } catch (e) { console.error(e); }
  }

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications(n => n.map(notif => ({ ...notif, is_read: true })));
    } catch (e) { console.error(e); }
    finally { setMarkingAll(false); }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayed = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-sm text-slate-400 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 disabled:opacity-50 transition-all">
            {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { label: 'All', value: 'all' },
          { label: `Unread (${unreadCount})`, value: 'unread' },
        ].map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === t.value ? 'bg-eco-emerald text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <div key={i} className="glass-card h-20 skeleton" />)}
        </div>
      ) : displayed.length > 0 ? (
        <div className="space-y-2">
          {displayed.map(notif => {
            const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.GENERAL;
            const Icon = cfg.icon;
            return (
              <div
                key={notif.id}
                className={`glass-card p-4 flex items-start gap-4 transition-all ${notif.is_read ? 'opacity-60' : 'border-white/10'}`}
              >
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm font-semibold ${notif.is_read ? 'text-slate-400' : 'text-white'}`}>{notif.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    </div>
                    {!notif.is_read && (
                      <button
                        onClick={() => markRead(notif.id)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-eco-emerald/10 text-eco-emerald hover:bg-eco-emerald/20 transition-all"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <p className="text-[10px] text-slate-600">
                      {new Date(notif.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {!notif.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-eco-emerald" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-16 text-center">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No notifications</p>
          <p className="text-slate-600 text-sm mt-1">
            {filter === 'unread' ? 'No unread notifications — you\'re all caught up!' : 'Notifications will appear here'}
          </p>
        </div>
      )}
    </div>
  );
}
