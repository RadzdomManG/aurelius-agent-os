import React, { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { KeyRound, Plus, Loader2, Ban, Check, Trash2, Copy, RefreshCw } from 'lucide-react';

export default function AccessCodes() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ label: '', max_uses: 0, expires_at: '' });
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    try {
      const c = await base44.entities.AccessCode.list('-created_date', 100);
      setCodes(c);
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setToast(null);
    try {
      const code = randomCode();
      await base44.entities.AccessCode.create({
        code,
        label: form.label.trim() || 'Untitled',
        active: true,
        max_uses: Number(form.max_uses) || 0,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        uses: 0,
      });
      setForm({ label: '', max_uses: 0, expires_at: '' });
      setToast({ ok: true, text: `Created ${code}` });
      load();
    } catch (err) {
      setToast({ ok: false, text: err.message || 'Failed to create code' });
    } finally { setBusy(false); }
  };

  const toggle = async (c) => {
    try { await base44.entities.AccessCode.update(c.id, { active: !c.active }); load(); }
    catch (e) { setToast({ ok: false, text: e.message }); }
  };

  const revoke = async (c) => {
    if (!confirm(`Revoke code "${c.label}"? This cannot be undone.`)) return;
    try { await base44.entities.AccessCode.delete(c.id); load(); }
    catch (e) { setToast({ ok: false, text: e.message }); }
  };

  const copy = (code) => { navigator.clipboard?.writeText(code); setToast({ ok: true, text: 'Copied to clipboard' }); };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-stone-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-500" /> Access Codes
          </h1>
          <p className="text-[13px] text-stone-400">{codes.length} codes · customer portal access</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-[12.5px] hover:border-stone-300">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <form onSubmit={create} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Label (e.g. Client A)"
            className="rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400 sm:col-span-2" />
          <input type="number" min={0} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            placeholder="Max uses (0 = ∞)"
            className="rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
          <input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            className="rounded-lg border border-stone-200 px-3 py-2 text-[12.5px] focus:outline-none focus:border-amber-400" />
        </div>
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13px] font-medium disabled:opacity-60">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create code
          </button>
        </div>
      </form>

      {toast && (
        <div className={`text-[12.5px] px-3 py-2 rounded-lg ${toast.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{toast.text}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-stone-50/60">
              <tr>
                {['Label', 'Code', 'Status', 'Uses', 'Expires', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-stone-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {codes.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-stone-400">No codes yet. Create one above.</td></tr>
              )}
              {codes.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) <= new Date();
                const exhausted = c.max_uses > 0 && (c.uses || 0) >= c.max_uses;
                const live = c.active && !expired && !exhausted;
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 font-medium text-stone-800">{c.label || '—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => copy(c.code)} className="inline-flex items-center gap-1.5 font-mono text-stone-600 hover:text-amber-600">
                        <Copy className="w-3 h-3 text-stone-400" /> {c.code?.slice(0, 10)}…
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded ${live ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'}`}>
                        {live ? <><Check className="w-3 h-3" /> Active</> : <><Ban className="w-3 h-3" /> {expired ? 'Expired' : exhausted ? 'Exhausted' : 'Disabled'}</>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-stone-500 tabular-nums">{c.uses || 0}{c.max_uses > 0 ? ` / ${c.max_uses}` : ''}</td>
                    <td className="px-3 py-2 text-stone-400">{c.expires_at ? new Date(c.expires_at).toLocaleString() : 'Never'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => toggle(c)} title={c.active ? 'Disable' : 'Enable'} className="text-stone-400 hover:text-amber-600">
                          {c.active ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => revoke(c)} title="Revoke" className="text-stone-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}`;
}