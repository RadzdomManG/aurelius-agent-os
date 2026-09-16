import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { usePortal } from '@/lib/PortalContext';
import { Sparkles, KeyRound, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

export default function AccessCodeLogin() {
  const { mode, login } = usePortal();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (mode === 'owner' || mode === 'customer') {
    return <Navigate to="/" replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim();
    if (!c || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await base44.functions.invoke('access_code_login', { code: c });
      const d = res.data || res;
      login(d.token, d.expires_at, d.label);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err?.data?.error || err?.message || 'Unable to verify code.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFB830] to-[#FF9500] flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-[22px] font-semibold text-stone-800">Aurelius CRM</h1>
          <p className="text-[13px] text-stone-400 mt-1">Enter your access code to continue</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium text-stone-500 mb-1.5 block">Access code</span>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
                placeholder="•••• ••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-200 text-[14px] tracking-wider focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-[12.5px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-[13.5px] font-medium disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Verifying…' : 'Enter portal'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link to="/login" className="text-[12px] text-stone-400 hover:text-stone-600">
            Owner sign in →
          </Link>
        </div>
      </div>
    </div>
  );
}