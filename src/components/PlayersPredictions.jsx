import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

function formatOption(opt, homeTeam, awayTeam) {
  if (opt.startsWith('exact_')) return 'Score: ' + opt.replace('exact_', '').replace('-', ' - ');
  const labels = {
    home_win: `${homeTeam} Win`,
    away_win: `${awayTeam} Win`,
    draw: 'Draw',
    both_score_yes: 'Both Score',
    both_score_no: 'No BTTS',
    goals_over: 'Over 2.5 Goals',
    goals_under: 'Under 2.5 Goals',
    over_2_5: 'Over 2.5 Goals',
    under_2_5: 'Under 2.5 Goals',
    btts_yes: 'Both Score',
    btts_no: 'No BTTS',
    blowout_yes: 'Blowout (3+)',
    blowout_no: 'No Blowout',
    clean_sheet_home: `${homeTeam} Win to Nil`,
    clean_sheet_away: `${awayTeam} Win to Nil`,
    home_clean_sheet_win: `${homeTeam} Win to Nil`,
    away_clean_sheet_win: `${awayTeam} Win to Nil`,
  };
  return labels[opt] || opt;
}

function isCorrectPrediction(opt, match) {
  if (match.status !== 'finished') return null; // null = pending

  const home = match.home_goals ?? 0;
  const away = match.away_goals ?? 0;
  const total = home + away;
  const diff = Math.abs(home - away);
  const result = match.result; // 'home_win' | 'draw' | 'away_win'

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

function badgeClass(opt, match) {
  const result = isCorrectPrediction(opt, match);
  if (result === true) return 'bg-green-600 text-white border-green-500';
  if (result === false) return 'bg-red-800 text-red-200 border-red-700 line-through opacity-60';
  // Pending - use original colors
  if (opt.startsWith('exact_')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (['home_win', 'away_win', 'draw'].includes(opt)) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (['both_score_yes', 'both_score_no', 'btts_yes', 'btts_no', 'goals_over', 'goals_under', 'over_2_5', 'under_2_5', 'blowout_yes', 'blowout_no'].includes(opt))
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (['clean_sheet_home', 'clean_sheet_away', 'home_clean_sheet_win', 'away_clean_sheet_win'].includes(opt))
    return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function getCorrectSummary(preds, matches) {
  const finishedMatches = matches.filter(m => m.status === 'finished');
  if (finishedMatches.length === 0) return null;

  let correct = 0;
  let total = 0;

  for (const match of finishedMatches) {
    const pred = preds.find(p => p.match_id === match.id);
    const opts = pred?.selected_options || [];
    if (opts.length === 0) continue;
    total++;
    const anyCorrect = opts.some(opt => isCorrectPrediction(opt, match) === true);
    if (anyCorrect) correct++;
  }

  if (total === 0) return null;
  return `${correct} / ${total} correct`;
}

export default function PlayersPredictions({ participants, predictionsMap, allUsers, matches, currentUserId }) {
  const others = participants.filter(p => p.user_id !== currentUserId);
  if (others.length === 0) return null;

  return (
    <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Eye className="w-6 h-6 text-indigo-400" />
        Players' Predictions
      </h2>

      <div className="space-y-6">
        {others.map((participant) => {
          const pUser = allUsers.find(u => u.id === participant.user_id);
          const displayName = pUser?.username || pUser?.full_name || `Player ${participant.user_id.slice(0, 8)}`;
          const preds = predictionsMap[participant.id];
          const hasSubmitted = !!participant.predictions_completed_at;
          const summary = hasSubmitted && preds ? getCorrectSummary(preds, matches) : null;

          return (
            <div key={participant.id} className="p-4 rounded-xl bg-white/5 border border-gray-700">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                    {displayName[0]?.toUpperCase() || "?"}
                  </div>
                  <span className="text-white font-semibold">{displayName}</span>
                </div>
                {hasSubmitted ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{preds?.length ?? 0} predictions</span>
                    {summary && (
                      <span className="text-xs text-gray-500">• {summary}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 italic">Picks pending...</span>
                )}
              </div>

              {hasSubmitted && preds && preds.length > 0 && (
                <div className="space-y-3">
                  {matches.map((match) => {
                    const pred = preds.find(p => p.match_id === match.id);
                    const opts = pred?.selected_options || [];
                    return (
                      <div key={match.id} className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500">{match.home_team} vs {match.away_team}</span>
                        {opts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {opts.map((opt, i) => (
                              <Badge key={i} className={`text-xs ${badgeClass(opt, match)}`}>
                                {formatOption(opt, match.home_team, match.away_team)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-600 italic">No pick for this match</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {!hasSubmitted && (
                <p className="text-sm text-gray-500 italic">Picks pending...</p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}