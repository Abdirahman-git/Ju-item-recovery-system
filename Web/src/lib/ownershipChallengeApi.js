import { supabase, approveItemClaim, rejectItemClaim } from './supabase';
import {
  getChallengeResultFromScore,
  scoreChallengeAnswers,
  buildChallengeAnswerReview,
  toPublicChallengeQuestions,
  validateChallengeQuestions,
  normalizeChallengeQuestions,
} from './ownershipChallenge';

async function setItemLifecycleStatus(itemType, itemId, status) {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase.from(table).update({ status }).eq('id', itemId);
  if (error) throw new Error(error.message || 'Could not update item status.');
}

export const ITEM_BEING_CLAIMED_MSG =
  'Someone is already answering the Ownership Challenge for this item. Try again shortly.';

/** Soft-lock: hide from live as soon as claimant opens the challenge form. */
export async function reserveItemForClaim(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) throw new Error('Item data is missing.');

  // Atomic soft-lock only — no extra round-trip before update.
  const table = type === 'found' ? 'found_items' : 'lost_items';
  const { data, error } = await supabase
    .from(table)
    .update({ status: 'claim_pending' })
    .eq('id', id)
    .eq('status', 'live')
    .select('id')
    .maybeSingle();

  if (error) throw new Error(error.message || 'Could not reserve this item.');
  if (!data?.id) throw new Error(ITEM_BEING_CLAIMED_MSG);
  try {
    const { invalidatePublicItemsCache } = await import('./publicItems');
    invalidatePublicItemsCache();
  } catch {
    /* optional */
  }
  return true;
}

/** Restore live after Cancel if no submitted claim exists. */
export async function releaseItemClaimReserve(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) return false;

  const open = await getOpenClaimForItem(type, id);
  if (open) return false;

  const table = type === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase
    .from(table)
    .update({ status: 'live' })
    .eq('id', id)
    .eq('status', 'claim_pending');

  if (error) throw new Error(error.message || 'Could not restore item to live.');
  try {
    const { invalidatePublicItemsCache } = await import('./publicItems');
    invalidatePublicItemsCache();
  } catch {
    /* optional */
  }
  return true;
}

async function notifyClaimer({ title, body, itemType, itemId, itemName }) {
  try {
    await supabase.from('app_notifications').insert({
      type: 'claim_update',
      title,
      body,
      item_type: itemType,
      item_id: itemId,
      item_name: itemName || null,
    });
  } catch {
    /* notifications optional */
  }
}

export async function fetchOwnershipChallenge(itemType, itemId, { includeAnswers = false } = {}) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) return null;

  const { data: challenge, error } = await supabase
    .from('ownership_challenges')
    .select('*')
    .eq('item_type', type)
    .eq('item_id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    const msg = String(error.message || '');
    const code = error.code ? ` [${error.code}]` : '';
    if (/Could not find the table|does not exist|schema cache/i.test(msg)) {
      throw new Error(
        `${msg}${code} — Run the FULL supabase/ownership_challenge.sql, then: NOTIFY pgrst, 'reload schema';`
      );
    }
    throw new Error(`${msg}${code}` || 'Failed to load Ownership Challenge.');
  }
  if (!challenge) return null;

  const { data: questions, error: qErr } = await supabase
    .from('ownership_challenge_questions')
    .select('*')
    .eq('challenge_id', challenge.id)
    .order('sort_order', { ascending: true });

  if (qErr) throw new Error(qErr.message || 'Failed to load challenge questions.');

  const rows = questions || [];
  return {
    ...challenge,
    questions: includeAnswers ? rows : toPublicChallengeQuestions(rows),
    questionCount: rows.length,
    hasChallenge: rows.length > 0,
  };
}

