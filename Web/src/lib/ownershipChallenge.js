/** Ownership Challenge — shared scoring + copy (web). */

export const CHALLENGE_MIN_QUESTIONS = 3;
export const CHALLENGE_MAX_QUESTIONS = 10;
export const CHALLENGE_OPTIONS_PER_QUESTION = 4;

/** Score bands (product spec). */
export function getChallengeResultFromScore(score) {
  const n = Math.round(Number(score) || 0);
  if (n >= 90) return 'auto_pass';
  if (n > 50) return 'physical'; // 51–89 → office verification
  return 'reject'; // ≤50
}

export function scoreChallengeAnswers(questions, selectedIndexes) {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return { score: 0, correct: 0, total: 0 };
  let correct = 0;
  list.forEach((q, i) => {
    const picked = Number(selectedIndexes?.[i]);
    if (Number.isInteger(picked) && picked === Number(q.correct_index)) correct += 1;
  });
  const total = list.length;
  const score = Math.round((correct / total) * 100);
  return { score, correct, total };
}

export function challengeResultLabel(result) {
  switch (result) {
    case 'auto_pass':
      return 'Auto pass — visit office';
    case 'physical':
      return 'Physical verification';
    case 'reject':
      return 'Rejected';
    default:
      return 'Pending';
  }
}

export function challengeResultTone(result) {
  switch (result) {
    case 'auto_pass':
      return 'approved';
    case 'physical':
      return 'reviewing';
    case 'reject':
      return 'rejected';
    default:
      return 'pending';
  }
}

export function emptyChallengeQuestion(sortOrder = 0) {
  return {
    prompt: '',
    options: ['', '', '', ''],
    correct_index: 0,
    sort_order: sortOrder,
  };
}

/** Keep filled options only; pad to at least 2; remap correct_index. */
export function normalizeChallengeQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((q, i) => {
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const filled = rawOpts.map((o) => String(o || '').trim()).filter(Boolean);
    const options =
      filled.length >= 2
        ? filled.slice(0, 4)
        : [...filled, ...Array(Math.max(0, 2 - filled.length)).fill('')].slice(0, 4);
    let correct = Number(q.correct_index);
    if (!Number.isInteger(correct) || correct < 0) correct = 0;
    // If correct pointed at an emptied slot, fall back to first filled
    const original = rawOpts.map((o) => String(o || '').trim());
    const correctLabel = original[correct] || '';
    const remapped = correctLabel ? options.indexOf(correctLabel) : 0;
    return {
      prompt: String(q.prompt || '').trim(),
      options: options.length ? options : ['', ''],
      correct_index: remapped >= 0 ? remapped : 0,
      sort_order: i,
    };
  });
}

export function validateChallengeQuestions(questions) {
  const list = normalizeChallengeQuestions(questions);
  if (list.length < CHALLENGE_MIN_QUESTIONS) {
    return `Add at least ${CHALLENGE_MIN_QUESTIONS} questions.`;
  }
  if (list.length > CHALLENGE_MAX_QUESTIONS) {
    return `Maximum ${CHALLENGE_MAX_QUESTIONS} questions.`;
  }
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (q.prompt.length < 4) return `Question ${i + 1}: write a clearer prompt.`;
    const opts = q.options.map((o) => String(o || '').trim()).filter(Boolean);
    if (opts.length < 2) {
      return `Question ${i + 1}: add at least 2 answer options.`;
    }
    const ci = Number(q.correct_index);
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) {
      return `Question ${i + 1}: pick the correct answer.`;
    }
  }
  return null;
}

/** Public payload — never includes correct_index. */
export function toPublicChallengeQuestions(questions) {
  return (questions || []).map((q, i) => ({
    id: q.id,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options : [],
    sort_order: q.sort_order ?? i,
  }));
}
