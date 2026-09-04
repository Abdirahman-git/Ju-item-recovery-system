'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldQuestion } from 'lucide-react';
import {
  fetchOwnershipChallenge,
  submitOwnershipChallengeClaim,
} from '@/lib/ownershipChallengeApi';
import { challengeResultLabel } from '@/lib/ownershipChallenge';
import { supabase } from '@/lib/supabase';

/**
 * Public browse: Ownership Challenge MCQ for students (email + student ID).
 */
export default function PublicOwnershipChallengeClaim({ item }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [email, setEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');

  const itemType = item?.itemType === 'found' ? 'found' : 'lost';
  const itemId = item?.id;

  const allAnswered =
    questions.length > 0 && questions.every((_, i) => Number.isInteger(Number(answers[i])));

  const canSubmit = useMemo(() => {
    return (
      Boolean(email.trim() && studentId.trim() && name.trim()) &&
      allAnswered &&
      !submitting &&
      !loading
    );
  }, [allAnswered, email, loading, name, studentId, submitting]);

  useEffect(() => {
    if (!open || !itemId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setOutcome(null);
      setAnswers({});
      try {
        const challenge = await fetchOwnershipChallenge(itemType, itemId, { includeAnswers: false });
        if (cancelled) return;
        if (!challenge?.questions?.length) {
          setError('Ownership Challenge is not ready yet. Please wait for admin.');
          setQuestions([]);
          return;
        }
        setQuestions(challenge.questions);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load Ownership Challenge.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, itemId, itemType]);

  const resolveIdentity = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const sid = studentId.trim();
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('name, student_id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (userErr) throw new Error(userErr.message || 'Could not verify account.');
    if (!user) throw new Error('No student account found for that email. Use the app account email.');
    if (String(user.student_id || '').trim() !== sid) {
      throw new Error('Student ID does not match this email.');
    }
    return {
      claimerEmail: normalizedEmail,
      claimerName: user.name?.trim() || name.trim(),
      claimerStudentId: sid,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const identity = await resolveIdentity();
      const selectedIndexes = questions.map((_, i) => Number(answers[i]));
      const result = await submitOwnershipChallengeClaim({
        item: {
          id: itemId,
          itemName: item.title || item.displayName || item.itemName,
          category: item.category,
          location: item.location,
          imageURI: item.imageUrl,
        },
        itemType,
        ...identity,
        selectedIndexes,
      });
      setOutcome(result);
      setQuestions([]);
    } catch (err) {
      setError(err?.message || 'Could not submit Ownership Challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!itemId) return null;

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="public-detail-cta public-press inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full pl-5 pr-4 text-sm font-black shadow-[0_1px_0_rgba(255,255,255,0.18)_inset,0_10px_24px_rgba(26,86,219,0.28)] transition-[transform,background-color,box-shadow] duration-200 hover:bg-[#1E40AF] sm:w-auto"
        >
          <ShieldQuestion size={16} />
          Take Ownership Challenge
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-2 space-y-3 rounded-[16px] border border-slate-200/80 bg-white/90 p-4"
        >
          <div className="flex items-start gap-2">
            <ShieldQuestion className="mt-0.5 shrink-0 text-[#1A56DB]" size={18} />
            <div>
              <h4 className="text-sm font-black text-slate-900">Ownership Challenge</h4>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                90%+ approved · 51–89% visit office · ≤50% rejected
              </p>
            </div>
          </div>

          {outcome ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                outcome.result === 'auto_pass'
                  ? 'bg-emerald-50 text-emerald-800'
                  : outcome.result === 'physical'
                    ? 'bg-indigo-50 text-indigo-800'
                    : 'bg-amber-50 text-amber-900'
              }`}
            >
              <p className="font-black">Score {outcome.score}%</p>
              <p className="mt-1">{outcome.message || challengeResultLabel(outcome.result)}</p>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-[#1A56DB]" size={24} />
            </div>
          ) : null}

          {!outcome && !loading ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block text-xs font-bold text-slate-500">
                  Full name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]"
                    required
                  />
                </label>
                <label className="block text-xs font-bold text-slate-500">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]"
                    required
                  />
                </label>
                <label className="block text-xs font-bold text-slate-500">
                  Student ID
                  <input
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB]"
                    required
                  />
                </label>
              </div>

              {questions.map((q, qi) => (
                <fieldset key={q.id || qi} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <legend className="px-1 text-[11px] font-black uppercase tracking-wide text-[#1A56DB]">
                    Question {qi + 1}
                  </legend>
                  <p className="mb-2 text-sm font-bold text-slate-900">{q.prompt}</p>
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt, oi) => (
                      <label
                        key={oi}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          Number(answers[qi]) === oi
                            ? 'border-blue-300 bg-blue-50 text-[#1E3A8A]'
                            : 'border-slate-200 bg-white text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qi}`}
                          checked={Number(answers[qi]) === oi}
                          onChange={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                          className="accent-[#1A56DB]"
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A56DB] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  Submit answers
                </button>
              </div>
            </>
          ) : null}
        </form>
      )}
    </div>
  );
}
