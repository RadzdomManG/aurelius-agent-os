import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, RefreshCw, Plus, Check } from 'lucide-react';

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
  const [form, setForm] = useState({ name: '', title: '', goal: '', email: '', phone: '', company_name: '', due: '', priority: 'medium', type: 'lead' });
  const [saving, setSaving] = useState(false);
  const load = async () => { setLoading(true); try { const data = await base44.entities[c.entity].list('-created_date', 200); setRows(module === 'inbox' ? data.filter((n) => !n.created_date || (Date.now() - new Date(n.created_date).getTime()) < 7 * 86400000) : data); } catch { setRows([]); } finally { setLoading(false); } };
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  const createItem = async () => {
    setSaving(true);
    try {
      if (module === 'crm') await base44.entities.Contact.create({ name: form.name, email: form.email, phone: form.phone, company_name: form.company_name, type: form.type });
      if (module === 'tasks') await base44.entities.Task.create({ title: form.title, goal: form.goal, priority: form.priority, status: 'pending', action_type: 'follow_up' });
      if (module === 'calendar') await base44.entities.Activity.create({ type: 'calendar_event', description: form.title || form.goal, actor: 'user', metadata: { scheduled_for: form.due } });
      setForm({ name: '', title: '', goal: '', email: '', phone: '', company_name: '', due: '', priority: 'medium', type: 'lead' });
      load();
    } finally { setSaving(false); }
  };
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="font-display text-xl font-semibold text-stone-800">{c.title}</h1><p className="text-[13px] text-stone-400">{c.subtitle}</p></div><button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-[12.5px]"><RefreshCw className={loading ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'} /> Refresh</button></div>
    {module === 'integrations' && <div className="grid md:grid-cols-2 gap-4"><div className="rounded-2xl border border-stone-200 bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-base font-semibold text-stone-800">Google Workspace</h2><p className="text-xs text-stone-500 mt-1">Connect Gmail and Google Calendar for Aurelius workflows.</p></div><span className="text-xs rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">Calendar connected</span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="text-sm font-medium text-emerald-800">Gmail connected</div><div className="text-[11px] text-emerald-700 mt-1">radzdomgallego4@gmail.com</div></div><div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><div className="text-sm font-medium text-emerald-800">Google Calendar connected</div><div className="text-[11px] text-emerald-700 mt-1">radzdomgallego4@gmail.com</div></div></div></div></div>}
    {(module === 'crm' || module === 'tasks' || module === 'calendar') && <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 mb-3 text-sm font-medium text-stone-700"><Plus className="w-4 h-4 text-amber-500" /> Add {module === 'crm' ? 'contact' : module === 'tasks' ? 'task' : 'event'}</div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">{module === 'crm' ? <><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name" className="rounded-lg border p-2 text-sm" /><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email" className="rounded-lg border p-2 text-sm" /><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone" className="rounded-lg border p-2 text-sm" /><input value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})} placeholder="Company" className="rounded-lg border p-2 text-sm" /></> : <><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder={module === 'tasks' ? 'Task title' : 'Event title'} className="rounded-lg border p-2 text-sm" /><input value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} placeholder={module === 'tasks' ? 'Goal or next action' : 'Details'} className="rounded-lg border p-2 text-sm" /><input type={module === 'calendar' ? 'datetime-local' : 'text'} value={module === 'calendar' ? form.due : form.priority} onChange={e=>setForm({...form,[module === 'calendar' ? 'due' : 'priority']:e.target.value})} placeholder={module === 'tasks' ? 'Priority' : ''} className="rounded-lg border p-2 text-sm" /><button onClick={createItem} disabled={saving} className="rounded-lg bg-stone-900 text-white text-sm px-3 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Create'}</button></>}</div>{module === 'crm' && <button onClick={createItem} disabled={saving || !form.name} className="mt-3 rounded-lg bg-stone-900 text-white text-sm px-3 py-2 disabled:opacity-50">{saving ? 'Saving…' : 'Save contact'}</button>}</div>}
    {module !== 'integrations' && (loading ? <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div> : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-stone-200 bg-white py-16 text-center text-sm text-stone-400">Nothing here yet. Aurelius will add items as it works.</div> : <div className="space-y-2">{rows.map((r) => <div key={r.id} className={`rounded-xl border p-4 ${module === 'inbox' && r.type === 'job_match' ? 'border-emerald-200 bg-emerald-50/50' : module === 'inbox' && (r.type || '').includes('lead') ? 'border-amber-200 bg-amber-50/50' : 'border-stone-200 bg-white'}`}><div className="text-sm font-medium text-stone-800">{r.title || r.name || r.description || r.content || 'Untitled item'}</div><div className="text-xs text-stone-400 mt-1">{r.status || r.type || r.label || r.created_date || ''}</div>{r.description && r.title && <div className="text-sm text-stone-600 mt-2 line-clamp-2">{r.description}</div>}</div>)}</div>)}
  </div>;
}