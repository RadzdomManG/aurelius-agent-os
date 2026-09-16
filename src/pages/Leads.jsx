import React, { useEffect, useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { usePortal } from '@/lib/PortalContext';
import { useLeadApi } from '@/lib/leadApi';
import LeadComposer from '@/components/leads/LeadComposer';
import LeadPipeline from '@/components/leads/LeadPipeline';
import LeadTable from '@/components/leads/LeadTable';
import LeadDetailDrawer from '@/components/leads/LeadDetailDrawer';
import { KanbanSquare, Table2, Loader2 } from 'lucide-react';

export default function Leads() {
  const { mode, token } = usePortal();
  const isCustomer = mode === 'customer';
  const showScore = false;
  const leadApi = useLeadApi();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('aurelius_leads_view') || 'pipeline');
  const [openLead, setOpenLead] = useState(null);
  const [selected, setSelected] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      if (!showHistory) { setLeads([]); return; }
      if (isCustomer) {
        const res = await base44.functions.invoke('customer_data', { token, resource: 'leads' });
        setLeads((res.data || res).rows || []);
      } else {
        const l = await base44.entities.Lead.list('-created_date', 300);
        setLeads(l);
      }
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [isCustomer, token, showHistory]);

  useEffect(() => {
    if (showHistory) load();
    else setLoading(false);
    pollRef.current = setInterval(() => { if (showHistory) load(); }, 10000);
    return () => clearInterval(pollRef.current);
  }, [load, showHistory]);

  const setViewP = (v) => { setView(v); localStorage.setItem('aurelius_leads_view', v); };

  const moveLead = async (id, status) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    try { await leadApi.updateLead(id, { status }); } catch { load(); }
  };

  const exportCsv = () => {
    const headers = ['Name', 'Company', 'Owner', 'Email', 'Phone', 'Website', 'Location', 'Industry', 'Source'];
    const rows = leads.map((l) => [l.name, l.company, l.owner_name, l.email, l.phone, l.website, l.location, l.industry, l.source]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'aurelius-leads.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bulkStatus = async (status) => {
    await leadApi.bulkStatus(selected, status);
    setSelected([]);
    load();
  };

  const showBoard = isCustomer || hasSearched || showHistory;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-800">Leads</h1>
          <p className="text-[13px] text-stone-400">
            {leads.length > 0
              ? `${leads.length} prospects · scored by Aurelius`
              : hasSearched ? 'No prospects found yet — try widening your location' : 'Run a search to load leads'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory((v) => !v)} className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-[12px] text-stone-600 hover:border-amber-300">{showHistory ? 'Current search' : 'Lead history'}</button>
          <button onClick={exportCsv} disabled={!leads.length} className="px-3 py-1.5 rounded-xl bg-stone-900 text-white text-[12px] disabled:opacity-40">Export CSV</button>
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

      <LeadComposer onDone={async (result) => { setHasSearched(true); setShowHistory(false); if (result?.ids?.length) { try { const all = await base44.entities.Lead.list('-created_date', 300); setLeads(all.filter((x) => result.ids.includes(x.id))); } catch { setLeads([]); } } else setLeads([]); }} />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
      ) : !showBoard ? (
        <div className="text-center py-20 text-stone-400 text-sm">No leads loaded. Use the search above to find leads, or click Lead history to view previously discovered leads.</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-20 text-stone-400 text-sm">No leads yet. Use the search above to have Aurelius find prospects for you.</div>
      ) : view === 'pipeline' ? (
        <LeadPipeline leads={leads} onMove={moveLead} onOpen={setOpenLead} showScore={showScore} />
      ) : (
        <LeadTable leads={leads} onOpen={setOpenLead} onBulkStatus={bulkStatus} selected={selected} setSelected={setSelected} showScore={showScore} />
      )}

      <LeadDetailDrawer lead={openLead} onClose={() => setOpenLead(null)} onUpdated={(l) => { setLeads((ls) => ls.map((x) => (x.id === l.id ? l : x))); }} showScore={showScore} />
    </div>
  );
}