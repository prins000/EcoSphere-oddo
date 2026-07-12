// ============================================================
// EcoSphere ESG - Top Header Bar
// Search, notifications, and quick actions
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Bell,
  Moon,
  Sun,
  Sparkles,
} from 'lucide-react';

export default function Header() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="h-16 glass-light flex items-center justify-between px-6 border-b border-white/5">
      {/* ── Search ───────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ESG data..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-eco-emerald/50 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* ── Right Actions ───────────────────────────────── */}
      <div className="flex items-center gap-2">
        {/* AI Insights button */}
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-eco-purple/20 to-eco-blue/20 border border-eco-purple/20 text-eco-purple-light text-xs font-medium hover:from-eco-purple/30 hover:to-eco-blue/30 transition-all">
          <Sparkles className="w-3.5 h-3.5" />
          AI Insights
        </button>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all"
          title="Toggle theme"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
          <Bell className="w-5 h-5" />
          {/* Unread badge */}
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-eco-rose animate-pulse" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-eco-emerald to-eco-teal flex items-center justify-center text-white text-sm font-bold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-slate-200">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-slate-500">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
