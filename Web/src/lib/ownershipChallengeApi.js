import { supabase, approveItemClaim, rejectItemClaim } from './supabase';
import {
  resolveChallengeOutcome,
  buildChallengeAnswerReview,
  toPublicChallengeQuestions,
  validateChallengeQuestions,
  normalizeChallengeQuestions,
  challengeResultLabel,
  OWNERSHIP_OFFICE_VISIT,
} from './ownershipChallenge';

async function setItemLifecycleStatus(itemType, itemId, status) {
  const table = itemType === 'found' ? 'found_items' : 'lost_items';
  const { error } = await supabase.from(table).update({ status }).eq('id', itemId);
  if (error) throw new Error(error.message || 'Could not update item status.');
}

export const ITEM_BEING_CLAIMED_MSG =
  'Someone is already answering the Ownership Challenge for this item. Try again shortly.';

/**
 * Soft-lock: hide from live as soon as claimant opens the challenge form.
 * If an orphan soft-lock remains (Cancel never ran / app closed), clear it and retry once.
 */
export async function reserveItemForClaim(itemType, itemId) {
  const type = itemType === 'found' ? 'found' : 'lost';
  const id = Number(itemId);
  if (!id) throw new Error('Item data is missing.');

  const table = type === 'found' ? 'found_items' : 'lost_items';

  const tryLock = async () => {
    const { data, error } = await supabase
      .from(table)
      .update({ status: 'claim_pending' })
      .eq('id', id)
      .eq('status', 'live')
      .select('id')
      .maybeSingle();
    if (error) throw new Error(error.message || 'Could not reserve this item.');
    return data?.id || null;
  };

  let lockedId = await tryLock();
  if (!lockedId) {
    const open = await getOpenClaimForItem(type, id);
    if (!open) {
      // Orphan soft-lock (opened form, then Cancel/network failed) — free and retry.
      await supabase.from(table).update({ status: 'live' }).eq('id', id).eq('status', 'claim_pending');
      lockedId = await tryLock();
    }
  }

  if (!lockedId) throw new Error(ITEM_BEING_CLAIMED_MSG);
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

/**
 * Clear orphan “Answering challenge” soft-locks (claim_pending, no open claim row).
 * Safe for admin inventory / claims screens when Cancel never restored live.
 */
export async function unlockOrphanClaimSoftLocks() {
  let unlocked = 0;
  for (const type of ['lost', 'found']) {
    const table = type === 'found' ? 'found_items' : 'lost_items';
    const { data: rows, error } = await supabase
      .from(table)
      .select('id')
      .eq('status', 'claim_pending');
    if (error || !rows?.length) continue;

    for (const row of rows) {
      const open = await getOpenClaimForItem(type, row.id);
      if (open) continue;
      const { error: upErr } = await supabase
        .from(table)
        .update({ status: 'live' })
        .eq('id', row.id)
        .eq('status', 'claim_pending');
      if (!upErr) unlocked += 1;
    }
  }
  if (unlocked > 0) {
    try {
      const { invalidatePublicItemsCache } = await import('./publicItems');
      invalidatePublicItemsCache();
    } catch {
      /* optional */
    }
  }
  return unlocked;
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

  const rows = normalized.map((q, i) => {
    const type =
      q.question_type === 'ask' ? 'ask' : q.question_type === 'direct' ? 'direct' : 'mcq';
    return {
      challenge_id: challengeId,
      prompt: String(q.prompt || '').trim(),
      question_type: type,
      options: type === 'mcq' ? q.options : [],
      correct_index: type === 'mcq' ? Number(q.correct_index) : 0,
      correct_answer: type === 'direct' ? String(q.correct_answer || '').trim() : '',
      sort_order: i,
    };
  });

  const { error: insErr } = await supabase.from('ownership_challenge_questions').insert(rows);
  if (insErr) {
    const msg = String(insErr.message || '');
    if (/question_type|check constraint|correct_answer|schema cache/i.test(msg)) {
      throw new Error(
        `${msg} — Re-run the FULL supabase/ownership_challenge.sql in Supabase SQL Editor (adds Ask mode: mcq/direct/ask), then: NOTIFY pgrst, 'reload schema';`
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
  const { score, correct, total, result, askOnly, askTotal } = resolveChallengeOutcome(
    challenge.questions,
    answerList
  );
  const itemName = item.itemName || item.item_name || item.displayName || 'Item';
  const answerReview = buildChallengeAnswerReview(challenge.questions, answerList);

  const description =
    askTotal > 0
      ? `Ownership Challenge · Ask review · Physical (${score}% on scored Qs)`
      : askOnly
        ? `Ownership Challenge · Ask review · physical`
        : `Ownership Challenge · ${score}% (${correct}/${total}) · ${result}`;

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
      title: 'Approved — item returned',
      body: `Challenge ${score}% · Approved — Returned ${OWNERSHIP_OFFICE_VISIT}. “${itemName}” is ready for you.`,
      itemType: type,
      itemId,
      itemName,
    });
    return {
      claim: { ...claim, status: 'approved' },
      score,
      result,
      message: challengeResultLabel('auto_pass'),
    };
  }

  if (result === 'reject') {
    await setItemLifecycleStatus(type, itemId, 'live');
    await supabase
      .from('item_claims')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), challenge_result: 'reject' })
      .eq('id', claimRow.id);
    await notifyClaimer({
      title: 'Rejected — item is live again',
      body: `Score ${score}% (below 50%). Ownership was not matched. “${itemName}” is back on the live board.`,
      itemType: type,
      itemId,
      itemName,
    });
    return {
      claim: { ...claim, status: 'rejected' },
      score,
      result,
      message: 'Rejected — item is live on the board again.',
    };
  }

  // physical — office verify (Ask always lands here; score band 50–80 also)
  await notifyClaimer({
    title: 'Physical verification required',
    body:
      askTotal > 0
        ? `Your answers need office review (Ask question). Please ${OWNERSHIP_OFFICE_VISIT} about “${itemName}”.`
        : `Challenge ${score}% · Physical — ${OWNERSHIP_OFFICE_VISIT} so staff can verify “${itemName}”.`,
    itemType: type,
    itemId,
    itemName,
  });
  return {
    claim: { ...claim, status: 'physical' },
    score,
    result,
    message: challengeResultLabel('physical'),
  };
}

/** Admin confirms physical claimant is correct → Returned. */
export async function confirmPhysicalClaim(claim) {
  const result = await approveItemClaim({ ...claim, status: 'physical' });
  const itemType = claim.itemType || claim.item_type || 'found';
  const itemId = claim.itemId || claim.item_id || claim.found_item_id || claim.lost_item_id;
  const itemName =
    claim.targetItem?.itemName ||
    claim.targetItem?.item_name ||
    claim.item_name ||
    claim.displayItemName ||
    'your item';
  const score = claim.challenge_score != null ? Math.round(Number(claim.challenge_score)) : null;
  await notifyClaimer({
    title: 'Approved — item returned',
    body:
      score != null
        ? `Challenge ${score}% · ${challengeResultLabel('auto_pass')}. “${itemName}” is ready for you.`
        : `${challengeResultLabel('auto_pass')}. “${itemName}” is ready for you.`,
    itemType,
    itemId,
    itemName,
  });
  return result;
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