export async function saveOwnershipChallenge({
  itemType,
  itemId,
  questions,
  adminEmail,
  adminName,
}) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) throw new Error('Item id missing.');

  const validationError = validateChallengeQuestions(questions);
  if (validationError) throw new Error(validationError);

  const normalized = normalizeChallengeQuestions(questions).map((q) => ({
    ...q,
    options: (q.options || []).map((o) => String(o || '').trim()).filter(Boolean),
  }));

  const existing = await fetchOwnershipChallenge(type, id, { includeAnswers: true }).catch(() => null);

  let challengeId = existing?.id;
  if (challengeId) {
    const { error: upErr } = await supabase
      .from('ownership_challenges')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
        created_by_email: adminEmail || existing.created_by_email,
        created_by_name: adminName || existing.created_by_name,
      })
      .eq('id', challengeId);
    if (upErr) throw new Error(upErr.message || 'Failed to update challenge.');

    await supabase.from('ownership_challenge_questions').delete().eq('challenge_id', challengeId);
  } else {
    const { data: created, error: cErr } = await supabase
      .from('ownership_challenges')
      .insert({
        item_type: type,
        item_id: id,
        status: 'active',
        created_by_email: adminEmail || null,
        created_by_name: adminName || null,
      })
      .select()
      .single();
    if (cErr) {
      const msg = String(cErr.message || cErr.details || cErr.hint || 'Failed to create challenge.');
      const code = cErr.code ? ` [${cErr.code}]` : '';
      if (/Could not find the table|does not exist|schema cache/i.test(msg)) {
        throw new Error(
          `${msg}${code} — Run the FULL supabase/ownership_challenge.sql in SQL Editor (not only selected lines), then wait ~10s or run: NOTIFY pgrst, 'reload schema';`
        );
      }
      throw new Error(`${msg}${code}`);
    }
    challengeId = created.id;
  }

  const rows = normalized.map((q, i) => ({
    challenge_id: challengeId,
    prompt: String(q.prompt || '').trim(),
    question_type: q.question_type === 'direct' ? 'direct' : 'mcq',
    options: q.question_type === 'direct' ? [] : q.options,
    correct_index: q.question_type === 'direct' ? 0 : Number(q.correct_index),
    correct_answer: q.question_type === 'direct' ? String(q.correct_answer || '').trim() : '',
    sort_order: i,
  }));

  const { error: insErr } = await supabase.from('ownership_challenge_questions').insert(rows);
  if (insErr) {
    const msg = String(insErr.message || '');
    if (/question_type|correct_answer|schema cache/i.test(msg)) {
      throw new Error(
        `${msg} — Re-run supabase/ownership_challenge.sql (adds question_type + correct_answer columns).`
      );
    }
    throw new Error(insErr.message || 'Failed to save questions.');
  }

  return fetchOwnershipChallenge(type, id, { includeAnswers: true });
}

export async function itemHasActiveChallenge(itemType, itemId) {
  const challenge = await fetchOwnershipChallenge(itemType, itemId, { includeAnswers: false });
  return Boolean(challenge?.questions?.length);
}

