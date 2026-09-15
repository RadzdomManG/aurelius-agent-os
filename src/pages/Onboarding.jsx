import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

const STEPS = ['Profile', 'Skills & Work', 'Communication', 'Autonomy', 'Connect'];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '', title: '', bio: '', skills: '', services: '', ideal_clients: '',
    preferred_jobs: '', timezone: 'UTC', working_hours: '9am-5pm',
    autonomy_mode: 'manual',
    action_controls: { email_send: false, follow_ups: true, job_submit: false, calendar_changes: false, crm_changes: true, browser_actions: false, notifications: true, data_collection: true },
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setCtrl = (k, v) => setForm((f) => ({ ...f, action_controls: { ...f.action_controls, [k]: v } }));

  const finish = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.UserProfile.filter({});
      const payload = {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        services: form.services.split(',').map((s) => s.trim()).filter(Boolean),
        onboarded: true,
      };
      if (existing[0]) {
        await base44.entities.UserProfile.update(existing[0].id, payload);
      } else {
        await base44.entities.UserProfile.create(payload);
      }
      navigate('/');
    } catch (e) {
      alert('Could not save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());
  const back = () => setStep(Math.max(0, step - 1));

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-stone-900" strokeWidth={2.5} />
        </div>
        <div>
          <div className="font-display font-semibold text-stone-800">Set up your operator</div>
          <div className="text-[12px] text-stone-400">Step {step + 1} of {STEPS.length} · {STEPS[step]}</div>
        </div>
      </div>

      <div className="flex gap-1.5 mb-7">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-amber-500' : 'bg-stone-200'}`} />
        ))}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm min-h-[320px]">
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Your name" value={form.full_name} onChange={(v) => set('full_name', v)} placeholder="e.g. Marcus Aurelius" />
            <Field label="Professional title" value={form.title} onChange={(v) => set('title', v)} placeholder="e.g. AI Content Engineer" />
            <Field label="Short bio" value={form.bio} onChange={(v) => set('bio', v)} placeholder="What you do, who you help" textarea />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Timezone" value={form.timezone} onChange={(v) => set('timezone', v)} placeholder="UTC" />
              <Field label="Working hours" value={form.working_hours} onChange={(v) => set('working_hours', v)} placeholder="9am-5pm" />
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Skills (comma separated)" value={form.skills} onChange={(v) => set('skills', v)} placeholder="ComfyUI, LoRA training, prompt engineering, AI video" />
            <Field label="Services you offer (comma separated)" value={form.services} onChange={(v) => set('services', v)} placeholder="AI influencer creation, workflow automation, content generation" />
            <Field label="Ideal clients" value={form.ideal_clients} onChange={(v) => set('ideal_clients', v)} placeholder="Agencies, SaaS startups, content brands…" textarea />
            <Field label="Preferred jobs" value={form.preferred_jobs} onChange={(v) => set('preferred_jobs', v)} placeholder="Remote ComfyUI / generative AI roles" textarea />
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] text-stone-500">
              Aurelius learns your writing style from examples you provide later. For now, pick a default tone for client communication.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {['Direct & professional', 'Warm & casual', 'Taglish mix', 'Formal'].map((t) => (
                <button key={t} className="text-left px-3 py-2.5 rounded-xl border border-stone-200 hover:border-amber-400 text-[13px] text-stone-700 transition-colors">
                  {t}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-stone-400">You can refine styles and add examples anytime in Settings.</p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-[13px] text-stone-500">How much should Aurelius do on its own?</p>
            <div className="space-y-2">
              {[
                { v: 'manual', t: 'Manual', d: 'Research, plan, and draft only. Nothing external without your approval.' },
                { v: 'assisted', t: 'Assisted', d: 'Safe routine tasks run automatically. External actions need approval.' },
                { v: 'autonomous', t: 'Autonomous', d: 'Perform allowed actions automatically, within your limits.' },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => set('autonomy_mode', m.v)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${form.autonomy_mode === m.v ? 'border-amber-400 bg-amber-50/50' : 'border-stone-200 hover:border-stone-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-semibold text-stone-800">{m.t}</span>
                    {form.autonomy_mode === m.v && <Check className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="text-[12px] text-stone-500 mt-0.5">{m.d}</div>
                </button>
              ))}
            </div>
            <div className="pt-2">
              <div className="text-[12px] font-medium text-stone-600 mb-2">Per-action controls</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(form.action_controls).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setCtrl(k, !v)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-colors ${v ? 'border-emerald-300 bg-emerald-50/50 text-stone-700' : 'border-stone-200 text-stone-400'}`}
                  >
                    <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className={`w-8 h-4 rounded-full relative transition-colors ${v ? 'bg-emerald-400' : 'bg-stone-300'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${v ? 'left-4' : 'left-0.5'}`} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-3">
            <p className="text-[13px] text-stone-500">
              Connect the services Aurelius will use. You can skip these now and connect anytime in Integrations.
            </p>
            {[
              { n: 'Gmail', d: 'Read, draft, and send email on your behalf' },
              { n: 'Google Calendar', d: 'Availability, reminders, scheduling' },
              { n: 'LLM Provider', d: 'Bring your own model API key' },
              { n: 'Web Search', d: 'For lead & job research' },
            ].map((i) => (
              <div key={i.n} className="flex items-center justify-between px-4 py-3 rounded-xl border border-stone-200">
                <div>
                  <div className="text-[13px] font-medium text-stone-700">{i.n}</div>
                  <div className="text-[11px] text-stone-400">{i.d}</div>
                </div>
                <span className="text-[11px] text-stone-400 bg-stone-100 px-2 py-1 rounded">Later</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <button onClick={back} disabled={step === 0} className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 disabled:opacity-40">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={next}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : step === STEPS.length - 1 ? <Check className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          {step === STEPS.length - 1 ? 'Finish' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-stone-600 mb-1.5 block">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-[13.5px] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 resize-none" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-[13.5px] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20" />
      )}
    </label>
  );
}