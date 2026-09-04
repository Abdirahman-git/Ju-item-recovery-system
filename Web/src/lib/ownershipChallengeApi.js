import { supabase, approveItemClaim, rejectItemClaim } from './supabase';
import {
  getChallengeResultFromScore,
  scoreChallengeAnswers,
  toPublicChallengeQuestions,
  validateChallengeQuestions,
  normalizeChallengeQuestions,
} from './ownershipChallenge';

async function setItemLifecycleStatus(itemType, itemId, status) {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase.from(table).update({ status }).eq('id', itemId);
  if (error) throw new Error(error.message || 'Could not update item status.');
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
    if (/ownership_challenges|does not exist|schema cache/i.test(msg)) {
      throw new Error('Run supabase/ownership_challenge.sql in Supabase SQL Editor.');
    }
    throw new Error(error.message || 'Failed to load Ownership Challenge.');
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
    options: q.options.map((o) => String(o || '').trim()).filter(Boolean),
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
      const msg = String(cErr.message || '');
      if (/ownership_challenges|does not exist|schema cache/i.test(msg)) {
        throw new Error('Run supabase/ownership_challenge.sql in Supabase SQL Editor.');
      }
      throw new Error(cErr.message || 'Failed to create challenge.');
    }
    challengeId = created.id;
  }

  const rows = normalized.map((q, i) => ({
    challenge_id: challengeId,
    prompt: String(q.prompt || '').trim(),
    options: q.options,
    correct_index: Number(q.correct_index) || 0,
    sort_order: i,
  }));

  const { error: insErr } = await supabase.from('ownership_challenge_questions').insert(rows);
  if (insErr) throw new Error(insErr.message || 'Failed to save questions.');

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
}) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const itemId = Number(item?.id);
  if (!itemId) throw new Error('Item data is missing.');

  const open = await getOpenClaimForItem(type, itemId);
  if (open) {
    throw new Error('This item already has an ownership request under review.');
  }

  const challenge = await fetchOwnershipChallenge(type, itemId, { includeAnswers: true });
  if (!challenge?.questions?.length) {
    throw new Error('Ownership Challenge is not ready yet. Please wait for admin.');
  }

  const { score, correct, total } = scoreChallengeAnswers(challenge.questions, selectedIndexes);
  const result = getChallengeResultFromScore(score);
  const itemName = item.itemName || item.item_name || item.displayName || 'Item';

  const description = `Ownership Challenge · ${score}% (${correct}/${total}) · ${result}`;

  const payload = {
    lost_item_id: itemId,
    found_item_id: itemId,
    item_type: type,
    item_id: itemId,
    claimer_name: claimerName || 'Student',
    claimer_email: (claimerEmail || '').trim().toLowerCase(),
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
    },
    challenge_id: challenge.id,
    challenge_score: score,
    challenge_result: result,
    challenge_answers: selectedIndexes,
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
