// ============================================================
// EcoSphere ESG - Leaderboard Page
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Sparkles, Trophy, Star, Gift, Loader2, Check } from 'lucide-react';

const PODIUM_CFG = [
  { pos: 2, size: 'h-20', color: 'from-slate-400 to-slate-500', crown: '🥈' },
  { pos: 1, size: 'h-28', color: 'from-eco-amber to-yellow-500', crown: '🥇' },
  { pos: 3, size: 'h-16', color: 'from-amber-700 to-amber-800', crown: '🥉' },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('individual');
  const [leaderboard, setLeaderboard] = useState([]);
  const [deptLeaderboard, setDeptLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(null);
  const [myXP, setMyXP] = useState(0);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [lbRes, deptRes, badgeRes, rewardRes, profileRes] = await Promise.all([
        api.get('/gamification/leaderboard?type=individual'),
        api.get('/gamification/leaderboard?type=department'),
        api.get('/gamification/badges'),
        api.get('/gamification/rewards'),
        api.get('/auth/me'),
      ]);
      setLeaderboard(lbRes.data.data || []);
      setDeptLeaderboard(deptRes.data.data || []);
      setBadges(badgeRes.data.data || []);
      setRewards(rewardRes.data.data || []);
      setMyXP(profileRes.data.data?.xp || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleRedeem(rewardId) {
    setRedeeming(rewardId);
    try {
      await api.post(`/gamification/rewards/${rewardId}/redeem`, {});
      alert('Reward redeemed! Check with HR for pickup.');
      fetchAll();
    } catch (e) {
      alert(e.response?.data?.message || 'Could not redeem');
    } finally { setRedeeming(null); }
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getInitials = (u) => `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-sm text-slate-400 mt-1">Top ESG performers, badges, and rewards</p>
      </div>

      {/* My XP */}
      <div className="glass-card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-eco-amber to-eco-rose flex items-center justify-center">
          <Star className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-500">My XP Balance</p>
          <p className="text-2xl font-bold text-white">{myXP.toLocaleString()} <span className="text-sm text-eco-amber font-normal">XP</span></p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { label: 'Individual', value: 'individual' },
          { label: 'Department', value: 'department' },
          { label: 'Badges', value: 'badges' },
          { label: 'Rewards Store', value: 'rewards' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t.value ? 'bg-gradient-to-r from-eco-amber to-eco-rose text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="glass-card h-16 skeleton" />)}
        </div>
      ) : tab === 'individual' ? (
        <div className="space-y-4">
          {/* Podium */}
          {top3.length >= 1 && (
            <div className="glass-card p-6">
              <div className="flex items-end justify-center gap-4">
                {PODIUM_CFG.map(({ pos, size, color, crown }) => {
                  const entry = leaderboard[pos - 1];
                  if (!entry) return null;
                  return (
                    <div key={pos} className="flex flex-col items-center gap-2">
                      <p className="text-xl">{crown}</p>
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-sm font-bold text-white`}>
                        {getInitials(entry)}
                      </div>
                      <p className="text-xs font-medium text-white text-center">{entry.first_name}</p>
                      <p className="text-xs text-eco-amber font-bold">{(entry.xp || 0).toLocaleString()} XP</p>
                      <div className={`w-20 ${size} rounded-t-lg bg-gradient-to-t ${color} opacity-50`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full list */}
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Rank', 'Name', 'Department', 'XP', 'Badges'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => {
                  const isMe = entry.id === user?.id;
                  return (
                    <tr key={entry.id} className={`border-b border-white/5 transition-colors ${isMe ? 'bg-eco-emerald/5 border-eco-emerald/10' : 'hover:bg-white/2'}`}>
                      <td className="px-5 py-4">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-eco-amber/20 text-eco-amber' :
                          idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                          idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                          'bg-white/5 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isMe ? 'bg-eco-emerald text-white' : 'bg-white/10 text-slate-300'}`}>
                            {getInitials(entry)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{entry.first_name} {entry.last_name} {isMe && <span className="text-xs text-eco-emerald">(You)</span>}</p>
                            <p className="text-xs text-slate-600">{entry.role?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400">{entry.dept_name || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-eco-amber">{(entry.xp || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">{entry.badge_count || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {leaderboard.length === 0 && <div className="py-16 text-center text-slate-600">No data yet</div>}
          </div>
        </div>
      ) : tab === 'department' ? (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Rank', 'Department', 'Total XP', 'Members', 'Avg XP/Member'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deptLeaderboard.map((dept, idx) => (
                <tr key={dept.department_id || idx} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-eco-amber/20 text-eco-amber' :
                      idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-slate-500'
                    }`}>{idx + 1}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-white">{dept.dept_name}</p>
                    <p className="text-xs text-slate-600">{dept.dept_code}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-eco-amber">{(dept.total_xp || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-400">{dept.member_count || 0}</td>
                  <td className="px-5 py-4 text-sm text-slate-400">{parseFloat(dept.avg_xp || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {deptLeaderboard.length === 0 && <div className="py-16 text-center text-slate-600">No data yet</div>}
        </div>
      ) : tab === 'badges' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {badges.map(badge => {
            const earned = badge.earned_at;
            return (
              <div key={badge.id} className={`glass-card p-5 text-center ${earned ? '' : 'opacity-50'}`}>
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl ${earned ? '' : 'grayscale'}`}
                  style={{ background: `${badge.color}20` }}>
                  {badge.icon}
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{badge.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{badge.description}</p>
                {badge.xp_required > 0 && <p className="text-xs text-eco-amber mt-2">{badge.xp_required} XP required</p>}
                {earned && <p className="text-xs text-eco-emerald mt-2">✓ Earned</p>}
              </div>
            );
          })}
          {badges.length === 0 && <div className="col-span-full glass-card p-12 text-center text-slate-600">No badges found</div>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.map(reward => {
            const canAfford = myXP >= reward.xp_cost;
            const outOfStock = reward.stock === 0;
            return (
              <div key={reward.id} className={`glass-card p-5 flex flex-col ${outOfStock ? 'opacity-50' : ''}`}>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-eco-purple to-eco-blue flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">{reward.name}</h3>
                <p className="text-xs text-slate-500 mb-4 flex-1 line-clamp-2">{reward.description}</p>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-eco-amber">{reward.xp_cost} XP</span>
                  <span className="text-xs text-slate-600">{reward.stock} left</span>
                </div>

                <button
                  onClick={() => handleRedeem(reward.id)}
                  disabled={!canAfford || outOfStock || redeeming === reward.id}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-eco-purple/20 text-eco-purple text-xs font-medium hover:bg-eco-purple/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {redeeming === reward.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                  {!canAfford ? `Need ${reward.xp_cost - myXP} more XP` : outOfStock ? 'Out of Stock' : 'Redeem'}
                </button>
              </div>
            );
          })}
          {rewards.length === 0 && <div className="col-span-full glass-card p-12 text-center text-slate-600">No rewards available</div>}
        </div>
      )}
    </div>
  );
}
