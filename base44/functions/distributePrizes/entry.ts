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
  return Math.floor(getOptionWeight(option));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin' && !user.is_admin) {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { fund_id, force } = body;
    if (!fund_id) {
      return Response.json({ error: 'fund_id required' }, { status: 400 });
    }

    let fund;
    try {
      fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    } catch {
      return Response.json({ error: 'Fund not found' }, { status: 404 });
    }

    // Skip already-finished funds unless force=true
    if (!force && (fund.status === 'finished' || fund.status === 'cancelled')) {
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
    // In force mode, proceed even if matches are orphaned (all deleted) — use existing total_points.
    if (!allFinished && !force) {
      return Response.json({ ok: true, message: 'Not all matches finished yet', skipped: true });
    }
    const hasValidMatches = allFundMatchObjects.length > 0;

    const matchMap = {};
    for (const m of allFundMatchObjects) matchMap[m.id] = m;

    // Load participations
    const allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });
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
    const partTotals = {};

    for (const part of allParticipations) {
      const preds = predsByPart[part.id] || [];
      let total = 0;
      // If matches are orphaned (force mode), skip re-scoring and keep existing total_points.
      if (!hasValidMatches && force) {
        partTotals[part.id] = part.total_points || 0;
        continue;
      }
      for (const pred of preds) {
        const match = matchMap[pred.match_id];
        if (!match) continue;
        let pts = 0;
        for (const opt of (pred.selected_options || [])) {
          if (checkOption(opt, match)) {
            pts += getPickPoints(fund, pred.match_id, opt);
          }
        }
        pts = Math.floor(pts);
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
      partTotals[part.id] = Math.floor(total);
    }

    await Promise.all(predUpdates);
    await Promise.all(
      allParticipations.map(part =>
        base44.asServiceRole.entities.Participation.update(part.id, { total_points: partTotals[part.id] })
      )
    );

    // ── Prize distribution ────────────────────────────────────────────────
    const allUsers = await base44.asServiceRole.entities.User.list();
    const userMap = {};
    for (const u of allUsers) userMap[u.id] = u;

    // In force mode, re-distribute to all non-refunded participations.
    // In normal mode, only active/pending are eligible.
    const eligible = force
      ? allParticipations.filter(p => p.status !== 'refunded')
      : allParticipations.filter(p => p.status === 'active' || p.status === 'pending');

    const minRequired = fund.min_participants || 2;

    // Compute correct pool from entry_fee * count (not fund.total_pool which may be stale)
    const grossPool = (fund.entry_fee || 0) * eligible.length;

    // Fix total_pool on the fund
    await base44.asServiceRole.entities.MatchFund.update(fund_id, { total_pool: grossPool });

    // Not enough participants → refund all
    if (eligible.length < minRequired) {
      for (const p of eligible) {
        const oldPayout = p.final_payout || 0;
        const refund = p.entry_paid || 0;
        const delta = refund - oldPayout;

        await base44.asServiceRole.entities.Participation.update(p.id, {
          final_payout: refund,
          final_rank: 1,
          status: 'refunded',
          paid_out_at: new Date().toISOString()
        });

        if (delta !== 0) {
          const usr = userMap[p.user_id];
          if (usr) {
            await base44.asServiceRole.entities.User.update(p.user_id, {
              total_balance: (usr.total_balance || 0) + delta
            });
            usr.total_balance = (usr.total_balance || 0) + delta;
          }
        }
      }
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'cancelled' });
      return Response.json({ ok: true, message: 'Fund cancelled - not enough participants. 100% refunded.' });
    }

    const platformFee = Math.floor(grossPool * (fund.platform_fee_percent || 7) / 100);
    const creatorBonusAmount = Math.floor(grossPool * (fund.creator_bonus_percent || 1) / 100);
    const prizePool = grossPool - platformFee - creatorBonusAmount;

    // No prize pool after fees
    if (prizePool <= 0) {
      for (const p of eligible) {
        const oldPayout = p.final_payout || 0;
        const oldStatus = p.status;
        const delta = -oldPayout;
        await base44.asServiceRole.entities.Participation.update(p.id, {
          status: 'loser',
          final_payout: 0,
          final_rank: null
        });
        if (delta !== 0) {
          const usr = userMap[p.user_id];
          if (usr) {
            const userUpdates = { total_balance: (usr.total_balance || 0) + delta };
            if (oldStatus === 'winner') {
              userUpdates.total_winnings = Math.max(0, (usr.total_winnings || 0) - oldPayout);
              userUpdates.total_wins = Math.max(0, (usr.total_wins || 0) - 1);
            }
            await base44.asServiceRole.entities.User.update(p.user_id, userUpdates);
          }
        }
      }
      await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
      return Response.json({ ok: true, message: 'Fund completed. No prize pool left after fees.' });
    }

    // Use prize_distribution (array of percentages like [100] or [60,40] or [50,30,20])
    const dist = Array.isArray(fund.prize_distribution) && fund.prize_distribution.length > 0
      ? fund.prize_distribution
      : [100];

    const ranked = [...eligible].sort((a, b) => (partTotals[b.id] || 0) - (partTotals[a.id] || 0));

    // Group by tied points
    const groups = [];
    for (const part of ranked) {
      const last = groups[groups.length - 1];
      if (last && partTotals[last[0].id] === partTotals[part.id]) {
        last.push(part);
      } else {
        groups.push([part]);
      }
    }

    // Assign prizes respecting ties
    const prizes = {};
    let splitIndex = 0;
    for (const group of groups) {
      const sharesForGroup = dist.slice(splitIndex, splitIndex + group.length).map(pct => pct / 100);
      if (sharesForGroup.length === 0) break;
      const totalShare = sharesForGroup.reduce((s, v) => s + v, 0);
      const prizePerPlayer = Math.floor((prizePool * totalShare) / group.length);
      for (const part of group) {
        prizes[part.id] = prizePerPlayer;
      }
      splitIndex += group.length;
    }

    // Apply prizes using delta approach — idempotent: running twice = net zero change.
    // Each run computes correctPrize - oldPrize; if already correct, delta=0.
    for (let i = 0; i < ranked.length; i++) {
      const part = ranked[i];
      const correctPrize = prizes[part.id] || 0;
      const oldPrize = part.final_payout || 0;
      const oldStatus = part.status;
      const newStatus = correctPrize > 0 ? 'winner' : 'loser';
      const rank = i + 1;
      const delta = correctPrize - oldPrize;

      await base44.asServiceRole.entities.Participation.update(part.id, {
        final_payout: correctPrize,
        final_rank: rank,
        status: newStatus,
        paid_out_at: new Date().toISOString()
      });

      if (delta !== 0 || (oldStatus !== newStatus && (oldPrize > 0 || correctPrize > 0))) {
        const usr = userMap[part.user_id];
        if (usr) {
          const userUpdates = {};
          if (delta !== 0) {
            userUpdates.total_balance = (usr.total_balance || 0) + delta;
          }
          if (correctPrize > 0 && oldPrize === 0) {
            userUpdates.total_winnings = (usr.total_winnings || 0) + correctPrize;
            userUpdates.total_wins = (usr.total_wins || 0) + 1;
          } else if (correctPrize === 0 && oldPrize > 0) {
            userUpdates.total_winnings = Math.max(0, (usr.total_winnings || 0) - oldPrize);
            userUpdates.total_wins = Math.max(0, (usr.total_wins || 0) - 1);
          } else if (correctPrize > 0 && oldPrize > 0 && delta !== 0) {
            userUpdates.total_winnings = Math.max(0, (usr.total_winnings || 0) + delta);
          }
          if (Object.keys(userUpdates).length > 0) {
            await base44.asServiceRole.entities.User.update(part.user_id, userUpdates);
            if (userUpdates.total_balance !== undefined) usr.total_balance = userUpdates.total_balance;
            if (userUpdates.total_winnings !== undefined) usr.total_winnings = userUpdates.total_winnings;
            if (userUpdates.total_wins !== undefined) usr.total_wins = userUpdates.total_wins;
          }
        }
      }
    }

    // Creator bonus (delta approach — idempotent)
    if (creatorBonusAmount > 0) {
      const creatorPart = allParticipations.find(p => p.is_creator);
      if (creatorPart) {
        const oldBonus = creatorPart.creator_bonus || 0;
        const deltaBonus = creatorBonusAmount - oldBonus;
        await base44.asServiceRole.entities.Participation.update(creatorPart.id, { creator_bonus: creatorBonusAmount });
        if (deltaBonus !== 0) {
          const creator = userMap[fund.creator_id];
          if (creator) {
            await base44.asServiceRole.entities.User.update(fund.creator_id, {
              total_balance: (creator.total_balance || 0) + deltaBonus
            });
          }
        }
      }
    }

    await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'finished' });
    return Response.json({ ok: true, message: 'Fund completed! Prizes distributed per prize_distribution.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});