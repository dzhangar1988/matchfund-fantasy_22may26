// Shared scoring logic for match predictions.
// Single source of truth for the frontend (AdminMatches).
// Backend functions (scoreParticipations.js, distributePrizes.js) maintain
// inline copies — they deploy independently and cannot import local files.
// Keep all copies in sync with this file.

// ── Scoring weights ────────────────────────────────────────────────────────
// match_result (home/draw/away): 3 pts
// btts_yes / btts_no:            2 pts
// over_2_5 / under_2_5:          2.5 pts (floored to 2)
// blowout_yes / blowout_no:      1.5 pts (floored to 1)
// clean_sheet (home/away):       4 pts
// exact_score:                   9 pts

export function getOptionWeight(option) {
  if (option === 'home_win' || option === 'draw' || option === 'away_win') return 3;
  if (option === 'btts_yes' || option === 'btts_no' || option === 'both_score_yes' || option === 'both_score_no') return 2;
  if (option === 'over_2_5' || option === 'under_2_5' || option === 'goals_over' || option === 'goals_under') return 2.5;
  if (option === 'blowout_yes' || option === 'blowout_no') return 1.5;
  if (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win' || option === 'clean_sheet_home' || option === 'clean_sheet_away') return 4;
  if (option.startsWith('exact_')) return 9;
  return 1;
}

export function checkOption(option, match) {
  let h = match.home_goals ?? null;
  let a = match.away_goals ?? null;

  // Defensive fallback: old/bad data may have null goals with a result set.
  // A draw with no goals recorded → treat as 0-0 (most common scoreless result).
  if ((h === null || a === null) && match.result === 'draw') {
    h = 0;
    a = 0;
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

export function getPickPoints(fund, matchId, option) {
  const weight = getOptionWeight(option);
  // Multiplier path is disabled — all funds use standard fixed weights.
  return Math.floor(weight);
}