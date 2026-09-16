import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, SlidersHorizontal, Loader2, Sparkles } from 'lucide-react';

export default function LeadComposer({ onDone }) {
  const [message, setMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ industry: '', location: '', keywords: '', service: '', company_type: '' });
  const [count, setCount] = useState(20);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const run = async () => {
    const q = message.trim() || filters.keywords || filters.service;
    if (!q || busy) return;
    setBusy(true);
    setToast(null);
    try {
      const res = await base44.functions.invoke('lead_discovery', { message: q, filters, count });
      const d = res.data || res;
      const resultIds = (d.leads || []).map((x) => x.id).filter(Boolean);
      let localCount = 0;
      const resultIds = (d.leads || []).map((x) => x.id).filter(Boolean);
      try {
        const local = await fetch('http://127.0.0.1:5000/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Access-Code': 'AGS-DEMO-2026' }, body: JSON.stringify({ keyword: q, location: filters.location || 'United States', limit: count }) });
        if (local.ok) {
          const ld = await local.json();
          for (const row of (ld.leads || []).slice(0, count)) {
            const name = row.Name || row.name || row.Business || row.business_name || row.Company || row.company;
            if (!name) continue;
            const created = await base44.entities.Lead.create({ name: String(name), company: String(row.Company || row.company || name), website: String(row.Website || row.website || ''), email: String(row.Email || row.email || ''), phone: String(row.Phone || row['Phone Number'] || row.phone || ''), location: String(row.Address || row.address || filters.location || ''), industry: q, source: 'Google Maps scraper', status: 'new', lead_score: 60 });
            if (created?.id) resultIds.push(created.id);
            localCount++;
          }
        }
      } catch (_) { /* local scraper is optional when this browser cannot reach localhost */ }
      setToast({ ok: true, text: `Found ${d.found} AI leads + ${localCount} Google Maps leads · ${d.duplicates} duplicates removed · ${d.high_quality} high-quality` });
      onDone?.({ ...d, ids: resultIds });
      setMessage('');
    } catch (e) {
      setToast({ ok: false, text: e.message || 'Discovery failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && run()}
            placeholder="Describe the leads you want — e.g. 30 agencies that need AI influencers"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-[13.5px] focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[12.5px] transition-colors ${showFilters ? 'border-amber-400 bg-amber-50/50 text-stone-700' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
        </button>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
          {busy ? 'Searching…' : 'Find leads'}
        </button>
      </div>

      {showFilters && (
        <><div className="mt-3 mb-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11.5px] text-blue-700">Google Maps scraper: enter a keyword and location, choose a count, then click Find leads. The local scraper must be running with access code AGS-DEMO-2026.</div>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          <FilterInput label="Industry" value={filters.industry} onChange={(v) => setFilters({ ...filters, industry: v })} placeholder="Marketing" />
          <FilterInput label="Location" value={filters.location} onChange={(v) => setFilters({ ...filters, location: v })} placeholder="United States" />
          <FilterInput label="Keywords" value={filters.keywords} onChange={(v) => setFilters({ ...filters, keywords: v })} placeholder="AI content" />
          <FilterInput label="Service needed" value={filters.service} onChange={(v) => setFilters({ ...filters, service: v })} placeholder="AI influencer" />
          <label className="block">
            <span className="text-[10.5px] font-medium text-stone-500 mb-1 block">Count</span>
            <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value) || 20)}
              className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
          </label>
        </div></>
      )}

      {toast && (
        <div className={`mt-3 text-[12px] px-3 py-2 rounded-lg ${toast.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-medium text-stone-500 mb-1 block">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-stone-200 px-2.5 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
    </label>
  );
}