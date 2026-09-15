import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Sidebar from '@/components/Sidebar';
import { Sparkles, Bell, Menu, X } from 'lucide-react';

export default function AppLayout() {
  const [autonomyMode, setAutonomyMode] = useState('manual');
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [profiles, notifs] = await Promise.all([
          base44.entities.UserProfile.filter({}),
          base44.entities.Notification.filter({ read: false }, '-created_date', 50),
        ]);
        if (!active) return;
        if (profiles[0]) setAutonomyMode(profiles[0].autonomy_mode || 'manual');
        setUnread(notifs.length);
      } catch {
        /* ignore on first load */
      }
    })();
    const t = setInterval(async () => {
      try {
        const n = await base44.entities.Notification.filter({ read: false }, '-created_date', 50);
        if (active) setUnread(n.length);
      } catch { /* noop */ }
    }, 20000);
    return () => { active = false; clearInterval(t); };
  }, []);

  return (
    <div className="min-h-screen flex bg-[hsl(var(--background))]">
      <Sidebar autonomyMode={autonomyMode} />

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 h-full">
            <Sidebar autonomyMode={autonomyMode} />
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-3 text-stone-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-white/80 backdrop-blur-md border-b border-stone-200/80">
          <button className="lg:hidden text-stone-600" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-stone-900" strokeWidth={2.5} />
            </div>
            <span className="font-display font-semibold text-sm">Aurelius</span>
          </div>
          <div className="hidden lg:block text-[13px] text-stone-400">
            Your AI operator is online
          </div>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/')}
            className="relative w-9 h-9 rounded-lg hover:bg-stone-100 flex items-center justify-center text-stone-500 transition-colors"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </header>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}