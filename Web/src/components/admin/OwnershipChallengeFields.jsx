'use client';

import { Plus, Trash2 } from 'lucide-react';
import {
  CHALLENGE_MAX_QUESTIONS,
  CHALLENGE_MIN_QUESTIONS,
  QUESTION_TYPE_DIRECT,
  QUESTION_TYPE_MCQ,
  emptyChallengeQuestion,
} from '@/lib/ownershipChallenge';

/** Controlled Ownership Challenge fields — MCQ + direct text (admin only). */
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

  const setQuestionType = (index, type) => {
    const next = type === QUESTION_TYPE_DIRECT ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ;
    setQuestions(
      list.map((q, i) => {
        if (i !== index) return q;
        if (next === QUESTION_TYPE_DIRECT) {
          return {
            ...q,
            question_type: QUESTION_TYPE_DIRECT,
            options: [],
            correct_index: null,
            correct_answer: q.correct_answer || '',
          };
        }
        const opts = Array.isArray(q.options) && q.options.length ? [...q.options] : ['', '', '', ''];
        while (opts.length < 4) opts.push('');
        return {
          ...q,
          question_type: QUESTION_TYPE_MCQ,
          options: opts.slice(0, 4),
          // Require a fresh explicit pick when switching to MCQ
          correct_index: null,
          correct_answer: '',
        };
      })
    );
  };

  const updateOption = (qIndex, oIndex, value) => {
    setQuestions(
      list.map((q, i) => {
        if (i !== qIndex) return q;
        const options = [...(q.options || ['', '', '', ''])];
        options[oIndex] = value;
        let correct_index = q.correct_index;
        // If the marked-correct option is cleared, drop the selection
        if (
          Number.isInteger(Number(correct_index)) &&
          Number(correct_index) === oIndex &&
          !String(value || '').trim()
        ) {
          correct_index = null;
        }
        return { ...q, options, correct_index };
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
            {CHALLENGE_MIN_QUESTIONS} · MCQ or short-answer per question
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {list.map((q, qi) => {
        const isDirect = q.question_type === QUESTION_TYPE_DIRECT;
        return (
          <article
            key={qi}
            className="rounded-[20px] border border-slate-200/80 bg-white/80 p-3.5 shadow-sm"
          >
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wide text-[#1A56DB]">
                Question {qi + 1}
              </span>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setQuestionType(qi, QUESTION_TYPE_MCQ)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition disabled:opacity-50 ${
                      !isDirect
                        ? 'bg-[#1A56DB] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    MCQ
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setQuestionType(qi, QUESTION_TYPE_DIRECT)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase tracking-wide transition disabled:opacity-50 ${
                      isDirect
                        ? 'bg-[#1A56DB] text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Direct
                  </button>
                </div>
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
            </div>

            <input
              value={q.prompt}
              disabled={disabled}
              onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
              placeholder="Private detail only the owner would know…"
              className="mb-2.5 h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-[#1A56DB] focus:ring-4 focus:ring-[#1A56DB]/12 disabled:opacity-60"
            />

            {isDirect ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
                <label className="block text-[11px] font-black uppercase tracking-wide text-amber-800">
                  Correct answer (private — claimant types this)
                </label>
                <input
                  value={q.correct_answer || ''}
                  disabled={disabled}
                  onChange={(e) => updateQuestion(qi, { correct_answer: e.target.value })}
                  placeholder="e.g. blue case with sticker"
                  className="mt-1.5 h-10 w-full rounded-xl border border-amber-200 bg-white px-3.5 text-sm font-semibold text-slate-800 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 disabled:opacity-60"
                />
                <p className="mt-1.5 text-[11px] font-semibold text-amber-700/80">
                  Claimant can paraphrase — we match key words, not the full sentence.
                  Keep the answer short and specific.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-emerald-700">
                  Mark the correct option (required)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(q.options || ['', '', '', '']).slice(0, 4).map((opt, oi) => {
                    const picked =
                      q.correct_index !== null &&
                      q.correct_index !== undefined &&
                      q.correct_index !== '' &&
                      Number.isInteger(Number(q.correct_index)) &&
                      Number(q.correct_index) === oi;
                    return (
                      <label
                        key={oi}
                        className={`flex items-center gap-2 rounded-2xl border px-3 py-2 transition ${
                          picked
                            ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${qi}`}
                          disabled={disabled}
                          checked={picked}
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
                        {picked ? (
                          <span className="shrink-0 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                            Correct
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-400">
                  {q.correct_index === null || q.correct_index === undefined || q.correct_index === ''
                    ? 'No correct option selected yet — tap a radio after filling options.'
                    : 'Correct option marked. Empty options are ignored (min 2 filled).'}
                </p>
              </>
            )}
          </article>
        );
      })}

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
