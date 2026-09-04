/** Ownership Challenge — shared scoring + copy (mobile). */

export const CHALLENGE_MIN_QUESTIONS = 3;
export const CHALLENGE_MAX_QUESTIONS = 10;

export function getChallengeResultFromScore(score) {
  const n = Math.round(Number(score) || 0);
  if (n >= 90) return 'auto_pass';
  if (n > 50) return 'physical';
  return 'reject';
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
      return 'Approved — visit Lost & Found office';
    case 'physical':
      return 'Visit campus office for verification';
    case 'reject':
      return 'Not matched — item is live again';
    default:
      return 'Pending review';
  }
}

export function toPublicChallengeQuestions(questions) {
  return (questions || []).map((q, i) => ({
    id: q.id,
    prompt: q.prompt,
    options: Array.isArray(q.options) ? q.options : [],
    sort_order: q.sort_order ?? i,
  }));
}
