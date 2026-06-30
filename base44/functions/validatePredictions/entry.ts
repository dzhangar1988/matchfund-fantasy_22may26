// ── Shared prediction validation ────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for server-side prediction validation.
// Called by: joinFund, updatePrediction
// Frontend mirror: lib/predictionUtils.js → validatePredictions()
//
// Allowed predictions formula: min(base + knockoutCount, matchCount × 2)
// ────────────────────────────────────────────────────────────────────────────
function getAllowedPredictions(matchCount, knockoutCount = 0) {
  if (matchCount <= 0) return 0;
  const base = matchCount <= 3 ? matchCount + 1 : matchCount + 2;
  return Math.min(base + knockoutCount, matchCount * 2);
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { predictions, matchCount, matchIds, knockoutCount = 0 } = body;

    if (!matchCount || matchCount < 1) {
      return Response.json({ valid: false, error: 'Invalid match count', total: 0, allowed: 0 });
    }

    const allowed = getAllowedPredictions(matchCount, knockoutCount);
    const ids = Array.isArray(matchIds) ? matchIds : Object.keys(predictions || {});
    let total = 0;

    // Per-match rule: 1–2 picks
    for (const matchId of ids) {
      const opts = (predictions && predictions[matchId]) || [];
      if (opts.length < 1) {
        return Response.json({ valid: false, error: 'Each match needs at least 1 pick', total, allowed });
      }
      if (opts.length > 2) {
        return Response.json({ valid: false, error: 'Maximum 2 picks per match', total, allowed });
      }
      total += opts.length;
    }

    // Total minimum: at least matchCount (1 per match)
    if (total < matchCount) {
      return Response.json({ valid: false, error: `Need at least ${matchCount} predictions (1 per match)`, total, allowed });
    }

    // Total maximum: allowed cap
    if (total > allowed) {
      return Response.json({ valid: false, error: `Prediction limit exceeded: ${total} picks, but only ${allowed} allowed for ${matchCount} match${matchCount !== 1 ? 'es' : ''}.`, total, allowed });
    }

    return Response.json({ valid: true, error: null, total, allowed });
  } catch (error) {
    return Response.json({ valid: false, error: error.message, total: 0, allowed: 0 }, { status: 500 });
  }
});