'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { changeAdminPassword } from '@/lib/supabase';
import { useAdminHeaderActions } from '@/context/AdminHeaderActionsContext';
import { useSession } from '@/context/SessionProvider';

const INITIAL_FORM = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const SECURITY_TIPS = [
  'Use 8+ characters with uppercase, numbers, and symbols.',
  'Do not reuse this password on other apps or websites.',
  'Change it immediately if you shared it with anyone.',
  'Avoid your name, ID, or phone number in the password.',
];

const STEPS = [
  { id: 'current', label: 'Verify', hint: 'Current password' },
  { id: 'new', label: 'Create', hint: 'New password' },
  { id: 'confirm', label: 'Confirm', hint: 'Match & save' },
];

function passwordsMatch(newPassword, confirmPassword) {
  return Boolean(newPassword && confirmPassword && newPassword === confirmPassword);
}

function PasswordField({ label, value, onChange, visible, onToggle, placeholder, state = 'default', hint }) {
  const boxClass =
    state === 'success'
      ? 'border-emerald-300 bg-emerald-50/60 ring-emerald-100'
      : state === 'error'
        ? 'border-red-300 bg-red-50/60 ring-red-100'
        : 'border-slate-200 bg-white ring-slate-100';

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-600">{label}</span>
        {hint ? (
          <span
            className={`text-[11px] font-bold ${
              state === 'success' ? 'text-emerald-600' : state === 'error' ? 'text-red-600' : 'text-slate-400'
            }`}
          >
            {hint}
          </span>
        ) : null}
      </div>
      <div className={`flex h-[52px] items-center gap-3 rounded-2xl border px-4 shadow-sm ring-4 transition ${boxClass}`}>
        <Lock size={17} className="shrink-0 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
          aria-label={visible ? 'Hide' : 'Show'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}

function SuccessModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-md">
      <div className="glass-modal w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100">
          <CheckCircle2 size={40} />
        </div>
        <h3 className="mt-5 text-2xl font-black text-slate-950">Password updated!</h3>
        <p className="mt-2 text-sm text-slate-500">Your admin account is now protected with the new password.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/admin/profile" className="glass-button flex-1 rounded-2xl py-3 text-sm font-black text-slate-600">
            Profile
          </Link>
          <button type="button" onClick={onClose} className="flex-1 rounded-2xl bg-[#1A56DB] py-3 text-sm font-black text-white">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordClient() {
  const { session } = useSession();
  const { setActions, clearActions } = useAdminHeaderActions();
  const [form, setForm] = useState(INITIAL_FORM);
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const matches = passwordsMatch(form.newPassword, form.confirmPassword);
  const confirmMismatch = Boolean(form.confirmPassword && !matches);
  const sameAsCurrent = Boolean(
    form.newPassword && form.currentPassword && form.newPassword === form.currentPassword
  );

  const currentDone = form.currentPassword.length >= 4;
  const newDone = form.newPassword.length >= 4 && !sameAsCurrent;
  const confirmDone = matches && newDone;
  const activeStep = !currentDone ? 0 : !newDone ? 1 : !confirmDone ? 2 : 3;
  const canSubmit = currentDone && newDone && confirmDone && !saving;
  const progressPct = activeStep === 3 ? 100 : ((activeStep + 0.35) / 3) * 100;

  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % SECURITY_TIPS.length), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setActions(
      <Link
        href="/admin/profile"
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/70 bg-white/50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
      >
        <ArrowLeft size={14} />
        <span className="hidden sm:inline">Back to Profile</span>
      </Link>
    );
    return () => clearActions();
  }, [setActions, clearActions]);

  const updateField = useCallback((field, value) => {
    setForm((c) => ({ ...c, [field]: value }));
    setMessage(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.currentPassword) {
      setMessage({ type: 'error', text: 'Geli password-ka hadda jira.' });
      return;
    }
    if (form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password cusub waa in uu ugu yaraan 6 xaraf yahay.' });
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setMessage({ type: 'error', text: 'Password cusub ma noqon karo mid la mid ah kan hore.' });
      return;
    }
    if (!form.confirmPassword) {
      setMessage({ type: 'error', text: 'Ku celi password-ka cusub si loo xaqiijiyo.' });
      return;
    }
    if (!passwordsMatch(form.newPassword, form.confirmPassword)) {
      setMessage({ type: 'error', text: 'Password-yada cusub isma laha — isku mid ka dhig.' });
      return;
    }
    if (!canSubmit) return;

    setSaving(true);
    setMessage(null);
    try {
      await changeAdminPassword({
        email: session?.email,
        studentId: session?.studentId,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(INITIAL_FORM);
      setShowSuccess(true);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not update password.' });
    } finally {
      setSaving(false);
    }
  };

  const email = session?.email || 'admin@ju.edu.so';

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(26,86,219,0.12)]">
          <div className="grid lg:grid-cols-5">
            {/* ── LEFT: blue info panel (Tailwind only — always visible) ── */}
            <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#0f172a] p-7 text-white lg:col-span-2 lg:min-h-[480px]">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-300/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-indigo-400/20 blur-3xl" />

              <div className="relative">
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                  <KeyRound size={26} />
                </div>
                <h2 className="text-2xl font-black leading-tight sm:text-3xl">Change Password</h2>
                <p className="mt-3 text-sm leading-relaxed text-blue-100">
                  3 tallaabo fudud: verify → create → confirm. Password-ku waa in uu noqdaa mid adag oo gaar ah.
                </p>

                {/* Step pills on mobile-hidden duplicate — show mini list on left */}
                <ol className="mt-8 space-y-3">
                  {STEPS.map((step, i) => {
                    const done = i === 0 ? currentDone : i === 1 ? newDone : confirmDone;
                    const active = activeStep === i;
                    return (
                      <li
                        key={step.id}
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                          done
                            ? 'border-emerald-300/40 bg-emerald-500/20'
                            : active
                              ? 'border-white/40 bg-white/15'
                              : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                            done ? 'bg-emerald-400 text-white' : active ? 'bg-white text-[#1D4ED8]' : 'bg-white/20 text-white/70'
                          }`}
                        >
                          {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold">{step.label}</p>
                          <p className="text-[11px] text-blue-100/80">{step.hint}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="relative mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-2">
                  <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-300" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-100">Security tip</p>
                    <p className="mt-1.5 text-sm leading-snug text-white/90">{SECURITY_TIPS[tipIndex]}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: form ── */}
            <div className="bg-gradient-to-b from-slate-50 to-white p-6 sm:p-8 lg:col-span-3">
              {/* Progress bar */}
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
                  <span>Progress</span>
                  <span className="normal-case tracking-normal text-slate-600">
                    {activeStep >= 3 ? 'Ready to save' : `Step ${activeStep + 1} of 3`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] transition-all duration-500 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">{email}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {message ? (
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
                      message.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    <XCircle size={16} />
                    {message.text}
                  </div>
                ) : null}

                <PasswordField
                  label="1 · Current password"
                  value={form.currentPassword}
                  onChange={(v) => updateField('currentPassword', v)}
                  visible={visible.current}
                  onToggle={() => setVisible((c) => ({ ...c, current: !c.current }))}
                  placeholder="Password-ka hadda jira"
                  state={currentDone ? 'success' : 'default'}
                  hint={currentDone ? 'OK' : 'Required'}
                />

                <PasswordField
                  label="2 · New password"
                  value={form.newPassword}
                  onChange={(v) => updateField('newPassword', v)}
                  visible={visible.next}
                  onToggle={() => setVisible((c) => ({ ...c, next: !c.next }))}
                  placeholder="Password cusub"
                  state={sameAsCurrent ? 'error' : newDone ? 'success' : 'default'}
                  hint={sameAsCurrent ? 'Must differ' : newDone ? 'OK' : 'Min 4 chars'}
                />

                {sameAsCurrent ? (
                  <p className="text-center text-xs font-bold text-red-500">
                    Password cusub waa in uu ka duwan yahay kan hadda jira.
                  </p>
                ) : null}

                <PasswordField
                  label="3 · Confirm password"
                  value={form.confirmPassword}
                  onChange={(v) => updateField('confirmPassword', v)}
                  visible={visible.confirm}
                  onToggle={() => setVisible((c) => ({ ...c, confirm: !c.confirm }))}
                  placeholder="Ku celi password-ka cusub"
                  state={confirmDone ? 'success' : confirmMismatch ? 'error' : 'default'}
                  hint={confirmDone ? 'Match ✓' : confirmMismatch ? 'No match' : form.newPassword ? 'Compare' : ''}
                />

                {form.newPassword && form.confirmPassword ? (
                  <div
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                      confirmDone
                        ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border border-red-200 bg-red-50 text-red-600'
                    }`}
                  >
                    {confirmDone ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {confirmDone
                      ? '✓ Labada password waa isku mid — Save riix!'
                      : '✗ Password-yadu isma laha — isku mid ka dhig'}
                  </div>
                ) : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                  <Link
                    href="/admin/profile"
                    className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] text-sm font-black text-white shadow-lg shadow-blue-500/30 hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>

      {showSuccess ? <SuccessModal onClose={() => setShowSuccess(false)} /> : null}
    </>
  );
}
