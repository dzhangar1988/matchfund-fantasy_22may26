import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Allowed predictions formula (mirrors lib/predictionUtils.js) ──────────
// ≤3 matches → matches+1, ≥4 matches → matches+2
function getAllowedPredictions(matchCount) {
  if (matchCount <= 0) return 0;
  if (matchCount <= 3) return matchCount + 1;
  return matchCount + 2;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { fund_id, predictions, device_info } = body;
    if (!fund_id || !predictions) {
      return Response.json({ error: 'fund_id and predictions required' }, { status: 400 });
    }

    // Load fund
    let fund;
    try {
      fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    } catch {
      return Response.json({ error: 'Fund not found' }, { status: 404 });
    }

    if (fund.status !== 'open') {
      return Response.json({ error: 'Fund is not open for joining' }, { status: 400 });
    }

    // Load fund matches
    const fundMatches = await base44.asServiceRole.entities.FundMatch.filter({ fund_id });
    const matchIds = fundMatches.map(fm => fm.match_id);
    const matchCount = matchIds.length;

    if (matchCount === 0) {
      return Response.json({ error: 'Fund has no matches configured' }, { status: 400 });
    }

    const allowedPredictions = getAllowedPredictions(matchCount);

    // Load matches to check if any started
    const matches = await Promise.all(
      matchIds.map(id => base44.asServiceRole.entities.Match.get(id))
    );
    const startedMatch = matches.find(m =>
      m.status !== 'upcoming' || new Date(m.match_date) <= new Date()
    );
    if (startedMatch) {
      return Response.json({ error: 'This fund is locked — a match has already started.' }, { status: 400 });
    }

    // Count total predictions submitted
    let totalPredictions = 0;
    for (const matchId of matchIds) {
      const opts = predictions[matchId] || [];
      totalPredictions += Array.isArray(opts) ? opts.length : 0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HARD SERVER-SIDE GUARD: reject if total predictions > allowed for match count
    // ═══════════════════════════════════════════════════════════════════════
    if (totalPredictions > allowedPredictions) {
      return Response.json({
        error: `Prediction limit exceeded: ${totalPredictions} picks submitted, but only ${allowedPredictions} allowed for ${matchCount} match${matchCount !== 1 ? 'es' : ''}.`,
        total_submitted: totalPredictions,
        allowed: allowedPredictions,
        match_count: matchCount
      }, { status: 400 });
    }

    // Validate minimum (at least 1 per match) and max 2 per match
    if (totalPredictions < matchCount) {
      return Response.json({ error: `Need at least ${matchCount} predictions (1 per match)` }, { status: 400 });
    }
    for (const matchId of matchIds) {
      const opts = predictions[matchId] || [];
      if (opts.length < 1) {
        return Response.json({ error: 'Every match must have at least 1 prediction' }, { status: 400 });
      }
      if (opts.length > 2) {
        return Response.json({ error: 'Maximum 2 predictions per match' }, { status: 400 });
      }
    }

    // Check duplicate participation
    const existingParts = await base44.asServiceRole.entities.Participation.filter({ fund_id, user_id: user.id });
    if (existingParts.length > 0) {
      return Response.json({ error: 'You have already joined this fund' }, { status: 400 });
    }

    // Check + deduct balance (service-role for fresh read)
    const freshUser = await base44.asServiceRole.entities.User.get(user.id);
    const currentBalance = freshUser.total_balance || 0;
    if (currentBalance < fund.entry_fee) {
      return Response.json({ error: `Insufficient balance: need ${fund.entry_fee} pts, have ${currentBalance} pts` }, { status: 400 });
    }

    // Create participation (service role — bypasses client RLS)
    const participation = await base44.asServiceRole.entities.Participation.create({
      fund_id,
      user_id: user.id,
      user_name: user.username || user.full_name || user.email,
      user_email: user.email,
      entry_paid: fund.entry_fee,
      is_creator: false,
      status: 'active',
      credits_used: totalPredictions,
      total_points: 0,
      joined_at: new Date().toISOString(),
      predictions_completed_at: new Date().toISOString(),
      device_info: device_info || null
    });

    // Create predictions (service role)
    await Promise.all(matchIds.map(matchId => {
      const opts = predictions[matchId] || [];
      return base44.asServiceRole.entities.Prediction.create({
        participation_id: participation.id,
        match_id: matchId,
        selected_options: opts,
        credits_spent: opts.length
      });
    }));

    // Deduct entry fee + increment prediction count
    await base44.asServiceRole.entities.User.update(user.id, {
      total_balance: Math.max(0, currentBalance - fund.entry_fee),
      total_predictions: (freshUser.total_predictions || 0) + matchCount
    });

    // Update fund prize pool
    await base44.asServiceRole.entities.MatchFund.update(fund_id, {
      total_pool: (fund.total_pool || 0) + fund.entry_fee
    });

    return Response.json({ ok: true, participation_id: participation.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});