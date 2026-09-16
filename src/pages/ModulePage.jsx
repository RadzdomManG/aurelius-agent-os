import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw } from 'lucide-react';

const config = {
  inbox: { title: 'Inbox', entity: 'Notification', subtitle: 'Notifications and updates from Aurelius.' },
  crm: { title: 'CRM', entity: 'Contact', subtitle: 'Contacts and relationships managed by Aurelius.' },
  tasks: { title: 'Tasks', entity: 'Task', subtitle: 'Work planned and executed by your AI operator.' },
  calendar: { title: 'Calendar', entity: 'Activity', subtitle: 'Scheduled activity and upcoming commitments.' },
  memory: { title: 'Memory', entity: 'AgentMemory', subtitle: 'Facts and preferences Aurelius remembers.' },
  approvals: { title: 'Approvals', entity: 'Approval', subtitle: 'Review actions that need your decision.' },
  activity: { title: 'Activity', entity: 'Activity', subtitle: 'A complete audit trail of Aurelius activity.' },
  integrations: { title: 'Integrations', entity: 'Integration', subtitle: 'Connections that power your operator.' },
};

export default function ModulePage({ module }) {
  const c = config[module] || config.inbox;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setRows(await base44.entities[c.entity].list('-created_date', 200)); } catch { setRows([]); } finally { setLoading(false); } };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-xl font-semibold text-stone-800">{c.title}</h1><p className="text-[13px] text-stone-400">{c.subtitle}</p></div><button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-[12.5px]"><RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> Refresh</button></div>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-16 text-center text-sm text-stone-400">Nothing here yet. Aurelius will add items as it works.</div> : <div className="space-y-2">{rows.map((r) => <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4"><div className="text-sm font-medium text-stone-800">{r.title || r.name || r.description || r.content || 'Untitled item'}</div><div className="text-xs text-stone-400 mt-1">{r.status || r.type || r.label || r.created_date || ''}</div>{r.description && r.title && <div className="text-sm text-stone-600 mt-2 line-clamp-2">{r.description}</div>}</div>)}</div>}
  </div>;
}