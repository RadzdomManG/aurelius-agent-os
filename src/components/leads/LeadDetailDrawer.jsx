import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Globe, Mail, Phone, MapPin, Linkedin, Save, Ban, Activity } from 'lucide-react';

const STATUSES = ['new', 'qualified', 'contacted', 'replied', 'interested', 'follow_up', 'meeting', 'won', 'lost', 'do_not_contact'];

export default function LeadDetailDrawer({ lead, onClose, onUpdated }) {
  const [edit, setEdit] = useState(null);
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lead) {
      setEdit({ notes: lead.notes || '', next_action: lead.next_action || '', status: lead.status || 'new' });
      (async () => {
        try {
          const acts = await base44.entities.Activity.filter({ related_type: 'Lead', related_id: lead.id }, '-created_date', 20);
          setActivities(acts);
        } catch { setActivities([]); }
      })();
    }
  }, [lead]);

  if (!lead) return null;

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Lead.update(lead.id, edit);
      onUpdated?.({ ...lead, ...edit });
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const setStatus = async (status) => {
    await base44.entities.Lead.update(lead.id, { status });
    onUpdated?.({ ...lead, status });
    setEdit({ ...edit, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold text-stone-800 truncate">{lead.name}</div>
            {lead.company && <div className="text-[12px] text-stone-400 truncate">{lead.company}</div>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-semibold tabular-nums ${lead.lead_score >= 80 ? 'text-amber-600' : lead.lead_score >= 50 ? 'text-stone-600' : 'text-stone-400'}`}>{lead.lead_score || 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">score</span>
            </div>
            <div className="flex-1">
              <select value={edit.status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] capitalize focus:outline-none focus:border-amber-400">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <button onClick={() => setStatus('do_not_contact')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 text-[12px] text-stone-500 hover:border-red-300 hover:text-red-500">
              <Ban className="w-3.5 h-3.5" /> DNC
            </button>
          </div>

          {lead.score_reason && (
            <Field label="Why this score">{lead.score_reason}</Field>
          )}
          {lead.reason_needed && (
            <Field label="Why they may need you">{lead.reason_needed}</Field>
          )}

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            {lead.website && <Link icon={Globe} label="Website" href={lead.website} />}
            {lead.email && <Link icon={Mail} label="Email" href={`mailto:${lead.email}`} text={lead.email} />}
            {lead.phone && <Link icon={Phone} label="Phone" href={`tel:${lead.phone}`} text={lead.phone} />}
            {lead.social_profile && <Link icon={Linkedin} label="Social" href={lead.social_profile} />}
            {lead.location && <div className="flex items-center gap-1.5 text-stone-500"><MapPin className="w-3.5 h-3.5" /> {lead.location}</div>}
            {lead.industry && <div className="text-stone-500"><span className="text-stone-400">Industry:</span> {lead.industry}</div>}
            {lead.source && <div className="text-stone-500"><span className="text-stone-400">Source:</span> {lead.source}</div>}
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-stone-500 block">Next action</label>
            <input value={edit.next_action} onChange={(e) => setEdit({ ...edit, next_action: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-stone-500 block">Notes</label>
            <textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} rows={3}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400 resize-none" />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-[13px] font-medium disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 mb-2"><Activity className="w-3.5 h-3.5" /> Activity timeline</div>
            <div className="space-y-2 pl-1">
              {activities.length === 0 && <div className="text-[12px] text-stone-400">No activity yet.</div>}
              {activities.map((a) => (
                <div key={a.id} className="flex gap-2 text-[12px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === 'success' ? 'bg-emerald-400' : a.severity === 'warning' ? 'bg-amber-400' : a.severity === 'error' ? 'bg-red-400' : 'bg-stone-300'}`} />
                  <div className="flex-1 text-stone-600">{a.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div className="text-[10.5px] font-medium text-stone-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-[12.5px] text-stone-700 leading-relaxed">{children}</div>
    </div>
  );
}

function Link({ icon: Icon, label, href, text }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-stone-600 hover:text-amber-600 truncate">
      <Icon className="w-3.5 h-3.5 text-stone-400" />
      <span className="truncate">{text || href}</span>
    </a>
  );
}