import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { usePortal } from '@/lib/PortalContext';
import {
  LayoutDashboard, Sparkles, Users, Briefcase, Settings, KeyRound, LogOut,
} from 'lucide-react';

const ownerNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/aurelius', label: 'Aurelius', icon: Sparkles },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/access-codes', label: 'Access Codes', icon: KeyRound },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const customerNav = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/aurelius', label: 'Aurelius', icon: Sparkles },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
];

export default function Sidebar({ autonomyMode = 'manual' }) {
  const { user, logout } = useAuth();
  const { mode, label, logout: portalLogout } = usePortal();
  const navigate = useNavigate();
  const isCustomer = mode === 'customer';
  const nav = isCustomer ? customerNav : ownerNav;

  const handleLogout = async () => {
    if (isCustomer) {
      portalLogout();
      navigate('/access', { replace: true });
    } else {
      await logout(false);
      navigate('/login');
    }
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#FAFAFA] border-r border-[#EFEFEF] h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[hsl(var(--sidebar-border))]">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFB830] to-[#FF9500] flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight text-[#211F1D]">Aurelius</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-[#AAAAAA]">{isCustomer ? 'CRM Portal' : 'Agent OS'}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[13.5px] ${
                  isActive ? 'bg-[#211F1D] text-white' : 'text-[#555555] hover:bg-[#EFEFEF] hover:text-[#211F1D]'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-3 py-3 border-t border-[#EFEFEF]">
        {!isCustomer && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[#EFEFEF]">
            <div className={`w-2 h-2 rounded-full ${autonomyMode === 'manual' ? 'bg-[#AAAAAA]' : autonomyMode === 'assisted' ? 'bg-[#FFB830]' : 'bg-emerald-500'}`} />
            <span className="text-[11px] font-medium text-[#555555] capitalize">{autonomyMode} mode</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 mt-3 px-2">
          <div className="w-8 h-8 rounded-full bg-[#211F1D] text-white text-xs font-medium flex items-center justify-center">
            {isCustomer ? 'P' : (user?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[#211F1D] truncate">{isCustomer ? (label || 'Portal member') : (user?.full_name || 'Operator')}</div>
            <div className="text-[10px] text-[#AAAAAA] truncate">{isCustomer ? 'Customer access' : user?.email}</div>
          </div>
          <button onClick={handleLogout} className="text-[#AAAAAA] hover:text-[#211F1D] transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}