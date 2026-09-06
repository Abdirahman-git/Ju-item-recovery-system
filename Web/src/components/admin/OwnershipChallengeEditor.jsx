'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldQuestion, X } from 'lucide-react';
import { validateChallengeQuestions } from '@/lib/ownershipChallenge';
import { fetchOwnershipChallenge, saveOwnershipChallenge } from '@/lib/ownershipChallengeApi';
import OwnershipChallengeFields, {
  defaultChallengeQuestions,
} from '@/components/admin/OwnershipChallengeFields';
import { useSession } from '@/context/SessionProvider';

export default function OwnershipChallengeEditor({
  item,
  open,
  onClose,
  onSaved,
  saveLabel = 'Save Ownership Challenge',
  subtitle,
}) {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState(() => defaultChallengeQuestions());

  const itemType = item?.itemType || 'lost';
  const itemId = item?.id;

  useEffect(() => {
    if (!open || !itemId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const challenge = await fetchOwnershipChallenge(itemType, itemId, { includeAnswers: true });
        if (cancelled) return;
        if (challenge?.questions?.length) {
          setQuestions(
            challenge.questions.map((q, i) => {
              const type = String(q.question_type || '').toLowerCase();
              if (type === 'ask' || type === 'open') {
                return {
                  question_type: 'ask',
                  prompt: q.prompt || '',
                  options: [],
                  correct_index: null,
                  correct_answer: '',
                  sort_order: i,
                };
              }
              if (type === 'direct') {
                return {
                  question_type: 'direct',
                  prompt: q.prompt || '',
                  options: [],
                  correct_index: null,
                  correct_answer: q.correct_answer || '',
                  sort_order: i,
                };
              }
              const opts = Array.isArray(q.options) ? [...q.options] : ['', '', '', ''];
              while (opts.length < 4) opts.push('');
              return {
                question_type: 'mcq',
                prompt: q.prompt || '',
                options: opts.slice(0, 4),
                correct_index: Number.isInteger(Number(q.correct_index))
                  ? Number(q.correct_index)
                  : null,
                correct_answer: '',
                sort_order: i,
              };
            })
          );
        } else {
          setQuestions(defaultChallengeQuestions());
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load challenge.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, itemId, itemType]);

  if (!open || !item) return null;

  const handleSave = async () => {
    const validationError = validateChallengeQuestions(questions);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!itemId) {
      setError('Item id missing — reopen the report and try again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveOwnershipChallenge({
        itemType,
        itemId,
        questions,
        adminEmail: session?.email,
        adminName: session?.userName,
      });
      if (onSaved) await onSaved();
      onClose?.();
    } catch (err) {
      console.error('Ownership challenge save failed:', err);
      const msg = String(err?.message || '');
      if (/row-level security|42501/i.test(msg)) {
        setError(
          'Database blocked save (RLS). In Supabase SQL Editor run the ownership_challenge.sql permissions section (DISABLE RLS + GRANT), then Save again.'
        );
      } else if (/Could not find the table|does not exist|schema cache/i.test(msg)) {
        setError(
          'Database tables missing. Open Supabase → SQL Editor → run the FULL file supabase/ownership_challenge.sql → then Save again.'
        );
      } else {
        setError(msg || 'Save failed. Check the browser console for details.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-md">
      <div className="glass-modal flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-white/50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A56DB]/10 text-[#1A56DB]">
              <ShieldQuestion size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Set Ownership Challenge</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {subtitle || (
                  <>
                    Edit MCQ for <span className="font-bold text-slate-800">{item.displayName}</span> —
                    only you see correct answers.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error ? (
            <div className="sticky top-0 z-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
              {error}
            </div>
          ) : null}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-[#1A56DB]" size={28} />
            </div>
          ) : (
            <OwnershipChallengeFields
              questions={questions}
              onChange={setQuestions}
              error=""
              disabled={saving}
            />
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-white/50 bg-white/40 px-5 py-4 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="glass-button flex-1 rounded-2xl px-4 py-3 text-sm font-black text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1A56DB] px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/25 hover:bg-[#1E40AF] disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <ShieldQuestion size={16} />}
            {saving ? 'Saving…' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
