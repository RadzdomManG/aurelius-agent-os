import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CheckSquare, Square } from 'lucide-react';

const COLUMNS = [
  { key: 'name', label: 'Lead' },
  { key: 'company', label: 'Company' },
  { key: 'industry', label: 'Industry' },
  { key: 'location', label: 'Location' },
  { key: 'status', label: 'Status' },
  { key: 'lead_score', label: 'Score' },
  { key: 'last_contacted', label: 'Last contact' },
];

function scoreTone(s) {
  if (s >= 80) return 'bg-amber-100 text-amber-700';
  if (s >= 50) return 'bg-stone-100 text-stone-600';
  return 'bg-stone-50 text-stone-400';
}

const STATUSES = ['new', 'qualified', 'contacted', 'replied', 'interested', 'follow_up', 'meeting', 'won', 'lost', 'do_not_contact'];

export default function LeadTable({ leads, onOpen, onBulkStatus, selected, setSelected }) {
  const [sortKey, setSortKey] = useState('lead_score');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    let r = leads.filter((l) => {
      if (statusFilter !== 'all' && (l.status || 'new') !== statusFilter) return false;
      if ((l.lead_score || 0) < minScore) return false;
      if (search) {
        const q = search.toLowerCase();
        return [l.name, l.company, l.industry, l.location, l.email].some((f) => (f || '').toLowerCase().includes(q));
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      const av = a[sortKey] || (sortKey === 'last_contacted' ? '' : 0);
      const bv = b[sortKey] || (sortKey === 'last_contacted' ? '' : 0);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [leads, search, statusFilter, minScore, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((l) => l.id));
  };
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-stone-100 bg-stone-50/50">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads…"
          className="flex-1 min-w-[160px] rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-amber-400"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-amber-400 capitalize">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-stone-500">
          Min score
          <input type="range" min={0} max={100} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="accent-amber-500" />
          <span className="tabular-nums w-7">{minScore}</span>
        </label>
      </div>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50/60 border-b border-amber-100">
          <span className="text-[12px] text-stone-600">{selected.length} selected</span>
          <select onChange={(e) => { if (e.target.value) { onBulkStatus(e.target.value); e.target.value = ''; } }}
            className="rounded-lg border border-stone-200 px-2 py-1 text-[12px] focus:outline-none focus:border-amber-400">
            <option value="">Change status…</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            <option value="do_not_contact">Do Not Contact</option>
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-stone-50/60 sticky top-0">
            <tr>
              <th className="w-9 px-3 py-2">
                <button onClick={toggleAll}>{selected.length && selected.length === filtered.length ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4 text-stone-300" />}</button>
              </th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 font-medium text-stone-500">
                  <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-stone-700">
                    {c.label}
                    {sortKey === c.key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((l) => (
              <tr key={l.id} onClick={() => onOpen(l)} className="hover:bg-stone-50 cursor-pointer">
                <td className="px-3 py-2" onClick={(e) => { e.stopPropagation(); toggleOne(l.id); }}>
                  {selected.includes(l.id) ? <CheckSquare className="w-4 h-4 text-amber-500" /> : <Square className="w-4 h-4 text-stone-300" />}
                </td>
                <td className="px-3 py-2 font-medium text-stone-800">{l.name}</td>
                <td className="px-3 py-2 text-stone-500">{l.company || '—'}</td>
                <td className="px-3 py-2 text-stone-500">{l.industry || '—'}</td>
                <td className="px-3 py-2 text-stone-500">{l.location || '—'}</td>
                <td className="px-3 py-2"><span className="capitalize text-stone-500">{(l.status || 'new').replace(/_/g, ' ')}</span></td>
                <td className="px-3 py-2"><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${scoreTone(l.lead_score)} tabular-nums`}>{l.lead_score || 0}</span></td>
                <td className="px-3 py-2 text-stone-400">{l.last_contacted ? new Date(l.last_contacted).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="text-center py-10 text-stone-400">No leads match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}