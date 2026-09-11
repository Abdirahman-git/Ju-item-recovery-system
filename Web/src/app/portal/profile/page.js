'use client';

import Link from 'next/link';
import {
  User,
  Mail,
  Phone,
  School,
  IdCard,
  LogOut,
  KeyRound,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';

function InfoTile({ icon: Icon, label, value, tone }) {
  const tones = {
    blue: 'bg-blue-50 text-[#1A56DB]',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${tones[tone] || tones.blue}`}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {label}
          </span>
          <span className="mt-1 block text-sm font-bold leading-snug text-slate-900 break-words">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PortalProfilePage() {
  const { session, logout, ready } = useSession();

  const userName = session?.userName || session?.name || 'User';
  const studentId = session?.studentId || session?.student_id || '—';
  const email = session?.email || '—';
  const phone = session?.phone || 'Not provided';
  const faculty = session?.faculty || 'Jazeera University';
  const initial = userName.charAt(0).toUpperCase();
  const roleLabel =
    session?.role === 'admin' ? 'Administrator' : session?.role === 'staff' ? 'Staff' : 'Student';

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in duration-300">
      {/* Hero profile */}
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-[#0B1F3A] via-[#1A56DB] to-[#3B82F6]"
        />
        <div
          aria-hidden
          className="absolute -right-8 top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"
        />

        <div className="relative px-6 pb-6 pt-16 sm:px-8 sm:pb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
              <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border-4 border-white bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] text-3xl font-black text-white shadow-xl shadow-blue-900/25">
                {ready ? initial : '·'}
              </div>
              <div className="text-center sm:pb-1 sm:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#1A56DB]">
                  <ShieldCheck size={12} />
                  {roleLabel}
                </span>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {userName}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500">ID · {studentId}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Link
                href="/portal/change-password"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1A56DB] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700"
              >
                <KeyRound size={15} />
                Change Password
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account details */}
      <section className="rounded-[28px] border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-950">Account Information</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Your campus directory details used for JU LOFO recovery.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoTile icon={User} label="Full Name" value={userName} tone="blue" />
          <InfoTile icon={IdCard} label="University ID" value={studentId} tone="violet" />
          <InfoTile icon={School} label="Faculty / Department" value={faculty} tone="amber" />
          <InfoTile icon={Phone} label="Phone Number" value={phone} tone="emerald" />
          <div className="sm:col-span-2">
            <InfoTile icon={Mail} label="Email Address" value={email} tone="rose" />
          </div>
        </div>
      </section>
    </div>
  );
}
