/** Ownership Challenge — shared scoring + copy (web). */

export const CHALLENGE_MIN_QUESTIONS = 3;
export const CHALLENGE_MAX_QUESTIONS = 10;
export const CHALLENGE_OPTIONS_PER_QUESTION = 4;
export const QUESTION_TYPE_MCQ = 'mcq';
export const QUESTION_TYPE_DIRECT = 'direct';

/** Score bands (product): ≥90 returned · 60–89 physical · &lt;60 reject. */
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

/** Tiny filler words ignored for keyword overlap (Somali + English). */
const DIRECT_STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'is', 'was', 'were', 'it',
  'oo', 'iyo', 'ama', 'ah', 'ka', 'ku', 'la', 'lo', 'uga', 'ugu', 'ayaa', 'ayuu', 'ayay',
  'wuu', 'waa', 'waxa', 'waxaa', 'sido', 'kale', 'mid', 'ahaan', 'ahaan',
]);

function answerTokens(value) {
  return normalizeAnswerText(value)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !DIRECT_STOP_WORDS.has(t));
}

/**
 * Smart direct match — not copy-paste only:
 * exact / contains, else enough key words from the admin answer must appear
 * in the claimant's wording (order / filler words ignored).
 */
export function answersMatchDirect(expected, given) {
  const a = normalizeAnswerText(expected);
  const b = normalizeAnswerText(given);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) {
    // Avoid tiny substring cheats ("gees" alone)
    const shorter = a.length <= b.length ? a : b;
    if (shorter.length >= 6) return true;
  }

  const expectedTokens = answerTokens(expected);
  const givenTokens = new Set(answerTokens(given));
  if (!expectedTokens.length) {
    // Admin answer was only short words — fall back to exact normalize
    return a === b;
  }

  const hit = expectedTokens.filter((t) => givenTokens.has(t)).length;
  const ratio = hit / expectedTokens.length;
  // Short answers: need almost all keywords; longer: ~60%
  const need = expectedTokens.length <= 2 ? 1 : expectedTokens.length <= 4 ? 0.75 : 0.6;
  return ratio >= need && hit >= Math.min(2, expectedTokens.length);
}

/**
 * @param questions admin rows (with correct_index / correct_answer)
 * @param answers array — mcq: number index, direct: string
 */
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

/**
 * Snapshot of each Q + claimant answer for admin proof (survives challenge edits).
 */
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
      return 'Auto pass — Returned';
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

export function emptyChallengeQuestion(sortOrder = 0, type = QUESTION_TYPE_MCQ) {
  const isDirect = type === QUESTION_TYPE_DIRECT;
  return {
    question_type: isDirect ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ,
    prompt: '',
    options: isDirect ? [] : ['', '', '', ''],
    // null = admin has not marked a correct option yet (never auto-pick option 1)
    correct_index: null,
    correct_answer: '',
    sort_order: sortOrder,
  };
}

/** Keep filled options only; remap correct_index by option text. Never invent a correct pick. */
export function normalizeChallengeQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map((q, i) => {
    const type = q.question_type === QUESTION_TYPE_DIRECT ? QUESTION_TYPE_DIRECT : QUESTION_TYPE_MCQ;
    if (type === QUESTION_TYPE_DIRECT) {
      return {
        question_type: QUESTION_TYPE_DIRECT,
        prompt: String(q.prompt || '').trim(),
        options: [],
        correct_index: null,
        correct_answer: String(q.correct_answer || '').trim(),
        sort_order: i,
      };
    }

    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const original = rawOpts.map((o) => String(o || '').trim());
    const filled = original.filter(Boolean);
    const options =
      filled.length >= 2
        ? filled.slice(0, 4)
        : [...filled, ...Array(Math.max(0, 2 - filled.length)).fill('')].slice(0, 4);

    const rawCorrect = q.correct_index;
    const correctNum = Number(rawCorrect);
    const hadExplicitPick =
      rawCorrect !== null &&
      rawCorrect !== undefined &&
      rawCorrect !== '' &&
      Number.isInteger(correctNum) &&
      correctNum >= 0 &&
      correctNum < original.length;

    let remapped = null;
    if (hadExplicitPick) {
      const correctLabel = original[correctNum];
      if (correctLabel) {
        const idx = options.indexOf(correctLabel);
        remapped = idx >= 0 ? idx : null;
      }
    }

    return {
      question_type: QUESTION_TYPE_MCQ,
      prompt: String(q.prompt || '').trim(),
      options: options.length ? options : ['', ''],
      correct_index: remapped,
      correct_answer: '',
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
    if (q.question_type === QUESTION_TYPE_DIRECT) {
      if (q.correct_answer.length < 1) {
        return `Question ${i + 1} (Direct): write the private correct answer.`;
      }
      continue;
    }
    const opts = q.options.map((o) => String(o || '').trim()).filter(Boolean);
    if (opts.length < 2) {
      return `Question ${i + 1} (MCQ): fill at least 2 options, or switch that question to Direct.`;
    }
    const ci = q.correct_index;
    if (!Number.isInteger(ci) || ci < 0 || ci >= opts.length) {
      return `Question ${i + 1} (MCQ): mark the correct option (nothing is selected by default).`;
    }
  }
  return null;
}

/** Public payload — never includes correct answers. */
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
