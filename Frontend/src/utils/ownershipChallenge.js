/** Ownership Challenge — shared scoring + copy (mobile). */

export const CHALLENGE_MIN_QUESTIONS = 3;
export const CHALLENGE_MAX_QUESTIONS = 10;
export const QUESTION_TYPE_MCQ = 'mcq';
export const QUESTION_TYPE_DIRECT = 'direct';

export function getChallengeResultFromScore(score) {
  const n = Math.round(Number(score) || 0);
  if (n >= 90) return 'auto_pass';
  if (n >= 60) return 'physical';
  return 'reject';
}

/** Lowercase, strip punctuation, collapse spaces. */
export function normalizeAnswerText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DIRECT_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'is', 'was', 'were', 'it',
  'oo', 'iyo', 'ama', 'ah', 'ka', 'ku', 'la', 'lo', 'uga', 'ugu', 'ayaa', 'ayuu', 'ayay',
  'wuu', 'waa', 'waxa', 'waxaa', 'sido', 'kale', 'mid', 'ahaan',
]);

function answerTokens(value) {
  return normalizeAnswerText(value)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !DIRECT_STOP_WORDS.has(t));
}

/** Smart direct match: exact/contains, else keyword overlap (not copy-paste only). */
export function answersMatchDirect(expected, given) {
  const a = normalizeAnswerText(expected);
  const b = normalizeAnswerText(given);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length <= b.length ? a : b;
    if (shorter.length >= 6) return true;
  }

  const expectedTokens = answerTokens(expected);
  const givenTokens = new Set(answerTokens(given));
  if (!expectedTokens.length) return a === b;

  const hit = expectedTokens.filter((t) => givenTokens.has(t)).length;
  const ratio = hit / expectedTokens.length;
  const need = expectedTokens.length <= 2 ? 1 : expectedTokens.length <= 4 ? 0.75 : 0.6;
  return ratio >= need && hit >= Math.min(2, expectedTokens.length);
}

export function scoreChallengeAnswers(questions, answers) {
  const list = Array.isArray(questions) ? questions : [];
  if (!list.length) return { score: 0, correct: 0, total: 0 };
  let correct = 0;
  list.forEach((q, i) => {
    const type = q.question_type === QUESTION_TYPE_DIRECT ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ;
    const ans = answers?.[i];
    if (type === QUESTION_TYPE_DIRECT) {
      if (answersMatchDirect(q.correct_answer, ans)) correct += 1;
    } else {
      const picked = Number(ans);
      if (Number.isInteger(picked) && picked === Number(q.correct_index)) correct += 1;
    }
  });
  const total = list.length;
  const score = Math.round((correct / total) * 100);
  return { score, correct, total };
}

/** Snapshot of each Q + claimant answer for admin proof. */
export function buildChallengeAnswerReview(questions, answers) {
  return (Array.isArray(questions) ? questions : []).map((q, i) => {
    const type = q.question_type === QUESTION_TYPE_DIRECT ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ;
    const ans = answers?.[i];
    if (type === QUESTION_TYPE_DIRECT) {
      const given = String(ans || '').trim();
      const expected = String(q.correct_answer || '').trim();
      return {
        prompt: q.prompt || `Question ${i + 1}`,
        question_type: type,
        given,
        expected,
        correct: answersMatchDirect(expected, given),
      };
    }
    const opts = Array.isArray(q.options) ? q.options : [];
    const picked = Number(ans);
    const correctIndex = Number(q.correct_index);
    const given =
      Number.isInteger(picked) && opts[picked] != null
        ? String(opts[picked])
        : Number.isInteger(picked)
          ? `Option ${picked + 1}`
          : '—';
    const expected =
      Number.isInteger(correctIndex) && opts[correctIndex] != null
        ? String(opts[correctIndex])
        : '';
    return {
      prompt: q.prompt || `Question ${i + 1}`,
      question_type: type,
      given,
      expected,
      correct: Number.isInteger(picked) && picked === correctIndex,
      selected_index: Number.isInteger(picked) ? picked : null,
      options: opts.map(String),
    };
  });
}

export function challengeResultLabel(result) {
  switch (result) {
    case 'auto_pass':
      return 'Approved — item Returned';
    case 'physical':
      return 'Visit campus office for verification';
    case 'reject':
      return 'Not matched — item is live again';
    default:
      return 'Pending review';
  }
}

export function toPublicChallengeQuestions(questions) {
  return (questions || []).map((q, i) => {
    const type = q.question_type === QUESTION_TYPE_DIRECT ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ;
    return {
      id: q.id,
      question_type: type,
      prompt: q.prompt,
      options: type === QUESTION_TYPE_MCQ && Array.isArray(q.options) ? q.options : [],
      sort_order: q.sort_order ?? i,
    };
  });
}
