// ============================================================
// EcoSphere ESG - Employee Participation Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Users, Clock, Star, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const STATUS_CFG = {
  SUBMITTED: { color: 'bg-eco-amber/20 text-eco-amber border-eco-amber/30', label: 'Submitted', icon: AlertCircle },
  APPROVED: { color: 'bg-eco-emerald/20 text-eco-emerald border-eco-emerald/30', label: 'Approved', icon: CheckCircle2 },
  REJECTED: { color: 'bg-eco-rose/20 text-eco-rose border-eco-rose/30', label: 'Rejected', icon: XCircle },
};

export default function Participation() {
  const { user, isManager } = useAuth();
  const [myParticipations, setMyParticipations] = useState([]);
  const [diversity, setDiversity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/social/my-participations'),
      api.get('/social/diversity-metrics'),
    ]).then(([partRes, divRes]) => {
      setMyParticipations(partRes.data.data || []);
      setDiversity(divRes.data.data || null);
    }).finally(() => setLoading(false));
  }, []);

  const totalXP = myParticipations.filter(p => p.status === 'APPROVED').reduce((s, p) => s + (p.xp_awarded || 0), 0);
  const totalHours = myParticipations.filter(p => p.status === 'APPROVED').reduce((s, p) => s + (parseFloat(p.hours_logged) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Employee Participation</h1>
        <p className="text-sm text-slate-400 mt-1">Your CSR activity history and social impact metrics</p>
      </div>

      {/* My Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Activities', value: myParticipations.length, color: 'text-eco-blue' },
          { label: 'Approved', value: myParticipations.filter(p => p.status === 'APPROVED').length, color: 'text-eco-emerald' },
          { label: 'Hours Contributed', value: `${totalHours.toFixed(0)}h`, color: 'text-eco-amber' },
          { label: 'XP Earned', value: totalXP, color: 'text-eco-purple' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participation History */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">My Participation History</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
            </div>
          ) : myParticipations.length > 0 ? (
            <div className="space-y-3">
              {myParticipations.map(p => {
                const cfg = STATUS_CFG[p.status] || STATUS_CFG.SUBMITTED;
                const Icon = cfg.icon;
                return (
                  <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/8 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-eco-emerald/10 flex items-center justify-center flex-shrink-0">
                      <Icon className={`w-5 h-5 ${cfg.color.includes('emerald') ? 'text-eco-emerald' : cfg.color.includes('amber') ? 'text-eco-amber' : 'text-eco-rose'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.activity_title || 'CSR Activity'}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500">{p.hours_logged ? `${p.hours_logged}h logged` : 'Hours pending'}</span>
                        {p.xp_awarded > 0 && <span className="text-xs text-eco-amber">+{p.xp_awarded} XP</span>}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">You haven't joined any CSR activities yet</p>
              <p className="text-slate-600 text-xs mt-1">Browse the CSR Activities page to get started</p>
            </div>
          )}
        </div>

        {/* Diversity Metrics */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Org Social Metrics</h3>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 skeleton rounded" />)}
            </div>
          ) : diversity ? (
            <div className="space-y-5">
              {/* Role Distribution */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Team Roles</p>
                <div className="space-y-2">
                  {(diversity.roleDistribution || []).map(r => (
                    <div key={r.role} className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{r.role?.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-eco-blue" style={{ width: `${Math.min(100, (r.count / (diversity.totalEmployees || 1)) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-6 text-right">{r.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                {[
                  { label: 'Total Employees', value: diversity.totalEmployees || 0 },
                  { label: 'Active Participants', value: diversity.activeParticipants || 0 },
                  { label: 'Total Volunteer Hours', value: `${parseFloat(diversity.totalVolunteerHours || 0).toFixed(0)}h` },
                  { label: 'Avg Hours / Employee', value: `${parseFloat(diversity.avgHoursPerEmployee || 0).toFixed(1)}h` },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{s.label}</span>
                    <span className="text-sm font-bold text-white">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-slate-600 text-sm text-center py-8">No metrics available</p>
          )}
        </div>
      </div>
    </div>
  );
}
