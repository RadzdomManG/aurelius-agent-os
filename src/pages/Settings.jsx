import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Save } from 'lucide-react';

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await base44.entities.UserProfile.filter({});
        if (p[0]) setProfile(p[0]);
        else setProfile({ autonomy_mode: 'manual', action_controls: {} });
      } catch { setProfile({ autonomy_mode: 'manual', action_controls: {} }); }
    })();
  }, []);

  const update = (patch) => { setProfile((p) => ({ ...p, ...patch })); setSaved(false); };
  const setCtrl = (k, v) => { setProfile((p) => ({ ...p, action_controls: { ...(p.action_controls || {}), [k]: v } })); setSaved(false); };

  const save = async () => {
    setSaving(true);
    try {
      if (profile.id) await base44.entities.UserProfile.update(profile.id, profile);
      else await base44.entities.UserProfile.create({ ...profile, onboarded: true });
      setSaved(true);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (!profile) return <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-stone-800">Settings</h1>
        <p className="text-[13px] text-stone-400">Control how Aurelius operates on your behalf.</p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-4">
        <h2 className="text-[14px] font-semibold text-stone-700">Autonomy mode</h2>
        <div className="grid grid-cols-3 gap-2">
          {['manual', 'assisted', 'autonomous'].map((m) => (
            <button key={m} onClick={() => update({ autonomy_mode: m })}
              className={`px-3 py-2.5 rounded-xl border text-[13px] capitalize transition-colors ${profile.autonomy_mode === m ? 'border-amber-400 bg-amber-50/50 text-stone-800 font-medium' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
              {m}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-stone-400">
          {profile.autonomy_mode === 'manual' && 'Aurelius will only research, plan, and draft. Every external action goes to your approval queue.'}
          {profile.autonomy_mode === 'assisted' && 'Safe routine tasks run automatically. Sending email, applications, and calendar changes need approval.'}
          {profile.autonomy_mode === 'autonomous' && 'Aurelius performs allowed actions automatically, respecting your per-action controls and limits.'}
        </p>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
        <h2 className="text-[14px] font-semibold text-stone-700">Per-action controls</h2>
        <div className="grid grid-cols-2 gap-2">
          {['email_send', 'follow_ups', 'job_submit', 'calendar_changes', 'crm_changes', 'browser_actions', 'notifications', 'data_collection'].map((k) => {
            const v = profile.action_controls?.[k] ?? false;
            return (
              <button key={k} onClick={() => setCtrl(k, !v)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-[12.5px] transition-colors ${v ? 'border-emerald-300 bg-emerald-50/50 text-stone-700' : 'border-stone-200 text-stone-400'}`}>
                <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                <span className={`w-8 h-4 rounded-full relative transition-colors ${v ? 'bg-emerald-400' : 'bg-stone-300'}`}>
                  <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${v ? 'left-4' : 'left-0.5'}`} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <button onClick={save} disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
        {saved ? 'Saved' : 'Save settings'}
      </button>
    </div>
  );
}