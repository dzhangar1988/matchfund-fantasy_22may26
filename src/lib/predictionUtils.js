// Shared prediction label and badge utilities
// Used by both FundDetails (Your Predictions) and PlayersPredictions

// ── Canonical option names & aliases ───────────────────────────────────────
// CreateFund uses btts_yes / over_2_5 / home_clean_sheet_win etc.
// FundDetails edit UI uses both_score_yes / goals_over / clean_sheet_home etc.
// normalizeOptions maps all aliases to the FundDetails UI names so that
// toggle checks (includes) work regardless of which screen created the picks.
const OPTION_NORMALIZE_MAP = {
  'btts_yes': 'both_score_yes',
  'btts_no': 'both_score_no',
  'over_2_5': 'goals_over',
  'under_2_5': 'goals_under',
  'home_clean_sheet_win': 'clean_sheet_home',
  'away_clean_sheet_win': 'clean_sheet_away',
};

// Normalize + dedupe an array of option strings.
export function normalizeOptions(options) {
  return [...new Set((options || []).map(o => OPTION_NORMALIZE_MAP[o] || o))];
}

// Simple dedupe (no alias mapping).
export function dedupePicks(picks) {
  return [...new Set(picks || [])];
}

// ── Mutual exclusivity & conflict rules (canonical names) ──────────────────
export const MUTEX_GROUPS = [
  ['both_score_yes', 'both_score_no'],
  ['goals_over', 'goals_under'],
  ['blowout_yes', 'blowout_no'],
  // Alias variants for safety with un-normalized data
  ['btts_yes', 'btts_no'],
  ['over_2_5', 'under_2_5'],
  ['home_clean_sheet_win', 'away_clean_sheet_win'],
  ['et_home_win', 'et_away_win'],
  ['pen_home_win', 'pen_away_win'],
];

export const CONFLICTS = [
  ['both_score_yes', 'clean_sheet_home'],
  ['both_score_yes', 'clean_sheet_away'],
  ['draw', 'clean_sheet_home'],
  ['draw', 'clean_sheet_away'],
  // Alias variants
  ['btts_yes', 'home_clean_sheet_win'],
  ['btts_yes', 'away_clean_sheet_win'],
];

// ── Shared toggle function ──────────────────────────────────────────────────
// Clicking a selected option removes it; clicking an unselected one adds it
// (after removing mutex partners / conflicts and enforcing max-per-match).
// Always deduplicates input so no option can appear twice.
export function togglePick(currentPicks, option, { mutexGroups = [], conflicts = [], maxPerMatch = 2 } = {}) {
  const picks = [...new Set(currentPicks)];

  // Toggle OFF if already selected
  if (picks.includes(option)) {
    return picks.filter(o => o !== option);
  }

  // Toggle ON: remove mutex partners and conflicting options first
  let updated = [...picks];
  for (const group of mutexGroups) {
    if (group.includes(option)) {
      updated = updated.filter(o => !group.includes(o));
    }
  }
  for (const [a, b] of conflicts) {
    if (option === a) updated = updated.filter(o => o !== b);
    if (option === b) updated = updated.filter(o => o !== a);
  }

  // Enforce max per match
  if (updated.length >= maxPerMatch) return picks;

  return [...updated, option];
}

// Allowed predictions formula: ≤3 matches → matches+1, ≥4 matches → matches+2
export function getAllowedPredictions(matchCount) {
  if (matchCount <= 0) return 0;
  if (matchCount <= 3) return matchCount + 1;
  return matchCount + 2;
}

// Shared prediction validation — mirrors functions/validatePredictions.js
// SINGLE SOURCE OF TRUTH for client-side prediction validation.
// Called by: CreateFund, FundDetails
export function validatePredictions(predictions, matchCount, matchIds) {
  if (!matchCount || matchCount < 1) {
    return { valid: false, error: 'Invalid match count', total: 0, allowed: 0 };
  }

  const allowed = getAllowedPredictions(matchCount);
  const ids = Array.isArray(matchIds) ? matchIds : Object.keys(predictions || {});
  let total = 0;

  // Per-match rule: 1–2 picks
  for (const matchId of ids) {
    const opts = (predictions && predictions[matchId]) || [];
    if (opts.length < 1) {
      return { valid: false, error: 'Each match needs at least 1 pick', total, allowed };
    }
    if (opts.length > 2) {
      return { valid: false, error: 'Maximum 2 picks per match', total, allowed };
    }
    total += opts.length;
  }

  // Total minimum: at least matchCount (1 per match)
  if (total < matchCount) {
    return { valid: false, error: `Need at least ${matchCount} predictions (1 per match)`, total, allowed };
  }

  // Total maximum: allowed cap
  if (total > allowed) {
    return { valid: false, error: `Prediction limit exceeded: ${total} picks, but only ${allowed} allowed for ${matchCount} match${matchCount !== 1 ? 'es' : ''}.`, total, allowed };
  }

  return { valid: true, error: null, total, allowed };
}

