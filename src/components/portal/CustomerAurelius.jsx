import React from 'react';
import { Sparkles, Lock } from 'lucide-react';

export default function CustomerAurelius() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-stone-900" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="font-display text-[16px] font-semibold text-stone-800">Aurelius</h1>
          <p className="text-[11px] text-stone-400">AI operator</p>
        </div>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5 text-stone-400" />
        </div>
        <h2 className="font-display text-[15px] font-semibold text-stone-700 mb-1">Owner-controlled workspace</h2>
        <p className="text-[13px] text-stone-500 max-w-md mx-auto">
          The Aurelius command console is operated by the account owner. As a portal member you can browse the <span className="text-stone-700 font-medium">Leads</span> and <span className="text-stone-700 font-medium">Jobs</span> boards. Speak with the owner to run a new search or task.
        </p>
      </div>
    </div>
  );
}