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
    goals_over: '3+ Goals',
    goals_under: '0-2 Goals',
    blowout_yes: 'Blowout (3+)',
    blowout_no: 'No Blowout',
    clean_sheet_home: `${homeTeam} Win to Nil`,
    clean_sheet_away: `${awayTeam} Win to Nil`,
  };
  return labels[opt] || opt;
}

function badgeColor(opt) {
  if (opt.startsWith('exact_')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (['home_win', 'away_win', 'draw'].includes(opt)) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (['both_score_yes', 'both_score_no', 'goals_over', 'goals_under', 'blowout_yes', 'blowout_no'].includes(opt))
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (['clean_sheet_home', 'clean_sheet_away'].includes(opt)) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
          const preds = predictionsMap[participant.id]; // array of Prediction records, or undefined = not loaded yet
          const hasSubmitted = !!participant.predictions_completed_at;

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
                  <span className="text-xs text-gray-400">{preds?.length ?? 0} predictions</span>
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
                              <Badge key={i} className={`text-xs ${badgeColor(opt)}`}>
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