'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, IdCard, Lock } from 'lucide-react';
import { loginUser } from '@/lib/supabase';
import { saveSession } from '@/lib/session';
import { useSession } from '@/context/SessionProvider';
import SiteFooter from '@/components/SiteFooter';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { setSession, ready } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sessionNotice = useMemo(() => {
    if (searchParams.get('reason') === 'session') {
      return 'Your session expired. Please sign in again to continue.';
    }
    return null;
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter your ID and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await loginUser(identifier, password);
      saveSession(session);
      setSession(session);
      // Full navigation avoids App Router "before initialization" races
      window.location.assign('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1A56DB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Image
              src="/jazeera_logo.png"
              alt="JU"
              width={88}
              height={88}
              className="mx-auto h-auto w-[88px] rounded-2xl"
            />
            <h1 className="mt-4 text-xl font-bold text-[#1A56DB]">JU Item Recovery System</h1>
            <p className="mt-2 text-sm text-slate-500">Admin Web Console</p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/60">
            <h2 className="text-center text-3xl font-bold text-slate-900">Welcome Back.</h2>
            <p className="mt-2 text-center text-sm text-slate-500">Sign in with your administrator credentials</p>

            {sessionNotice ? (
              <div className="mt-6 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                {sessionNotice}
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  ID Number
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Admin ID (e.g. ADM-001)"
                    className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none"
                    autoCapitalize="none"
                  />
                  <IdCard size={18} className="text-slate-400" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <Lock size={18} className="text-slate-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#1E40AF] text-base font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#1A56DB] disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Students: use the mobile app to sign in and report items.
            </p>
          </div>
        </div>
      </div>
      <SiteFooter className="border-slate-100 bg-transparent" />
    </div>
  );
}
