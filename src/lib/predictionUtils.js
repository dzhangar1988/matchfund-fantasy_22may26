// Shared prediction label and badge utilities
// Used by both FundDetails (Your Predictions) and PlayersPredictions

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
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}