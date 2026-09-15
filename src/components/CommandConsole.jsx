import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, ArrowUp, Loader2, User, CheckCircle2, AlertCircle, Brain } from 'lucide-react';

const SUGGESTIONS = [
  'Find me 30 potential clients that need AI influencers',
  'Find ComfyUI jobs posted this week',
  'What happened while I was away?',
  'Reply to my last client in my style',
  'Research a company called Vercel',
  'Follow up with everyone who hasn\u2019t responded',
];

export default function CommandConsole({ autonomyMode = 'manual', compact = false }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread, busy]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    setBusy(true);
    setThread((t) => [...t, { role: 'user', content: msg }]);
    try {
      const res = await base44.functions.invoke('aurelius_chat', { message: msg, autonomy_mode: autonomyMode });
      const data = res.data;
      setThread((t) => [...t, { role: 'assistant', content: data.reply, meta: data }]);
      setLastResult(data);
    } catch (e) {
      setThread((t) => [...t, { role: 'assistant', content: `Something went wrong: ${e.message}`, error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!compact && thread.length > 0 && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
          {thread.map((m, i) => (
            <MessageBubble key={i} m={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-stone-400 text-sm pl-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Aurelius is thinking…</span>
            </div>
          )}
        </div>
      )}

      {thread.length === 0 && !compact && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <Sparkles className="w-7 h-7 text-stone-900" strokeWidth={2.5} />
          </div>
          <h2 className="font-display text-xl font-semibold text-stone-800 mb-1.5">What should I handle?</h2>
          <p className="text-stone-500 text-sm max-w-md mb-6">
            Give me a goal in plain language. I'll plan the work, delegate to the right specialists, remember what matters, and report back.
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-[12.5px] px-3 py-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-3">
        <div className="relative rounded-2xl border border-stone-200 bg-white shadow-sm focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={compact ? 1 : 2}
            placeholder="Ask Aurelius to find leads, hunt jobs, draft replies, research, follow up…"
            className="w-full resize-none bg-transparent px-4 pt-3.5 pb-12 text-[14px] text-stone-800 placeholder:text-stone-400 focus:outline-none"
          />
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-stone-400 hidden sm:block pr-1 capitalize">{autonomyMode}</span>
            <button
              onClick={() => send()}
              disabled={!input.trim() || busy}
              className="w-9 h-9 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white flex items-center justify-center transition-colors"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" strokeWidth={2.5} />}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 mt-2 px-1">
          Aurelius obeys your autonomy mode. External actions go to the approval queue when required.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ m }) {
  if (m.role === 'user') {
    return (
      <div className="flex gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-stone-900 text-white px-4 py-2.5 text-[14px] leading-relaxed">
          {m.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-stone-500" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-stone-900" strokeWidth={2.5} />
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-[14px] leading-relaxed ${m.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-stone-100 text-stone-800'}`}>
          {m.content}
        </div>
        {m.meta && <PlanChips meta={m.meta} />}
      </div>
    </div>
  );
}

function PlanChips({ meta }) {
  const items = [];
  if (meta.sub_agent) items.push({ icon: Brain, label: meta.sub_agent, tone: 'slate' });
  if (meta.tasks?.length) items.push({ icon: CheckCircle2, label: `${meta.tasks.length} task${meta.tasks.length > 1 ? 's' : ''} planned`, tone: 'emerald' });
  if (meta.approvals?.length) items.push({ icon: AlertCircle, label: `${meta.approvals.length} approval${meta.approvals.length > 1 ? 's' : ''} queued`, tone: 'amber' });
  if (meta.memories_created > 0) items.push({ icon: Brain, label: `${meta.memories_created} memory stored`, tone: 'slate' });
  if (!items.length) return null;
  const tones = {
    slate: 'bg-stone-100 text-stone-500',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <span key={i} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${tones[it.tone]}`}>
            <Icon className="w-3 h-3" /> {it.label}
          </span>
        );
      })}
    </div>
  );
}