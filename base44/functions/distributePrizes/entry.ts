import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Scoring helpers (inlined from scoreParticipations) ─────────────────────
function getOptionWeight(option) {
  if (option === 'home_win' || option === 'draw' || option === 'away_win') return 3;
  if (option === 'btts_yes' || option === 'btts_no' || option === 'both_score_yes' || option === 'both_score_no') return 2;
  if (option === 'over_2_5' || option === 'under_2_5' || option === 'goals_over' || option === 'goals_under') return 2.5;
  if (option === 'blowout_yes' || option === 'blowout_no') return 1.5;
  if (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win' || option === 'clean_sheet_home' || option === 'clean_sheet_away') return 4;
  if (option.startsWith('exact_')) return 9;
  return 1;
}

function checkOption(option, match) {
  let h = match.home_goals ?? null;
  let a = match.away_goals ?? null;
  // Defensive fallback: old/bad data may have null goals with a result set.
  // A draw with no goals recorded → treat as 0-0 (most common scoreless result).
  if ((h === null || a === null) && match.result === 'draw') {
    h = 0; a = 0;
  }
  if (h === null || a === null) return false;
  const result = match.result;
  const totalGoals = h + a;
  const goalDiff = Math.abs(h - a);
  const btts = h > 0 && a > 0;
  switch (option) {
    case 'home_win':     return result === 'home_win';
    case 'draw':         return result === 'draw';
    case 'away_win':     return result === 'away_win';
    case 'btts_yes':
    case 'both_score_yes': return btts;
    case 'btts_no':
    case 'both_score_no':  return !btts;
    case 'over_2_5':
    case 'goals_over':   return totalGoals > 2;
    case 'under_2_5':
    case 'goals_under':  return totalGoals <= 2;
    case 'blowout_yes':  return goalDiff >= 3;
    case 'blowout_no':   return goalDiff < 3;
    case 'home_clean_sheet_win':
    case 'clean_sheet_home': return result === 'home_win' && a === 0;
    case 'away_clean_sheet_win':
    case 'clean_sheet_away': return result === 'away_win' && h === 0;
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

function getPickPoints(fund, matchId, option) {
  const weight = getOptionWeight(option);
  // Multiplier path is disabled — all funds use standard fixed weights.
  if (false && fund && fund.scoring_mode === 'multiplier' && fund.multipliers && Object.keys(fund.multipliers).length > 0) {
    const mult = fund.multipliers[`${matchId}_${option}`];
    if (mult === undefined || mult === null) return weight;
    return Math.round(weight * mult * 100) / 100;
  }
  return Math.floor(weight); // standard mode → fixed weights, floored to whole number
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin only (allow internal automation calls with no user)
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && !user.is_admin) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { fund_id } = body;
    if (!fund_id) {
      return Response.json({ error: 'fund_id required' }, { status: 400 });
    }

    let fund;
    try {
      fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    } catch {
      return Response.json({ error: 'Fund not found' }, { status: 404 });
    }
    if (fund.status === 'finished' || fund.status === 'cancelled') {
      return Response.json({ ok: true, message: 'Fund already finished/cancelled', skipped: true });
    }

    // Load fund matches and check all finished
    const fundMatches = await base44.asServiceRole.entities.FundMatch.filter({ fund_id });
    const fundMatchIds = fundMatches.map(fm => fm.match_id);
    const allFundMatchObjects = [];
    for (const id of fundMatchIds) {
      try {
        allFundMatchObjects.push(await base44.asServiceRole.entities.Match.get(id));
      } catch (e) { /* orphaned FundMatch — match deleted, skip */ }
    }
    const allFinished = allFundMatchObjects.length > 0 && allFundMatchObjects.every(m => m.status === 'finished');
    if (!allFinished) {
      return Response.json({ ok: true, message: 'Not all matches finished yet', skipped: true });
    }

    const matchMap = {};
    for (const m of allFundMatchObjects) matchMap[m.id] = m;

    // Load participations
    const allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });

    // Edge case: 0 participants
    if (allParticipations.length === 0) {
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed with no participants.' });
    }

    const partIds = allParticipations.map(p => p.id);

    // Load all predictions for this fund's participations
    const allPredictions = await base44.asServiceRole.entities.Prediction.list();
    const fundPredictions = allPredictions.filter(p => partIds.includes(p.participation_id));

    // ── Score predictions & compute participation totals ──────────────────
    const creditsPerPlayer = fund.credits_per_player || 12;
    const predsByPart = {};
    for (const pred of fundPredictions) {
      if (!predsByPart[pred.participation_id]) predsByPart[pred.participation_id] = [];
      predsByPart[pred.participation_id].push(pred);
    }

    const predUpdates = [];
    const partTotals = {}; // participation_id → total_points

    for (const part of allParticipations) {
      const preds = predsByPart[part.id] || [];
      let total = 0;
      for (const pred of preds) {
        const match = matchMap[pred.match_id];
        if (!match) continue;
        let pts = 0;
        for (const opt of (pred.selected_options || [])) {
          if (checkOption(opt, match)) {
            pts += getPickPoints(fund, pred.match_id, opt);
          }
        }
        pts = Math.floor(pts); // whole numbers only
        const isCorrect = pts > 0;
        if (pred.points_earned !== pts || pred.is_correct !== isCorrect) {
          predUpdates.push(
            base44.asServiceRole.entities.Prediction.update(pred.id, {
              points_earned: pts,
              is_correct: isCorrect
            })
          );
        }
        total += pts;
      }
      // Unused credits bonus (0.5 pts per unused credit)
      const creditsUsed = part.credits_used ?? 0;
      const unusedCredits = Math.max(0, creditsPerPlayer - creditsUsed);
      total += unusedCredits * 0.5;
      partTotals[part.id] = Math.floor(total); // whole numbers only
    }

    await Promise.all(predUpdates);

    // Update participation totals
    await Promise.all(
      allParticipations.map(part =>
        base44.asServiceRole.entities.Participation.update(part.id, { total_points: partTotals[part.id] })
      )
    );

    // ── Prize distribution ────────────────────────────────────────────────
    const allUsers = await base44.asServiceRole.entities.User.list();
    const activeParticipations = allParticipations.filter(p => p.status === 'active' || p.status === 'pending');
    const minRequired = fund.min_participants || 2;

    const payCreatorBonus = async () => {
      const creatorPart = allParticipations.find(p => p.is_creator);
      if (creatorPart && creatorBonus > 0) {
        await base44.asServiceRole.entities.Participation.update(creatorPart.id, { creator_bonus: creatorBonus });
        const creator = allUsers.find(u => u.id === creatorPart.user_id);
        if (creator) {
          await base44.asServiceRole.entities.User.update(creator.id, {
            total_balance: (creator.total_balance || 0) + creatorBonus
          });
        }
      }
    };

    // Not enough participants → refund all
    if (activeParticipations.length < minRequired) {
      for (const p of allParticipations) {
        const refund = p.entry_paid || 0;
        await base44.asServiceRole.entities.Participation.update(p.id, {
          final_payout: refund,
          status: 'refunded',
          paid_out_at: new Date().toISOString()
        });
        const usr = allUsers.find(u => u.id === p.user_id);
        if (usr) {
          await base44.asServiceRole.entities.User.update(p.user_id, {
            total_balance: (usr.total_balance || 0) + refund
          });
        }
      }
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'cancelled' });
      return Response.json({ ok: true, message: 'Fund cancelled - not enough participants. 100% refunded.' });
    }

    const totalPool = fund.total_pool || 0;
    const platformFee = Math.floor(totalPool * (fund.platform_fee_percent || 7) / 100);
    const creatorBonus = Math.floor(totalPool * (fund.creator_bonus_percent || 1) / 100);
    const prizePool = totalPool - platformFee - creatorBonus;

    // No prize pool after fees
    if (prizePool <= 0) {
      await Promise.all(
        allParticipations.map(p =>
          base44.asServiceRole.entities.Participation.update(p.id, { status: 'loser', final_payout: 0 })
        )
      );
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed. No prize pool left after fees.' });
    }

    const ranked = [...activeParticipations].sort((a, b) => (partTotals[b.id] || 0) - (partTotals[a.id] || 0));
    const count = ranked.length;

    const payParticipant = async (p, prize, rank) => {
      await base44.asServiceRole.entities.Participation.update(p.id, {
        final_payout: prize,
        final_rank: rank,
        status: prize > 0 ? 'winner' : 'loser',
        paid_out_at: new Date().toISOString()
      });
      if (prize > 0) {
        const usr = allUsers.find(u => u.id === p.user_id);
        if (usr) {
          await base44.asServiceRole.entities.User.update(p.user_id, {
            total_balance: (usr.total_balance || 0) + prize,
            total_winnings: (usr.total_winnings || 0) + prize,
            total_wins: (usr.total_wins || 0) + 1
          });
        }
      }
    };

    // 1 participant → refund
    if (count === 1) {
      const p = ranked[0];
      const refund = p.entry_paid || 0;
      await base44.asServiceRole.entities.Participation.update(p.id, {
        final_payout: refund,
        final_rank: 1,
        status: 'refunded',
        paid_out_at: new Date().toISOString()
      });
      const usr = allUsers.find(u => u.id === p.user_id);
      if (usr) {
        await base44.asServiceRole.entities.User.update(p.user_id, {
          total_balance: (usr.total_balance || 0) + refund
        });
      }
      await payCreatorBonus();
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed with 1 participant. Entry fee refunded.' });
    }

    // 2 participants → 60/40
    if (count === 2) {
      const prizes = [Math.floor(prizePool * 0.60), Math.floor(prizePool * 0.40)];
      for (let i = 0; i < 2; i++) {
        await payParticipant(ranked[i], prizes[i], i + 1);
      }
      await payCreatorBonus();
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed! Prizes: 60/40 split' });
    }

    // 3 participants → 50/30/20
    if (count === 3) {
      const prizes = [Math.floor(prizePool * 0.50), Math.floor(prizePool * 0.30), Math.floor(prizePool * 0.20)];
      for (let i = 0; i < 3; i++) {
        await payParticipant(ranked[i], prizes[i], i + 1);
      }
      await payCreatorBonus();
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed! Prizes: 50/30/20 split' });
    }

    // 4–9 participants → 40/25/15 + rest split
    if (count >= 4 && count <= 9) {
      const p1 = Math.floor(prizePool * 0.40);
      const p2 = Math.floor(prizePool * 0.25);
      const p3 = Math.floor(prizePool * 0.15);
      const rest = Math.floor(prizePool * 0.20);
      const restCount = count - 3;
      const prizePerRest = restCount > 0 ? Math.floor(rest / restCount) : 0;
      for (let i = 0; i < count; i++) {
        const rank = i + 1;
        let prize = 0;
        if (rank === 1) prize = p1;
        else if (rank === 2) prize = p2;
        else if (rank === 3) prize = p3;
        else prize = prizePerRest;
        await payParticipant(ranked[i], prize, rank);
      }
      await payCreatorBonus();
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: `Fund completed! Prizes distributed to ${count} players!` });
    }

    // 10+ participants → 40/25/15 + rest split (top 10)
    const p1 = Math.floor(prizePool * 0.40);
    const p2 = Math.floor(prizePool * 0.25);
    const p3 = Math.floor(prizePool * 0.15);
    const rest = Math.floor(prizePool * 0.20);
    const top10Count = Math.min(10, count) - 3;
    const prizePerRest = top10Count > 0 ? Math.floor(rest / top10Count) : 0;
    for (let i = 0; i < count; i++) {
      const rank = i + 1;
      let prize = 0;
      if (rank === 1) prize = p1;
      else if (rank === 2) prize = p2;
      else if (rank === 3) prize = p3;
      else if (rank <= 10) prize = prizePerRest;
      else prize = 0;
      await payParticipant(ranked[i], prize, rank);
    }
    await payCreatorBonus();
    await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
    return Response.json({ ok: true, message: 'Fund completed! Prizes distributed!' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});