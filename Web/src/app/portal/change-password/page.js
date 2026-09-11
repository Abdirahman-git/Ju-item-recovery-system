'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSession } from '@/context/SessionProvider';
import { changeUserPassword } from '@/lib/portal';

export default function PortalChangePasswordPage() {
  const { session } = useSession();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState(null);

  const email = session?.email || '';
  const studentId = session?.studentId || session?.student_id || '';

  const strength =
    newPassword.length >= 10 ? 3 : newPassword.length >= 8 ? 2 : newPassword.length >= 6 ? 1 : 0;
  const strengthLabel = ['Too short', 'Fair', 'Good', 'Strong'][strength] || 'Too short';
  const strengthColor =
    ['bg-slate-200', 'bg-amber-400', 'bg-sky-500', 'bg-emerald-500'][strength] || 'bg-slate-200';

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordNotice({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    setPasswordNotice(null);

    try {
      await changeUserPassword({
        email,
        studentId,
        currentPassword,
        newPassword,
      });

      setPasswordNotice({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordNotice({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-in fade-in duration-300">
      <div>
        <Link
          href="/portal/profile"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          Back to Profile
        </Link>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">Change Password</h1>
        <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">
          Keep your JU LOFO account secure with a strong campus password.
        </p>
      </div>

      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8">
        <div
          aria-hidden
          className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl"
        />

        <div className="relative mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A56DB] to-[#1E40AF] text-white shadow-lg shadow-blue-500/25">
            <KeyRound size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-950">Update credentials</h2>
            <p className="text-xs font-medium text-slate-500">
              Use your current password, then choose a new one.
            </p>
          </div>
        </div>

        {passwordNotice ? (
          <div
            className={`relative mb-5 flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold ${
              passwordNotice.type === 'success'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {passwordNotice.type === 'success' ? (
              <CheckCircle2 size={18} className="flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="flex-shrink-0" />
            )}
            <span>{passwordNotice.text}</span>
          </div>
        ) : null}

        <form onSubmit={handlePasswordSubmit} className="relative space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
              Current Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Toggle current password"
              >
                {showCurrent ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
              New Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showNew ? 'text' : 'password'}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Toggle new password"
              >
                {showNew ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 gap-1 overflow-hidden rounded-full">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-full flex-1 rounded-full transition ${
                      strength > i ? strengthColor : 'bg-slate-100'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-500">{strengthLabel}</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-700">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#1A56DB] focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3.5 py-3 text-[11px] font-medium text-slate-500">
            <Shield size={14} className="mt-0.5 flex-shrink-0 text-[#1A56DB]" />
            <span>
              After updating, use the new password the next time you sign in on web or mobile.
            </span>
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1A56DB] to-[#1E40AF] text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:opacity-50"
          >
            {savingPassword ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Updating password…
              </>
            ) : (
              <>
                <KeyRound size={16} />
                Update Password
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
