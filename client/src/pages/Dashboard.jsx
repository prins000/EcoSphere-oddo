// ============================================================
// EcoSphere ESG - Dashboard Page
// Live data from API with charts and activity feed
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Leaf,
  Users,
  Shield,
  Trophy,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#F43F5E', '#06B6D4'];

export default function Dashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [rankings, setRankings] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ovRes, rankRes, actRes] = await Promise.all([
          api.get('/dashboard/overview'),
          api.get('/dashboard/rankings'),
          api.get('/dashboard/activity?limit=8'),
        ]);
        setOverview(ovRes.data.data);
        setRankings(rankRes.data.data);
        setActivity(actRes.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-5 h-36 skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card p-6 h-80 skeleton" />
          <div className="glass-card p-6 h-80 skeleton" />
        </div>
      </div>
    );
  }

  const ov = overview || {};
  const esg = ov.esgScore || {};
  const carbon = ov.carbon || {};
  const social = ov.social || {};
  const governance = ov.governance || {};
  const goals = ov.goals || {};

  const kpiCards = [
    {
      title: 'ESG Score',
      value: esg.overall || '0',
      suffix: '/100',
      change: `${parseFloat(esg.overall) >= 70 ? '+' : ''}${(parseFloat(esg.overall) - 70).toFixed(1)}%`,
      trend: parseFloat(esg.overall) >= 70 ? 'up' : 'down',
      icon: Globe,
      gradient: 'from-eco-emerald to-eco-teal',
      description: 'Overall ESG Rating',
    },
    {
      title: 'Carbon Emissions',
      value: carbon.currentMonthTonnes || '0',
      suffix: ' tCO₂',
      change: `${carbon.changePercent || 0}%`,
      trend: carbon.trend === 'down' ? 'down' : 'up',
      icon: Leaf,
      gradient: 'from-eco-blue to-eco-cyan',
      description: 'This Month',
    },
    {
      title: 'CSR Activities',
      value: String(social.activeCSR || 0),
      suffix: ' active',
      change: `${social.totalParticipations || 0} joined`,
      trend: 'up',
      icon: Users,
      gradient: 'from-eco-purple to-eco-blue',
      description: 'Employee Participation',
    },
    {
      title: 'Compliance',
      value: governance.complianceRate || '0',
      suffix: '%',
      change: `${governance.openIssues || 0} open`,
      trend: parseFloat(governance.complianceRate) >= 80 ? 'up' : 'down',
      icon: Shield,
      gradient: 'from-eco-amber to-eco-rose',
      description: 'Policy Adherence',
    },
  ];

  // Build pie data for ESG breakdown
  const esgPieData = [
    { name: 'Environmental', value: parseFloat(esg.environmental) || 0, weight: '40%' },
    { name: 'Social', value: parseFloat(esg.social) || 0, weight: '30%' },
    { name: 'Governance', value: parseFloat(esg.governance) || 0, weight: '30%' },
  ];

  // Notification type to icon mapping
  const typeIcons = {
    BADGE_UNLOCK: '🏅',
    COMPLIANCE_ISSUE: '⚠️',
    CSR_APPROVAL: '✅',
    OVERDUE_ISSUE: '🚨',
    CHALLENGE_APPROVAL: '🎉',
    XP_EARNED: '⭐',
    REWARD_REDEEMED: '🎁',
    GENERAL: '📊',
    POLICY_REMINDER: '📋',
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-[var(--font-display)]">
            ESG Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Welcome back, {user?.firstName}! Here's your sustainability overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-eco-emerald/10 border border-eco-emerald/20 text-eco-emerald text-xs font-medium">
            <Zap className="w-3 h-3" />
            Live Data
          </span>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, index) => (
          <div
            key={card.title}
            className="glass-card p-5 group cursor-pointer"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                  card.trend === 'up'
                    ? 'text-eco-emerald bg-eco-emerald/10'
                    : 'text-eco-rose bg-eco-rose/10'
                }`}
              >
                {card.trend === 'up' ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {card.change}
              </span>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">
                  {card.value}
                </span>
                <span className="text-sm text-slate-500">{card.suffix}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{card.description}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1 text-xs text-slate-600 group-hover:text-eco-emerald transition-colors">
              View details
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ESG Score Breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            ESG Score Breakdown
          </h3>
          <div className="space-y-4">
            {esgPieData.map((item, i) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-400">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.value.toFixed(1)}/100 ({item.weight})</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${item.value}%`,
                      background: PIE_COLORS[i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <p className="text-xs text-slate-500 mb-1">Overall Score</p>
            <div className="inline-flex items-center gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-eco-emerald to-eco-blue bg-clip-text text-transparent">
                {esg.overall || '0'}
              </span>
              <span className="text-xs text-slate-600">/100</span>
            </div>
          </div>
        </div>

        {/* Department Rankings */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Department Rankings
          </h3>
          {rankings.length > 0 ? (
            <div className="space-y-3">
              {rankings.slice(0, 6).map((dept, idx) => (
                <div key={dept.department_id || idx} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-eco-amber/20 text-eco-amber' :
                    idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                    idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                    'bg-white/5 text-slate-500'
                  }`}>
                    {dept.rank || idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-300 truncate">{dept.dept_name}</span>
                      <span className="text-sm font-bold text-white">{parseFloat(dept.overall_score).toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-eco-emerald to-eco-blue transition-all duration-700"
                        style={{ width: `${parseFloat(dept.overall_score)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
              No department scores yet
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Goals + Activity Feed ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Stats */}
        <div className="space-y-4">
          {[
            {
              icon: Trophy,
              title: 'Active Challenges',
              count: ov.gamification?.activeChallenges || 0,
              color: 'from-eco-amber to-eco-rose',
              desc: 'Join and earn XP',
            },
            {
              icon: AlertTriangle,
              title: 'Overdue Issues',
              count: governance.overdueIssues || 0,
              color: 'from-eco-rose to-eco-rose-dark',
              desc: 'Needs immediate action',
            },
            {
              icon: Target,
              title: 'Green Goals',
              count: Object.values(goals).reduce((s, v) => s + (v || 0), 0),
              color: 'from-eco-emerald to-eco-teal',
              desc: `${goals.on_track || 0} on track, ${goals.at_risk || 0} at risk`,
            },
          ].map((item) => (
            <div key={item.title} className="glass-card p-5 flex items-center gap-4 cursor-pointer">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">{item.title}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{item.count}</span>
                  <span className="text-xs text-slate-500">{item.desc}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Recent Activity
          </h3>
          {activity.length > 0 ? (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {activity.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    item.is_read ? 'bg-white/2' : 'bg-white/5 border border-white/5'
                  }`}
                >
                  <span className="text-lg mt-0.5">{typeIcons[item.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-300 truncate">{item.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-600 text-sm">
              No recent activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
