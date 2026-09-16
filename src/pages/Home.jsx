import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import CommandConsole from '@/components/CommandConsole';
import {
  CheckCircle2, Bell, ListTodo, Users, Briefcase, Activity as ActivityIcon,
  ArrowRight, Sparkles, Clock, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePortal } from '@/lib/PortalContext';
import CustomerHome from '@/components/portal/CustomerHome';

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { mode, token } = usePortal();

  const load = useCallback(async () => {
    try {
      const [profiles, approvals, notifs, tasks, leads, jobs, activities] = await Promise.all([
        base44.entities.UserProfile.filter({}),
        base44.entities.Approval.filter({ status: 'pending' }, '-created_date', 5),
        base44.entities.Notification.filter({}, '-created_date', 5),
        base44.entities.Task.filter({ status: { $in: ['running', 'pending', 'waiting_for_approval'] } }, '-created_date', 5),
        base44.entities.Lead.filter({}, '-lead_score', 5),
        base44.entities.Job.filter({}, '-match_score', 5),
        base44.entities.Activity.filter({}, '-created_date', 8),
      ]);
      setData({ profile: profiles[0], approvals, notifs, tasks, leads, jobs, activities });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  if (mode === 'customer') return <CustomerHome token={token} />;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="w-7 h-7 border-[3px] border-stone-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  const profile = data?.profile;
  if (!profile?.onboarded) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mx-auto mb-5">
          <Sparkles className="w-8 h-8 text-stone-900" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-2xl font-semibold text-stone-800 mb-2">Welcome to Aurelius</h1>
        <p className="text-stone-500 mb-6 max-w-md mx-auto">
          Let's set up your operator profile so Aurelius can work the way you do — your skills, your style, your autonomy.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium transition-colors"
        >
          Begin onboarding <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const autonomyMode = profile.autonomy_mode || 'manual';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Command center */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="font-display text-[15px] font-semibold text-stone-700">Command Center</h2>
          <span className="text-[11px] text-stone-400 ml-auto capitalize">{autonomyMode} mode</span>
        </div>
        <div className="h-[420px] flex flex-col">
          <CommandConsole autonomyMode={autonomyMode} />
        </div>
      </section>

      {/* Pending approvals — prominent when present */}
      {data.approvals.length > 0 && (
        <section>
          <SectionHeader icon={AlertCircle} title="Pending Approvals" accent="amber" count={data.approvals.length} />
          <div className="grid sm:grid-cols-2 gap-3">
            {data.approvals.map((a) => (
              <div key={a.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-stone-800 truncate">{a.title}</div>
                    <div className="text-[12px] text-stone-500 mt-0.5 line-clamp-2">{a.description}</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded shrink-0">{a.action_type}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-5">
        <h2 className="font-display text-lg font-semibold text-stone-800">Aurelius CRM for smarter lead and job workflows</h2>
        <p className="mt-2 text-sm text-stone-500 max-w-3xl">Find qualified leads from Google Maps, track every contact, and match current job posts to your skills. Use CRM for relationship stages, Tasks for follow-ups, and Calendar for interviews and reminders.</p>
        <div className="mt-4 grid sm:grid-cols-3 gap-3 text-[12px] text-stone-600"><div><strong className="text-stone-800">How does lead search work?</strong><br/>Enter a search, choose contact requirements, and export verified results.</div><div><strong className="text-stone-800">How are jobs matched?</strong><br/>Aurelius scores title and description against your profile keywords.</div><div><strong className="text-stone-800">Need help?</strong><br/><a className="text-amber-700 underline" href="mailto:radzdomgallego4@gmail.com">Contact Radzdomgallego4@gmail.com</a></div></div>
      </section>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="Priorities" icon={ListTodo} count={data.tasks.length}>
          {data.tasks.length ? data.tasks.map((t) => (
            <Row key={t.id} title={t.title} sub={t.sub_agent ? `→ ${t.sub_agent}` : 'Aurelius'} tag={t.priority} status={t.status} />
          )) : <Empty label="Nothing pressing. Aurelius is idle." />}
        </Panel>

        <Panel title="Notifications" icon={Bell} count={data.notifs.length}>
          {data.notifs.length ? data.notifs.map((n) => (
            <div key={n.id} className="flex gap-2.5 py-2">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-stone-300' : n.severity === 'error' ? 'bg-red-400' : n.severity === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-medium text-stone-700 truncate">{n.title}</div>
                <div className="text-[11px] text-stone-400 truncate">{n.content}</div>
              </div>
            </div>
          )) : <Empty label="No notifications yet." />}
        </Panel>

        <Panel title="Top Leads" icon={Users} count={data.leads.length}>
          {data.leads.length ? data.leads.map((l) => (
            <div key={l.id} className="flex items-center gap-3 py-2">
              <ScoreBadge score={l.lead_score} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-700 truncate">{l.name}</div>
                <div className="text-[11px] text-stone-400 truncate">{l.company || l.industry}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">{l.status}</span>
            </div>
          )) : <Empty label="No leads yet. Ask Aurelius to find some." />}
        </Panel>

        <Panel title="Top Jobs" icon={Briefcase} count={data.jobs.length}>
          {data.jobs.length ? data.jobs.map((j) => (
            <div key={j.id} className="flex items-center gap-3 py-2">
              <ScoreBadge score={j.match_score} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-700 truncate">{j.title}</div>
                <div className="text-[11px] text-stone-400 truncate">{j.company}</div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-stone-400">{j.status}</span>
            </div>
          )) : <Empty label="No jobs yet. Ask Aurelius to hunt." />}
        </Panel>

        <Panel title="Recent Activity" icon={ActivityIcon} count={data.activities.length} wide>
          {data.activities.length ? data.activities.map((a) => (
            <div key={a.id} className="flex gap-2.5 py-1.5">
              <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === 'error' ? 'bg-red-400' : a.severity === 'warning' ? 'bg-amber-400' : a.severity === 'success' ? 'bg-emerald-400' : 'bg-stone-300'}`} />
              <div className="text-[12px] text-stone-600 flex-1">{a.description}</div>
              <span className="text-[10px] text-stone-300 shrink-0">{timeAgo(a.created_date)}</span>
            </div>
          )) : <Empty label="No activity yet." />}
        </Panel>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, accent }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${accent === 'amber' ? 'text-amber-500' : 'text-stone-400'}`} />
      <h3 className="font-display text-[14px] font-semibold text-stone-700">{title}</h3>
      {count > 0 && <span className="text-[11px] text-stone-400">{count}</span>}
    </div>
  );
}

function Panel({ title, icon: Icon, count, children, wide }) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-4 ${wide ? 'lg:col-span-2' : ''}`}>
      <SectionHeader icon={Icon} title={title} count={count} />
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function Row({ title, sub, tag, status }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <CheckCircle2 className="w-4 h-4 text-stone-300 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-stone-700 truncate">{title}</div>
        <div className="text-[11px] text-stone-400 truncate">{sub}</div>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-stone-400 shrink-0">{tag}</span>
    </div>
  );
}

function ScoreBadge({ score }) {
  const s = score || 0;
  const color = s >= 70 ? 'bg-emerald-100 text-emerald-700' : s >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500';
  return <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${color} shrink-0 tabular-nums`}>{s}</span>;
}

function Empty({ label }) {
  return <div className="py-6 text-center text-[12px] text-stone-400">{label}</div>;
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}