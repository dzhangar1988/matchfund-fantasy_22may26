import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Scoring weights ────────────────────────────────────────────────────────
// match_result (home/draw/away): 3 pts
// btts_yes / btts_no:            2 pts
// over_2_5 / under_2_5:          2.5 pts
// blowout_yes / blowout_no:      2.5 pts
// clean_sheet (home/away):       4 pts
// exact_score:                   9 pts

function getOptionWeight(option) {
  if (option === 'home_win' || option === 'draw' || option === 'away_win') return 3;
  if (option === 'btts_yes' || option === 'btts_no') return 2;
  if (option === 'over_2_5' || option === 'under_2_5') return 2.5;
  if (option === 'blowout_yes' || option === 'blowout_no') return 2.5;
  if (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win') return 4;
  if (option.startsWith('exact_')) return 9;
  return 1;
}

function checkOption(option, match) {
  const h = match.home_goals ?? null;
  const a = match.away_goals ?? null;
  if (h === null || a === null) return false;

  const result = match.result;
  const totalGoals = h + a;
  const goalDiff = Math.abs(h - a);
  const btts = h > 0 && a > 0;

  switch (option) {
    case 'home_win':     return result === 'home_win';
    case 'draw':         return result === 'draw';
    case 'away_win':     return result === 'away_win';
    case 'btts_yes':     return btts;
    case 'btts_no':      return !btts;
    case 'over_2_5':     return totalGoals > 2;
    case 'under_2_5':    return totalGoals <= 2;
    case 'blowout_yes':  return goalDiff >= 3;
    case 'blowout_no':   return goalDiff < 3;
    case 'home_clean_sheet_win': return result === 'home_win' && a === 0;
    case 'away_clean_sheet_win': return result === 'away_win' && h === 0;
    default: {
      if (option.startsWith('exact_')) {
        const parts = option.replace('exact_', '').split('-');
        if (parts.length !== 2) return false;
        return parseInt(parts[0]) === h && parseInt(parts[1]) === a;
      }
      return false;
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow both admin users and internal automation calls (which have no user)
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { fund_id } = body;

    // Load finished matches
    let allMatches = await base44.asServiceRole.entities.Match.filter({ status: 'finished' });
    if (fund_id) {
      // If specific fund, load only its matches
      const fundMatches = await base44.asServiceRole.entities.FundMatch.filter({ fund_id });
      const fundMatchIds = new Set(fundMatches.map(fm => fm.match_id));
      allMatches = allMatches.filter(m => fundMatchIds.has(m.id));
    }

    if (allMatches.length === 0) {
      return Response.json({ message: 'No finished matches to score' });
    }

    const matchMap = {};
    for (const m of allMatches) matchMap[m.id] = m;

    // Load predictions for these matches
    const allPredictions = await base44.asServiceRole.entities.Prediction.list();
    const relevantPredictions = allPredictions.filter(p => matchMap[p.match_id]);

    // Score each prediction individually
    const updates = [];
    for (const pred of relevantPredictions) {
      const match = matchMap[pred.match_id];
      let pts = 0;
      for (const opt of (pred.selected_options || [])) {
        if (checkOption(opt, match)) {
          pts += getOptionWeight(opt);
        }
      }
      const isCorrect = pts > 0;
      if (pred.points_earned !== pts || pred.is_correct !== isCorrect) {
        updates.push(
          base44.asServiceRole.entities.Prediction.update(pred.id, {
            points_earned: pts,
            is_correct: isCorrect
          })
        );
      }
    }
    await Promise.all(updates);

    // Recompute total_points for each participation
    // Group predictions by participation_id
    const predsByParticipation = {};
    for (const pred of relevantPredictions) {
      if (!predsByParticipation[pred.participation_id]) {
        predsByParticipation[pred.participation_id] = [];
      }
      predsByParticipation[pred.participation_id].push(pred);
    }

    // Also need ALL predictions for a participation (including unfinished matches → 0 pts)
    // So we load all predictions grouped by participation, then sum only finished-match ones
    const allPreds = await base44.asServiceRole.entities.Prediction.list();
    const predsByPart = {};
    for (const pred of allPreds) {
      if (!predsByPart[pred.participation_id]) predsByPart[pred.participation_id] = [];
      predsByPart[pred.participation_id].push(pred);
    }

    // Load all participations (optionally filtered by fund)
    let allParticipations;
    if (fund_id) {
      allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });
    } else {
      allParticipations = await base44.asServiceRole.entities.Participation.list();
    }

    const partUpdates = [];
    for (const part of allParticipations) {
      const preds = predsByPart[part.id] || [];
      let total = 0;
      for (const pred of preds) {
        const match = matchMap[pred.match_id];
        if (!match) continue; // match not finished yet
        let pts = 0;
        for (const opt of (pred.selected_options || [])) {
          if (checkOption(opt, match)) pts += getOptionWeight(opt);
        }
        total += pts;
      }
      if ((part.total_points || 0) !== total) {
        partUpdates.push(
          base44.asServiceRole.entities.Participation.update(part.id, { total_points: total })
        );
      }
    }
    await Promise.all(partUpdates);

    return Response.json({
      ok: true,
      predictions_scored: updates.length,
      participations_updated: partUpdates.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});