import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Inlined cancelFund refund logic (KEEP IN SYNC with cancelFund/entry.ts) ──
// Reused for both creator-leaves and auto-cancel-below-min paths.
async function cancelFundAndRefundAll(base44, fund_id) {
  const fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
  if (fund.status !== 'open') return;

  // 1. Cancel active share listings
  const activeListings = await base44.asServiceRole.entities.ShareListing.filter({ fund_id, status: 'active' });
  await Promise.all(activeListings.map(l =>
    base44.asServiceRole.entities.ShareListing.update(l.id, { status: 'cancelled', shares_available: 0 })
  ));

  // 2. Refund share buyers & clawback from sellers + refund all entry fees
  const purchases = await base44.asServiceRole.entities.SharePurchase.filter({ fund_id });
  const allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });
  const balanceDeltas = {};
  for (const purchase of purchases) {
    balanceDeltas[purchase.buyer_id] = (balanceDeltas[purchase.buyer_id] || 0) + purchase.total_cost;
    balanceDeltas[purchase.seller_id] = (balanceDeltas[purchase.seller_id] || 0) - purchase.total_cost;
  }
  for (const p of allParticipations) {
    balanceDeltas[p.user_id] = (balanceDeltas[p.user_id] || 0) + fund.entry_fee;
  }

  // Apply all balance updates
  const userIds = Object.keys(balanceDeltas);
  const users = await Promise.all(userIds.map(id => base44.asServiceRole.entities.User.get(id)));
  await Promise.all(users.map(u => {
    const delta = balanceDeltas[u.id] || 0;
    return base44.asServiceRole.entities.User.update(u.id, {
      total_balance: Math.max(0, (u.total_balance || 0) + delta)
    });
  }));

  // 3. Mark fund cancelled
  await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'cancelled' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fund_id } = body;
    if (!fund_id) return Response.json({ error: 'fund_id required' }, { status: 400 });

    // Load fund
    let fund;
    try {
      fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    } catch {
      return Response.json({ error: 'Fund not found' }, { status: 404 });
    }

    // ── CRITICAL LOCK GUARD ──
    // Fund must be open — prevents leaving after seeing results (cheating vector).
    if (fund.status !== 'open') {
      return Response.json({ error: "Predictions are locked — you can't leave after the first match starts" }, { status: 400 });
    }

    // Verify no match has started (same check as joinFund)
    const fundMatches = await base44.asServiceRole.entities.FundMatch.filter({ fund_id });
    const matchIds = fundMatches.map(fm => fm.match_id);
    const matches = await Promise.all(
      matchIds.map(id => base44.asServiceRole.entities.Match.get(id))
    );
    const startedMatch = matches.find(m =>
      m.status !== 'upcoming' || new Date(m.match_date) <= new Date()
    );
    if (startedMatch) {
      return Response.json({ error: "Predictions are locked — you can't leave after the first match starts" }, { status: 400 });
    }

    // Find the user's participation — verify ownership
    const userParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id, user_id: user.id });
    if (userParticipations.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'not participating' });
    }

    const participation = userParticipations[0];

    // ── IDEMPOTENCY GUARD: don't refund twice ──
    if (participation.status === 'refunded') {
      return Response.json({ ok: true, skipped: true, reason: 'already refunded' });
    }

    // Mark as refunded FIRST — a retry before completion won't double-refund
    await base44.asServiceRole.entities.Participation.update(participation.id, { status: 'refunded' });

    // ── CREATOR PATH: cancel the ENTIRE fund ──
    if (participation.is_creator || fund.creator_id === user.id) {
      await cancelFundAndRefundAll(base44, fund_id);
      return Response.json({ ok: true, action: 'fund_cancelled', reason: 'creator_left' });
    }

    // ── REGULAR PLAYER PATH: refund only this player ──
    const freshUser = await base44.asServiceRole.entities.User.get(user.id);
    await base44.asServiceRole.entities.User.update(user.id, {
      total_balance: (freshUser.total_balance || 0) + fund.entry_fee
    });

    // Delete their predictions
    const userPredictions = await base44.asServiceRole.entities.Prediction.filter({ participation_id: participation.id });
    await Promise.all(
      userPredictions.map(p => base44.asServiceRole.entities.Prediction.delete(p.id))
    );

    // Delete their participation
    await base44.asServiceRole.entities.Participation.delete(participation.id);

    // Decrease total_pool
    await base44.asServiceRole.entities.MatchFund.update(fund_id, {
      total_pool: Math.max(0, (fund.total_pool || 0) - fund.entry_fee)
    });

    // If active participants drop below min_participants → auto-cancel whole fund
    const remainingParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });
    const activeCount = remainingParticipations.filter(p => p.status !== 'refunded').length;
    if (activeCount < (fund.min_participants || 2)) {
      await cancelFundAndRefundAll(base44, fund_id);
      return Response.json({ ok: true, action: 'fund_cancelled', reason: 'below_min_participants' });
    }

    return Response.json({ ok: true, action: 'left', refunded: fund.entry_fee });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});