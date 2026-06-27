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
    const { prediction_id, selected_options } = body;

    if (!prediction_id || !Array.isArray(selected_options)) {
      return Response.json({ error: 'prediction_id and selected_options[] required' }, { status: 400 });
    }

    // ── (3) Per-match rule: 1–2 picks ──
    if (selected_options.length < 1 || selected_options.length > 2) {
      return Response.json({ error: 'Each match must have 1–2 picks' }, { status: 400 });
    }

    // ── Load the prediction being edited ──
    let prediction;
    try {
      prediction = await base44.asServiceRole.entities.Prediction.get(prediction_id);
    } catch {
      return Response.json({ error: 'Prediction not found' }, { status: 404 });
    }

    // ── Load participation to verify ownership ──
    const participation = await base44.asServiceRole.entities.Participation.get(prediction.participation_id);

    // ── (1) Confirm the requesting user owns that participation ──
    if (participation.user_id !== user.id) {
      return Response.json({ error: 'You do not own this prediction' }, { status: 403 });
    }

    // ── Load fund to check status ──
    const fund = await base44.asServiceRole.entities.MatchFund.get(participation.fund_id);

    // ── (2) Fund must still be "open" — predictions lock at kickoff ──
    if (fund.status !== 'open') {
      return Response.json({ error: 'Predictions are locked — fund is no longer open' }, { status: 400 });
    }

    // ── Load fund matches to check kickoff + count ──
    const fundMatches = await base44.asServiceRole.entities.FundMatch.filter({ fund_id: fund.id });
    const matchIds = fundMatches.map(fm => fm.match_id).sort((a, b) => fundMatches.find(fm => fm.match_id === a).position - fundMatches.find(fm => fm.match_id === b).position);
    const matchCount = matchIds.length;

    if (matchCount === 0) {
      return Response.json({ error: 'Fund has no matches' }, { status: 400 });
    }

    // Reject if the specific match being edited has already started
    const editedMatch = await base44.asServiceRole.entities.Match.get(prediction.match_id);
    if (editedMatch.status !== 'upcoming' || new Date(editedMatch.match_date) <= new Date()) {
      return Response.json({ error: 'This match has already started — picks are locked' }, { status: 400 });
    }

    // ── Load ALL predictions for this participation ──
    const allPredictions = await base44.asServiceRole.entities.Prediction.filter({ participation_id: participation.id });

    // ── (3) Validate new picks against shared prediction-limit ──
    // Build the full predictions map with the edited match's new picks
    const predictionsMap = {};
    for (const p of allPredictions) {
      if (p.id === prediction_id) {
        predictionsMap[p.match_id] = selected_options;
      } else {
        predictionsMap[p.match_id] = p.selected_options || [];
      }
    }

    const allowedPredictions = getAllowedPredictions(matchCount);
    let totalPicks = 0;
    for (const matchId of matchIds) {
      totalPicks += (predictionsMap[matchId] || []).length;
    }

    if (totalPicks > allowedPredictions) {
      return Response.json({
        error: `Prediction limit exceeded: ${totalPicks} picks, but only ${allowedPredictions} allowed for ${matchCount} matches.`,
        total_submitted: totalPicks,
        allowed: allowedPredictions,
      }, { status: 400 });
    }

    if (totalPicks < matchCount) {
      return Response.json({ error: `Need at least ${matchCount} predictions (1 per match)` }, { status: 400 });
    }

    // ── (4) Write via asServiceRole (bypasses client RLS) ──
    await base44.asServiceRole.entities.Prediction.update(prediction_id, {
      selected_options,
      credits_spent: selected_options.length,
    });

    // Update participation's credits_used to reflect the new total
    await base44.asServiceRole.entities.Participation.update(participation.id, {
      credits_used: totalPicks,
    });

    return Response.json({ ok: true, prediction_id, credits_spent: selected_options.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});