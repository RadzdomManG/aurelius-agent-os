import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Globe, MapPin, ExternalLink, Save, Activity, Briefcase } from 'lucide-react';

const STATUSES = ['saved', 'reviewing', 'apply', 'applied', 'interview', 'rejected', 'offer', 'ignore'];

export default function JobDetailDrawer({ job, onClose, onUpdated }) {
  const [edit, setEdit] = useState(null);
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

  useEffect(() => {
    if (job) {
      setEdit({ status: job.status || 'saved', notes: job.notes || '', application_url: job.application_url || '' });
      (async () => {
        try {
          const acts = await base44.entities.Activity.filter({ related_type: 'Job', related_id: job.id }, '-created_date', 20);
          setActivities(acts);
        } catch { setActivities([]); }
      })();
    }
  }, [job]);

  useEffect(() => {
    const onKeyDown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && job && edit && !saving) { e.preventDefault(); save(); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [job, edit, saving]);

  if (!job || !edit) return null;

  const save = async () => {
    setSaving(true);
    try {
      const upd = await base44.entities.Job.update(job.id, edit);
      onUpdated?.({ ...job, ...edit });
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const setStatus = async (status) => {
    await base44.entities.Job.update(job.id, { status });
    onUpdated?.({ ...job, status });
    setEdit({ ...edit, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-3.5 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-display text-[15px] font-semibold text-stone-800 truncate">{String(job.title || '').replace(/^\[(onlinejobsph|olj)\]\s*/i, '')}</div>
            {job.company && <div className="text-[12px] text-stone-400 truncate">{job.company}</div>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-semibold tabular-nums ${job.match_score >= 70 ? 'text-amber-600' : job.match_score >= 40 ? 'text-stone-600' : 'text-stone-400'}`}>{job.match_score || 0}</span>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">match</span>
            </div>
            <div className="flex-1">
              <select value={edit.status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] capitalize focus:outline-none focus:border-amber-400">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {job.match_reason && <Field label="Why this match">{job.match_reason}</Field>}

          {job.skills_matched && job.skills_matched.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills_matched.map((s) => (
                <span key={s} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{s}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            {job.url && <Link icon={ExternalLink} label="Original post" href={job.url} text="OnlineJobs.ph" />}
            {job.location && <div className="flex items-center gap-1.5 text-stone-500"><MapPin className="w-3.5 h-3.5" /> {job.remote ? 'Remote' : job.location}</div>}
            {job.salary && <div className="text-stone-500"><span className="text-stone-400">Salary:</span> {job.salary}</div>}
            {job.source && <div className="text-stone-500"><span className="text-stone-400">Source:</span> {job.source}</div>}
            {job.owner_email && <div className="text-stone-500 col-span-2"><span className="text-stone-400">Owner:</span> {job.owner_email}</div>}
          </div>

          {job.description && (
            <Field label="Description">
              <div className={`${expandedDescription ? '' : 'max-h-48 overflow-hidden'} space-y-2`}>{formatDescription(job.description)}</div>
              {job.description.length > 700 && <button onClick={() => setExpandedDescription((v) => !v)} className="mt-2 text-[12px] font-medium text-amber-700 hover:text-amber-800">{expandedDescription ? 'See less' : 'See more'}</button>}
            </Field>
          )}

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-stone-500 block">Application URL</label>
            <input value={edit.application_url} onChange={(e) => setEdit({ ...edit, application_url: e.target.value })}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-stone-500 block">Notes</label>
            <textarea value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); } }} rows={3}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400 resize-none" />
          </div>

          <button onClick={save} disabled={saving}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-[13px] font-medium disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'} <span className="text-[10px] opacity-60 ml-1">Ctrl+Enter</span>
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-500 mb-2"><Activity className="w-3.5 h-3.5" /> Activity</div>
            <div className="space-y-2 pl-1">
              {activities.length === 0 && <div className="text-[12px] text-stone-400">No activity yet.</div>}
              {activities.map((a) => (
                <div key={a.id} className="flex gap-2 text-[12px]">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === 'success' ? 'bg-emerald-400' : a.severity === 'warning' ? 'bg-amber-400' : 'bg-stone-300'}`} />
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

function formatDescription(text) {
  const lines = String(text || '').replace(/\\r/g, '').split(/\\n+/).map((line) => line.trim()).filter(Boolean);
  const heading = /^(about|overview|responsibilities|requirements|qualifications|what you.ll do|what we offer|compensation|salary|benefits|how to apply)/i;
  return lines.map((line, i) => heading.test(line) ? <div key={i} className="font-semibold text-stone-800 mt-2">{line}</div> : <p key={i} className={/(salary|compensation|pay|rate|benefits|hourly|per month|per year)/i.test(line) ? 'font-semibold text-emerald-700 bg-emerald-50 rounded px-2 py-1' : ''}>{line}</p>);
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