import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';

const COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'posted_at', label: 'Posted' },
  { key: 'status', label: 'Status' },
  { key: 'match_score', label: 'Match' },
];

function formatPosted(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true });
}

function scoreTone(s) {
  if (s >= 70) return 'bg-amber-100 text-amber-700';
  if (s >= 40) return 'bg-stone-100 text-stone-600';
  return 'bg-stone-50 text-stone-400';
}

const STATUSES = ['saved', 'reviewing', 'apply', 'applied', 'interview', 'rejected', 'offer', 'ignore'];

export default function JobsTable({ jobs, onOpen }) {
  const [sortKey, setSortKey] = useState('posted_at');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    let r = jobs.filter((j) => {
      if (statusFilter !== 'all' && (j.status || 'saved') !== statusFilter) return false;
      if ((j.match_score || 0) < minScore) return false;
      if (search) {
        const q = search.toLowerCase();
        return [j.title, j.company, j.location, j.source].some((f) => (f || '').toLowerCase().includes(q));
      }
      return true;
    });
    r = [...r].sort((a, b) => {
      const av = a[sortKey] || (typeof a[sortKey] === 'string' ? '' : 0);
      const bv = b[sortKey] || (typeof b[sortKey] === 'string' ? '' : 0);
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [jobs, search, statusFilter, minScore, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 p-3 border-b border-stone-100 bg-stone-50/50">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs…"
          className="flex-1 min-w-[160px] rounded-lg border border-stone-200 px-3 py-1.5 text-[12.5px] focus:outline-none focus:border-amber-400"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12.5px] focus:outline-none focus:border-amber-400 capitalize">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-stone-500">
          Min match
          <input type="range" min={0} max={100} step={10} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="accent-amber-500" />
          <span className="tabular-nums w-7">{minScore}</span>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead className="bg-stone-50/60 sticky top-0">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className="text-left px-3 py-2 font-medium text-stone-500">
                  <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 hover:text-stone-700">
                    {c.label}
                    {sortKey === c.key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </button>
                </th>
              ))}
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtered.map((j) => (
              <tr key={j.id} onClick={() => onOpen(j)} className="hover:bg-stone-50 cursor-pointer">
                <td className="px-3 py-2 font-medium text-stone-800 max-w-[280px] truncate">{String(j.title || '').replace(/^\[(onlinejobsph|olj)\]\s*/i, '')}</td>
                <td className="px-3 py-2 text-stone-500 tabular-nums">{formatPosted(j.posted_at || j.created_date)}</td>
                <td className="px-3 py-2"><span className="capitalize text-stone-500">{(j.status || 'saved').replace(/_/g, ' ')}</span></td>
                <td className="px-3 py-2"><span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${scoreTone(j.match_score)} tabular-nums`}>{j.match_score || 0}</span></td>
                <td className="px-3 py-2 text-right">
                  {j.url && <a href={j.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-stone-400 hover:text-amber-600"><ExternalLink className="w-3.5 h-3.5" /></a>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="text-center py-10 text-stone-400">No jobs match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}