export async function getOpenClaimForItem(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  const { data, error } = await supabase
    .from('item_claims')
    .select('id, status, claimer_email, challenge_score, challenge_result')
    .eq('item_type', type)
    .eq('item_id', id)
    .in('status', ['pending', 'physical'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  return data?.[0] || null;
}

export const CLAIM_ALREADY_REJECTED_MSG =
  'You already tried this item and were not matched. You cannot submit again for the same item.';

/** Same claimer already rejected for this item — no second attempt. */
export async function getUserRejectedClaimForItem(itemType, itemId, claimerEmail) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  const email = String(claimerEmail || '').trim().toLowerCase();
  if (!id || !email) return null;

  const { data, error } = await supabase
    .from('item_claims')
    .select('id, status, claimer_email, challenge_result')
    .eq('item_type', type)
    .eq('item_id', id)
    .eq('claimer_email', email)
    .eq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return null;
  return data?.[0] || null;
}

/**
 * Submit Ownership Challenge answers as a claim.
 * Hides item from live; auto-pass → returned; physical → hold; reject → restore live.
 */
export async function submitOwnershipChallengeClaim({
  item,
  itemType,
  claimerEmail,
  claimerName,
  claimerStudentId,
  selectedIndexes,
  answers,
}) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const itemId = Number(item?.id);
  if (!itemId) throw new Error('Item data is missing.');

  const open = await getOpenClaimForItem(type, itemId);
  if (open) {
    throw new Error('This item already has an ownership request under review.');
  }

  const email = (claimerEmail || '').trim().toLowerCase();
  const alreadyRejected = await getUserRejectedClaimForItem(type, itemId, email);
  if (alreadyRejected) throw new Error(CLAIM_ALREADY_REJECTED_MSG);

  const challenge = await fetchOwnershipChallenge(type, itemId, { includeAnswers: true });
  if (!challenge?.questions?.length) {
    throw new Error('Ownership Challenge is not ready yet. Please wait for admin.');
  }

  const answerList = Array.isArray(answers)
    ? answers
    : Array.isArray(selectedIndexes)
      ? selectedIndexes
      : [];
  const { score, correct, total } = scoreChallengeAnswers(challenge.questions, answerList);
  const result = getChallengeResultFromScore(score);
  const itemName = item.itemName || item.item_name || item.displayName || 'Item';
  const answerReview = buildChallengeAnswerReview(challenge.questions, answerList);

  const description = `Ownership Challenge · ${score}% (${correct}/${total}) · ${result}`;

  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: type,
    item_id: itemId,
    claimer_name: claimerName || 'Student',
    claimer_email: email,
    claimer_student_id: claimerStudentId || null,
    description,
    match_score: score,
    match_breakdown: {
      source: 'ownership_challenge',
      item_type: type,
      item_name: itemName,
      challenge_id: challenge.id,
      score,
      correct,
      total,
      result,
      answer_review: answerReview,
    },
    challenge_id: challenge.id,
    challenge_score: score,
    challenge_result: result,
    challenge_answers: answerList,
    status: result === 'reject' ? 'rejected' : result === 'physical' ? 'physical' : 'pending',
  };

  // Hide from live while we process
  await setItemLifecycleStatus(type, itemId, result === 'physical' ? 'awaiting_pickup' : 'claim_pending');

  const { data: claimRow, error } = await supabase.from('item_claims').insert(payload).select().single();
  if (error) {
    // restore live if insert failed
    await setItemLifecycleStatus(type, itemId, 'live').catch(() => {});
    throw new Error(error.message || 'Could not submit Ownership Challenge.');
  }

  const claim = {
    ...claimRow,
    itemType: type,
    itemId,
    targetItem: item,
  };

  if (result === 'auto_pass') {
    await approveItemClaim(claim);
    await notifyClaimer({
      title: 'Ownership approved',
      body: `Your challenge scored ${score}%. Visit the campus Lost & Found office to collect “${itemName}”.`,
      itemType: type,
      itemId,
      itemName,
    });
    return { claim: { ...claim, status: 'approved' }, score, result, message: 'Approved — visit Lost & Found office.' };
  }

  if (result === 'reject') {
    await setItemLifecycleStatus(type, itemId, 'live');
    await supabase
      .from('item_claims')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), challenge_result: 'reject' })
      .eq('id', claimRow.id);
    await notifyClaimer({
      title: 'Ownership not matched',
      body: `Your challenge scored ${score}%. The item is live again on the board.`,
      itemType: type,
      itemId,
      itemName,
    });
    return { claim: { ...claim, status: 'rejected' }, score, result, message: 'Score too low — item is live again.' };
  }

  // physical
  await notifyClaimer({
    title: 'Visit Lost & Found office',
    body: `Your challenge scored ${score}%. Come to the campus office so staff can verify “${itemName}”.`,
    itemType: type,
    itemId,
    itemName,
  });
  return {
    claim: { ...claim, status: 'physical' },
    score,
    result,
    message: 'Visit campus office for physical verification.',
  };
}

/** Admin confirms physical claimant is correct → Returned. */
export async function confirmPhysicalClaim(claim) {
  return approveItemClaim({ ...claim, status: 'physical' });
}

/** Admin rejects physical / pending → restore live. */
export async function restoreItemAfterFailedClaim(claim, adminNote = '') {
  const itemType = claim.itemType || claim.item_type || 'found';
  const itemId = claim.itemId || claim.item_id || claim.found_item_id || claim.lost_item_id;
  await rejectItemClaim(
    claim.id,
    adminNote || claim.admin_note || 'Ownership Challenge not verified.',
    claim
  );
  if (itemId) await setItemLifecycleStatus(itemType, itemId, 'live');
  return { success: true };
}
