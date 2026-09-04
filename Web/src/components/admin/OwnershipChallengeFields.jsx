'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  CHALLENGE_MAX_QUESTIONS,
  CHALLENGE_MIN_QUESTIONS,
  emptyChallengeQuestion,
} from '@/lib/ownershipChallenge';

/** Controlled Ownership Challenge MCQ fields (admin only — correct answers included). */
export default function OwnershipChallengeFields({
  questions,
  onChange,
  error = '',
  disabled = false,
  compact = false,
}) {
  const list = Array.isArray(questions) && questions.length
    ? questions
    : [emptyChallengeQuestion(0), emptyChallengeQuestion(1), emptyChallengeQuestion(2)];

  const setQuestions = (next) => onChange?.(next);

  const updateQuestion = (index, patch) => {
    setQuestions(list.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions(
      list.map((q, i) => {
        if (i !== qIndex) return q;
        const options = [...(q.options || ['', '', '', ''])];
        options[oIndex] = value;
        return { ...q, options };
      })
    );
  };

  const addQuestion = () => {
    if (list.length >= CHALLENGE_MAX_QUESTIONS || disabled) return;
    setQuestions([...list, emptyChallengeQuestion(list.length)]);
  };

  const removeQuestion = (index) => {
    if (list.length <= CHALLENGE_MIN_QUESTIONS || disabled) return;
    setQuestions(list.filter((_, i) => i !== index).map((q, i) => ({ ...q, sort_order: i })));
  };

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#1A56DB]">
            Ownership Challenge
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Required before publish · {list.length}/{CHALLENGE_MAX_QUESTIONS} · min{' '}
            {CHALLENGE_MIN_QUESTIONS} · at least 2 options each · empty options ignored
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {list.map((q, qi) => (
        <article
          key={qi}
          className="rounded-[20px] border border-slate-200/80 bg-white/80 p-3.5 shadow-sm"
        >
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-[#1A56DB]">
              Question {qi + 1}
            </span>
            {list.length > CHALLENGE_MIN_QUESTIONS ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => removeQuestion(qi)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 size={12} /> Remove
              </button>
            ) : null}
          </div>
          <input
            value={q.prompt}
            disabled={disabled}
            onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
            placeholder="Private detail only the owner would know…"
            className="mb-2.5 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-4 focus:ring-[#1A56DB]/12 disabled:opacity-60"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {(q.options || ['', '', '', '']).slice(0, 4).map((opt, oi) => (
              <label
                key={oi}
                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${
                  Number(q.correct_index) === oi
                    ? 'border-emerald-300 bg-emerald-50/80 ring-2 ring-emerald-100'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name={`correct-${qi}`}
                  disabled={disabled}
                  checked={Number(q.correct_index) === oi}
                  onChange={() => updateQuestion(qi, { correct_index: oi })}
                  className="accent-emerald-600"
                />
                <input
                  value={opt}
                  disabled={disabled}
                  onChange={(e) => updateOption(qi, oi, e.target.value)}
                  placeholder={`Option ${oi + 1}`}
                  className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none disabled:opacity-60"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-400">
            Select the radio next to the correct answer. Empty options are ignored (min 2 filled).
          </p>
        </article>
      ))}

      {list.length < CHALLENGE_MAX_QUESTIONS ? (
        <button
          type="button"
          disabled={disabled}
          onClick={addQuestion}
          className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-[#1A56DB] hover:text-[#1A56DB] disabled:opacity-50"
        >
          <Plus size={16} /> Add question
        </button>
      ) : null}
    </div>
  );
}

export function defaultChallengeQuestions() {
  return [emptyChallengeQuestion(0), emptyChallengeQuestion(1), emptyChallengeQuestion(2)];
}
