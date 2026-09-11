'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Outfit, Fraunces } from 'next/font/google';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginUser } from '@/lib/supabase';
import { saveSession } from '@/lib/session';
import { useSession } from '@/context/SessionProvider';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-login-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-login-display',
});

const LOGO = '/jazeera_logo_clear.png';

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
      const session = await loginUser(identifier, password, { adminOnly: false });
      saveSession(session);
      setSession(session);
      if (session.role === 'admin') {
        window.location.assign('/admin');
      } else {
        window.location.assign('/portal');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className={`${outfit.variable} flex min-h-screen items-center justify-center bg-[#0B1F3A]`}>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
      </div>
    );
  }

  const year = new Date().getFullYear();

  return (
    <div
      className={`${outfit.variable} ${fraunces.variable} relative min-h-screen bg-[#0B1F3A] text-slate-900 antialiased [-webkit-font-smoothing:antialiased]`}
      style={{ fontFamily: 'var(--font-login-sans), system-ui, sans-serif' }}
    >
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden min-h-screen overflow-hidden lg:block">
          <Image
            src="/ju-campus-hero.jpg"
            alt="Jazeera University campus"
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(165deg, rgba(11,31,58,0.62) 0%, rgba(11,31,58,0.2) 42%, rgba(11,31,58,0.82) 100%)',
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
            <div className="flex items-center gap-3.5">
              <Image
                src={LOGO}
                alt="Jazeera University"
                width={64}
                height={64}
                className="h-16 w-16 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
                style={{ width: 64, height: 64 }}
                priority
              />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
                  Jazeera University
                </p>
                <p className="text-sm font-semibold text-white">Lost &amp; Found desk</p>
              </div>
            </div>

            <div className="max-w-md [animation:loginRise_0.7s_cubic-bezier(0.2,0,0,1)_both]">
              <h1
                className="text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-white xl:text-[3.15rem]"
                style={{ fontFamily: 'var(--font-login-display), Georgia, serif', textWrap: 'balance' }}
              >
                JU Lost Item System
              </h1>
              <p
                className="mt-4 max-w-sm text-[15px] font-medium leading-relaxed text-white/80"
                style={{ textWrap: 'pretty' }}
              >
                The official campus console for recovering what students and staff leave behind.
              </p>
            </div>

            <p className="text-[12px] font-medium text-white/55">
              © {year} Jazeera University · JU Lost Item System
            </p>
          </div>
        </aside>

        <main className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 45% at 80% -10%, rgba(26,86,219,0.14), transparent 55%), radial-gradient(ellipse 50% 35% at 0% 100%, rgba(5,150,105,0.06), transparent 50%), linear-gradient(165deg, #F8FAFC 0%, #EEF3F9 55%, #E8EEF6 100%)',
            }}
          />

          <div className="relative mx-auto w-full max-w-[420px] [animation:loginRise_0.55s_cubic-bezier(0.2,0,0,1)_0.06s_both]">
            <div className="mb-8 text-center lg:hidden">
              <Image
                src={LOGO}
                alt="Jazeera University"
                width={80}
                height={80}
                priority
                className="mx-auto h-20 w-20 object-contain drop-shadow-md"
                style={{ width: 80, height: 80 }}
              />
              <h1
                className="mt-4 text-[1.7rem] font-semibold tracking-tight text-slate-950"
                style={{ fontFamily: 'var(--font-login-display), Georgia, serif', textWrap: 'balance' }}
              >
                JU Lost Item System
              </h1>
              <p className="mt-1.5 text-sm font-medium text-slate-500">Admin console</p>
            </div>

            {/* Cool form shell */}
            <div
              className="rounded-[28px] border border-white/70 p-6 shadow-[0_1px_0_rgba(15,23,42,0.04)_inset,0_30px_80px_-40px_rgba(15,23,42,0.45)] sm:p-8"
              style={{
                background:
                  'linear-gradient(155deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 100%)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <div className="hidden lg:block">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#1A56DB]/15 bg-[#1A56DB]/[0.06] px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1A56DB]" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1A56DB]">
                    University Portal &amp; Admin
                  </span>
                </div>
                <h2
                  className="mt-4 text-[2rem] font-semibold tracking-tight text-slate-950"
                  style={{ fontFamily: 'var(--font-login-display), Georgia, serif' }}
                >
                  Sign in
                </h2>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500" style={{ textWrap: 'pretty' }}>
                  Sign in with your Student ID, Staff ID, or Administrator credentials.
                </p>
              </div>

              <div className="mt-6 lg:mt-7">
                {sessionNotice ? (
                  <div className="mb-4 rounded-2xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm font-semibold text-amber-900">
                    {sessionNotice}
                  </div>
                ) : null}

                {error ? (
                  <div className="mb-4 rounded-2xl border border-red-200/90 bg-red-50/90 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      ID number
                    </span>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. CS2600123 or ADM-001"
                      className="h-[3.15rem] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 text-[15px] font-semibold text-slate-900 outline-none transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1A56DB]/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(26,86,219,0.14)]"
                      autoCapitalize="none"
                      autoComplete="username"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                      Password
                    </span>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-[3.15rem] w-full rounded-2xl border border-slate-200/80 bg-white/90 py-0 pl-4 pr-12 text-[15px] font-semibold text-slate-900 outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-[#1A56DB]/55 focus:bg-white focus:shadow-[0_0_0_4px_rgba(26,86,219,0.14)]"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100/90 hover:text-slate-700"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="relative h-[18px] w-[18px]">
                          <Eye
                            size={18}
                            className="absolute inset-0 transition-[opacity,filter,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                            style={{
                              opacity: showPassword ? 0 : 1,
                              filter: showPassword ? 'blur(4px)' : 'blur(0px)',
                              transform: showPassword ? 'scale(0.25)' : 'scale(1)',
                            }}
                          />
                          <EyeOff
                            size={18}
                            className="absolute inset-0 transition-[opacity,filter,transform] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                            style={{
                              opacity: showPassword ? 1 : 0,
                              filter: showPassword ? 'blur(0px)' : 'blur(4px)',
                              transform: showPassword ? 'scale(1)' : 'scale(0.25)',
                            }}
                          />
                        </span>
                      </button>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-3 flex h-[3.15rem] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#2B6CF0] to-[#1A56DB] text-[15px] font-bold text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_14px_32px_-12px_rgba(26,86,219,0.7)] transition-[transform,filter,opacity] duration-150 hover:brightness-110 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-60"
                  >
                    {loading ? (
                      'Signing in…'
                    ) : (
                      <>
                        Sign In
                        <ArrowRight
                          size={17}
                          strokeWidth={2.4}
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 flex flex-col gap-2.5 text-center text-[12px] font-medium text-slate-500">
                  <p>
                    Students &amp; Staff: Sign in to access your portal, report items, and track claims.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-1">
                    <a
                      href="/browse"
                      className="font-semibold text-[#1A56DB] hover:underline"
                    >
                      Browse public feed
                    </a>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">JU Item Recovery</span>
                  </div>
                </div>
              </div>
            </div>

            <footer className="mt-8 text-center lg:text-left">
              <p className="text-[12px] font-semibold tracking-tight text-slate-600">
                © {year} Jazeera University ·{' '}
                <span className="text-[#1A56DB]">JU Lost Item System</span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-400">
                Official Lost &amp; Found console · All rights reserved
              </p>
            </footer>
          </div>
        </main>
      </div>

      <style jsx global>{`
        @keyframes loginRise {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
