import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CommandConsole from '@/components/CommandConsole';
import { Sparkles } from 'lucide-react';
import { usePortal } from '@/lib/PortalContext';
import CustomerAurelius from '@/components/portal/CustomerAurelius';

export default function Aurelius() {
  const { mode } = usePortal();
  const [autonomyMode, setAutonomyMode] = useState('manual');

  useEffect(() => {
    if (mode !== 'owner') return;
    (async () => {
      try {
        const p = await base44.entities.UserProfile.filter({});
        if (p[0]) setAutonomyMode(p[0].autonomy_mode || 'manual');
      } catch { /* noop */ }
    })();
  }, [mode]);

  if (mode === 'customer') return <CustomerAurelius />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 lg:py-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-stone-900" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-display text-[16px] font-semibold text-stone-800">Aurelius</h1>
          <p className="text-[11px] text-stone-400">Your AI operator</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <CommandConsole autonomyMode={autonomyMode} />
      </div>
    </div>
  );
}