export function formatOption(opt, homeTeam, awayTeam) {
  if (opt.startsWith('exact_')) return 'Score: ' + opt.replace('exact_', '').replace('-', ' - ');
  const labels = {
    home_win: `${homeTeam} Win`,
    away_win: `${awayTeam} Win`,
    draw: 'Draw',
    both_score_yes: 'Both Score',
    btts_yes: 'Both Score',
    both_score_no: 'No BTTS',
    btts_no: 'No BTTS',
    goals_over: 'Over 2.5 Goals',
    over_2_5: 'Over 2.5 Goals',
    goals_under: 'Under 2.5 Goals',
    under_2_5: 'Under 2.5 Goals',
    blowout_yes: 'Blowout (3+)',
    blowout_no: 'No Blowout',
    clean_sheet_home: `${homeTeam} Win to Nil`,
    clean_sheet_away: `${awayTeam} Win to Nil`,
    home_clean_sheet_win: `${homeTeam} Win to Nil`,
    away_clean_sheet_win: `${awayTeam} Win to Nil`,
    et_home_win: `${homeTeam} ET Win`,
    et_away_win: `${awayTeam} ET Win`,
    pen_home_win: `${homeTeam} Pen Win`,
    pen_away_win: `${awayTeam} Pen Win`,
  };
  return labels[opt] || opt;
}

export function isCorrectPrediction(opt, match) {
  if (match.status !== 'finished') return null; // null = pending

  const home = match.home_goals ?? 0;
  const away = match.away_goals ?? 0;
  const total = home + away;
  const diff = Math.abs(home - away);
  const result = match.result;

  if (opt === 'home_win') return result === 'home_win';
  if (opt === 'away_win') return result === 'away_win';
  if (opt === 'draw') return result === 'draw';

  if (opt === 'both_score_yes' || opt === 'btts_yes') return home > 0 && away > 0;
  if (opt === 'both_score_no' || opt === 'btts_no') return !(home > 0 && away > 0);

  if (opt === 'goals_over' || opt === 'over_2_5') return total > 2.5;
  if (opt === 'goals_under' || opt === 'under_2_5') return total <= 2.5;

  if (opt === 'blowout_yes') return diff >= 3;
  if (opt === 'blowout_no') return diff < 3;

  if (opt === 'clean_sheet_home' || opt === 'home_clean_sheet_win') return result === 'home_win' && away === 0;
  if (opt === 'clean_sheet_away' || opt === 'away_clean_sheet_win') return result === 'away_win' && home === 0;

  if (opt === 'et_home_win')  return match.decided_by === 'extra_time' && home > away;
  if (opt === 'et_away_win')  return match.decided_by === 'extra_time' && away > home;
  if (opt === 'pen_home_win') return match.decided_by === 'penalties' && match.penalty_winner === 'home';
  if (opt === 'pen_away_win') return match.decided_by === 'penalties' && match.penalty_winner === 'away';

  if (opt.startsWith('exact_')) {
    const score = opt.replace('exact_', '');
    return score === `${home}-${away}`;
  }

  return null;
}

export function badgeClass(opt, match) {
  const result = isCorrectPrediction(opt, match);
  if (result === true) return 'bg-green-600 text-white border-green-500';
  if (result === false) return 'bg-red-800 text-red-200 border-red-700 line-through opacity-60';
  // Pending - original colors
  if (opt.startsWith('exact_')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (['home_win', 'away_win', 'draw'].includes(opt)) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (['both_score_yes', 'both_score_no', 'btts_yes', 'btts_no', 'goals_over', 'goals_under', 'over_2_5', 'under_2_5', 'blowout_yes', 'blowout_no'].includes(opt))
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (['clean_sheet_home', 'clean_sheet_away', 'home_clean_sheet_win', 'away_clean_sheet_win'].includes(opt))
    return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (['et_home_win', 'et_away_win', 'pen_home_win', 'pen_away_win'].includes(opt))
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// A match is knockout-stage if group is "Knockouts" or null (no group letter).
export function isKnockoutMatch(match) {
  return !match.group || match.group === "Knockouts";
}

// Knockout-only options (Extra Time / Penalty Win), 7 pts each.
// Returns null for group-stage matches (group is set).
export function getKnockoutOptions(match) {
  if (!isKnockoutMatch(match)) return null;
  return [
    { value: 'et_home_win',  label: `${match.home_team} ET Win` },
    { value: 'et_away_win',  label: `${match.away_team} ET Win` },
    { value: 'pen_home_win', label: `${match.home_team} Pen Win` },
    { value: 'pen_away_win', label: `${match.away_team} Pen Win` },
  ];
}