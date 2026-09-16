import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Users, Briefcase, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CustomerHome({ token }) {
  const [leads, setLeads] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [l, j] = await Promise.all([
        base44.functions.invoke('customer_data', { token, resource: 'leads' }),
        base44.functions.invoke('customer_data', { token, resource: 'jobs' }),
      ]);
      setLeads((l.data || l).rows || []);
      setJobs((j.data || j).rows || []);
    } catch (e) {
      setErr(e?.data?.error || e?.message || 'Unable to load data.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>;

  if (err) return <div className="max-w-md mx-auto mt-20 text-center text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{err}</div>;

  const highLeads = leads.filter((l) => (l.lead_score || 0) >= 70).length;
  const highJobs = jobs.filter((j) => (j.match_score || 0) >= 70).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h1 className="font-display text-lg font-semibold text-stone-800">Welcome to Aurelius CRM</h1>
        </div>
        <p className="text-sm text-stone-500 max-w-2xl">A live view of active leads and job opportunities, managed by Aurelius. Browse the pipeline and job board below.</p>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={Users} label="Leads" total={leads.length} high={highLeads} onClick={() => navigate('/leads')} />
        <StatCard icon={Briefcase} label="Jobs" total={jobs.length} high={highJobs} onClick={() => navigate('/jobs')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Top Leads" onMore={() => navigate('/leads')}>
          {leads.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center gap-3 py-2">
              <ScoreBadge score={l.lead_score} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-700 truncate">{l.name}</div>
                <div className="text-[11px] text-stone-400 truncate">{l.company || l.industry}</div>
              </div>
            </div>
          ))}
          {leads.length === 0 && <div className="py-6 text-center text-[12px] text-stone-400">No leads yet.</div>}
        </Panel>
        <Panel title="Top Jobs" onMore={() => navigate('/jobs')}>
          {jobs.slice(0, 5).map((j) => (
            <div key={j.id} className="flex items-center gap-3 py-2">
              <ScoreBadge score={j.match_score} />
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-stone-700 truncate">{j.title}</div>
                <div className="text-[11px] text-stone-400 truncate">{j.company}</div>
              </div>
            </div>
          ))}
          {jobs.length === 0 && <div className="py-6 text-center text-[12px] text-stone-400">No jobs yet.</div>}
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, total, high, onClick }) {
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-stone-200 bg-white p-5 hover:border-amber-300 transition-colors">
      <div className="flex items-center gap-2 text-stone-400 text-[11px] uppercase tracking-wider"><Icon className="w-3.5 h-3.5" /> {label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-3xl font-semibold text-stone-800 tabular-nums">{total}</span>
        {high > 0 && <span className="text-[12px] text-amber-600">{high} high-score</span>}
      </div>
    </button>
  );
}

function Panel({ title, onMore, children }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display text-[14px] font-semibold text-stone-700">{title}</h3>
        <button onClick={onMore} className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-amber-600">View all <ArrowRight className="w-3 h-3" /></button>
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const s = score || 0;
  const color = s >= 70 ? 'bg-amber-100 text-amber-700' : s >= 40 ? 'bg-stone-100 text-stone-600' : 'bg-stone-50 text-stone-400';
  return <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${color} shrink-0 tabular-nums`}>{s}</span>;
}