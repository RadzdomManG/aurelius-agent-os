import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import {
  LayoutDashboard, Sparkles, Users, Briefcase, Inbox, Contact,
  ListTodo, Calendar, Brain, CheckCheck, Activity, Plug, Settings,
  LogOut, ChevronRight
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/aurelius', label: 'Aurelius', icon: Sparkles },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase, soon: true },
  { to: '/inbox', label: 'Inbox', icon: Inbox, soon: true },
  { to: '/crm', label: 'CRM', icon: Contact, soon: true },
  { to: '/tasks', label: 'Tasks', icon: ListTodo, soon: true },
  { to: '/calendar', label: 'Calendar', icon: Calendar, soon: true },
  { to: '/memory', label: 'Memory', icon: Brain, soon: true },
  { to: '/approvals', label: 'Approvals', icon: CheckCheck, soon: true },
  { to: '/activity', label: 'Activity', icon: Activity, soon: true },
  { to: '/integrations', label: 'Integrations', icon: Plug, soon: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ autonomyMode = 'manual', onOpenMobile }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout(false);
    navigate('/login');
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))] h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-stone-900" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight text-stone-900">Aurelius</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-stone-400">Agent OS</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          if (item.soon) {
            return (
              <div key={item.to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-stone-400 cursor-not-allowed select-none">
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[13.5px] flex-1">{item.label}</span>
                <span className="text-[9px] uppercase tracking-wider text-stone-300 bg-stone-100 px-1.5 py-0.5 rounded">soon</span>
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13.5px] ${
                  isActive
                    ? 'bg-stone-900 text-white'
                    : 'text-stone-600 hover:bg-stone-200/70 hover:text-stone-900'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-amber-50/60 border border-amber-200/60">
          <div className={`w-2 h-2 rounded-full ${autonomyMode === 'manual' ? 'bg-stone-400' : autonomyMode === 'assisted' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <span className="text-[11px] font-medium text-stone-600 capitalize">{autonomyMode} mode</span>
        </div>
        <div className="flex items-center gap-2.5 mt-3 px-2">
          <div className="w-8 h-8 rounded-full bg-stone-800 text-white text-xs font-medium flex items-center justify-center">
            {(user?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-stone-700 truncate">{user?.full_name || 'Operator'}</div>
            <div className="text-[10px] text-stone-400 truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="text-stone-400 hover:text-stone-700 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}