import React, { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import JobsPipeline from '@/components/jobs/JobsPipeline';
import JobsTable from '@/components/jobs/JobsTable';
import JobDetailDrawer from '@/components/jobs/JobDetailDrawer';
import { KanbanSquare, Table2, Loader2, RefreshCw, Radio } from 'lucide-react';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('aurelius_jobs_view') || 'pipeline');
  const [openJob, setOpenJob] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const j = await base44.entities.Job.list('-created_date', 500);
      setJobs(j);
    } catch { /* noop */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const setViewP = (v) => { setView(v); localStorage.setItem('aurelius_jobs_view', v); };

  const refresh = () => { setRefreshing(true); load(); };

  const moveJob = async (id, status) => {
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, status } : j)));
    try { await base44.entities.Job.update(id, { status }); } catch { load(); }
  };

  const newCount = jobs.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-800 flex items-center gap-2">
            Jobs
            <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Radio className="w-3 h-3" /> Live
            </span>
          </h1>
          <p className="text-[13px] text-stone-400">{newCount} jobs · auto-refreshing every 30s from your local watcher</p>
        </div>
        <div className="inline-flex items-center gap-2">
          <button onClick={refresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-[12.5px] hover:border-stone-300">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="inline-flex rounded-xl border border-stone-200 bg-white p-0.5">
            <button onClick={() => setViewP('pipeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] transition-colors ${view === 'pipeline' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>
              <KanbanSquare className="w-3.5 h-3.5" /> Pipeline
            </button>
            <button onClick={() => setViewP('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] transition-colors ${view === 'table' ? 'bg-stone-900 text-white' : 'text-stone-500'}`}>
              <Table2 className="w-3.5 h-3.5" /> Table
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-stone-400 text-sm">
          No jobs yet. Start your local watcher.py bot to stream OnlineJobs.ph posts here in real time.
        </div>
      ) : view === 'pipeline' ? (
        <JobsPipeline jobs={jobs} onMove={moveJob} onOpen={setOpenJob} />
      ) : (
        <JobsTable jobs={jobs} onOpen={setOpenJob} />
      )}

      <JobDetailDrawer job={openJob} onClose={() => setOpenJob(null)} onUpdated={(j) => setJobs((js) => js.map((x) => (x.id === j.id ? j : x)))} />
    </div>
  );
}