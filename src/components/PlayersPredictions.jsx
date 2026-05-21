import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { formatOption, badgeClass, isCorrectPrediction } from "@/lib/predictionUtils";

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

export default function PlayersPredictions({ participants, predictionsMap, matches, currentUserId }) {
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
          const displayName = participant.user_name || participant.user_email || `Player ${participant.user_id.slice(0, 8)}`;
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