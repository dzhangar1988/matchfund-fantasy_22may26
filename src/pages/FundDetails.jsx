
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Clock, Target, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FundDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const fundId = urlParams.get("id");

  const [fund, setFund] = useState(null);
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [myPredictions, setMyPredictions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showExactScore, setShowExactScore] = useState({});
  const [exactScores, setExactScores] = useState({});

  useEffect(() => {
    if (!fundId) {
      setError("No fund ID provided");
      setIsLoading(false);
      return;
    }
    loadData();
  }, [fundId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allFunds = await base44.entities.MatchFund.list();
      const selectedFund = allFunds.find((f) => f.id === fundId);
      
      if (!selectedFund) {
        setError(`Fund not found`);
        setIsLoading(false);
        return;
      }
      
      setFund(selectedFund);

      const fundMatches = await base44.entities.FundMatch.filter({ fund_id: fundId }, "position");
      const matchIds = fundMatches.map(fm => fm.match_id);
      
      const matchesData = [];
      const allMatches = await base44.entities.Match.list();
      
      for (const matchId of matchIds) {
        const match = allMatches.find(m => m.id === matchId);
        if (match) matchesData.push(match);
      }
      
      setMatches(matchesData);

      const allParticipations = await base44.entities.Participation.filter({ fund_id: fundId }, "-total_points");
      setParticipants(allParticipations);

      const myParticipation = allParticipations.find(p => p.user_id === currentUser.id);
      setHasJoined(!!myParticipation);

      if (myParticipation) {
        const allPredictions = await base44.entities.Prediction.filter({ participation_id: myParticipation.id });
        setMyPredictions(allPredictions);
      } else {
        const initialPredictions = {};
        matchesData.forEach((match) => {
          initialPredictions[match.id] = [];
        });
        setPredictions(initialPredictions);
      }
    } catch (error) {
      setError(error.message || "Failed to load fund details");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredictionChange = (matchId, option, checked) => {
    setPredictions(prev => {
      const current = prev[matchId] || [];
      if (checked) {
        return { ...prev, [matchId]: [...current, option] };
      } else {
        return { ...prev, [matchId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleExactScore = (matchId, home, away) => {
    if (home === "" || home === null || home === undefined || 
        away === "" || away === null || away === undefined) {
      setPredictions(prev => {
        const current = prev[matchId] || [];
        const withoutExact = current.filter(o => !o.startsWith('exact_'));
        return { ...prev, [matchId]: withoutExact };
      });
      return;
    }
    
    const exactOption = `exact_${home}-${away}`;
    setPredictions(prev => {
      const current = prev[matchId] || [];
      const withoutExact = current.filter(o => !o.startsWith('exact_'));
      return { ...prev, [matchId]: [...withoutExact, exactOption] };
    });
  };

  const toggleExactScore = (matchId) => {
    setShowExactScore(prev => {
      const newState = { ...prev, [matchId]: !prev[matchId] };
      
      if (!newState[matchId]) { // If it's now hidden (was true, now false)
        setPredictions(current => { // Remove exact prediction
          const opts = current[matchId] || [];
          const withoutExact = opts.filter(o => !o.startsWith('exact_'));
          return { ...current, [matchId]: withoutExact };
        });
        setExactScores(current => { // Clear exact scores input
          const newScores = { ...current };
          delete newScores[matchId];
          return newScores;
        });
      }
      
      return newState;
    });
  };

  const handleExactScoreInput = (matchId, field, value) => {
    setExactScores(prev => {
      const updated = { ...prev, [matchId]: { ...prev[matchId], [field]: value } };
      const home = field === 'home' ? value : updated[matchId]?.home;
      const away = field === 'away' ? value : updated[matchId]?.away;
      
      // Call handleExactScore only if both fields have values
      if (home !== undefined && home !== "" && away !== undefined && away !== "") {
        handleExactScore(matchId, home, away);
      } else {
        // If one of the fields is cleared, also clear the prediction
        handleExactScore(matchId, "", ""); // Pass empty to trigger removal
      }
      
      return updated;
    });
  };

  const getTotalCredits = () => {
    return Object.values(predictions).reduce((sum, opts) => sum + opts.length, 0);
  };

  const getMatchCredits = (matchId) => {
    return (predictions[matchId] || []).length;
  };

  const allPredictionsValid = () => {
    if (matches.length === 0) return false;
    const totalCredits = getTotalCredits();
    if (totalCredits < 10 || totalCredits > 12) return false;
    
    for (const match of matches) {
      const opts = predictions[match.id] || [];
      if (opts.length === 0 || opts.length > 3) return false;
    }
    return true;
  };

  const submitPredictions = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!user || user.total_balance === null || user.total_balance === undefined) {
        throw new Error("Unable to verify your balance. Please refresh and try again.");
      }

      if (user.total_balance < fund.entry_fee) {
        throw new Error(`Insufficient balance! You need $${fund.entry_fee} but have $${user.total_balance}`);
      }

      if (!allPredictionsValid()) {
        throw new Error("Invalid predictions. Use 10-12 credits total, 1-3 per match.");
      }

      const totalCredits = getTotalCredits();
      const participation = await base44.entities.Participation.create({
        fund_id: fundId,
        user_id: user.id,
        entry_paid: fund.entry_fee,
        is_creator: false,
        status: "active",
        credits_used: totalCredits,
        total_points: 0,
        joined_at: new Date().toISOString(),
        predictions_completed_at: new Date().toISOString()
      });

      for (const match of matches) {
        const opts = predictions[match.id] || [];
        await base44.entities.Prediction.create({
          participation_id: participation.id,
          match_id: match.id,
          selected_options: opts,
          credits_spent: opts.length
        });
      }

      const newBalance = Math.max(0, user.total_balance - fund.entry_fee);
      await base44.entities.User.update(user.id, {
        total_balance: newBalance,
        total_predictions: (user.total_predictions || 0) + matches.length
      });

      // ✅ FIX: Update total_pool when new participant joins
      const currentFund = await base44.entities.MatchFund.get(fundId);
      await base44.entities.MatchFund.update(fundId, {
        total_pool: (currentFund.total_pool || 0) + fund.entry_fee
      });

      // ✅ Reload data instead of navigate
      await loadData();
      
      // Scroll to top to show success
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setError(error.message || "Failed to submit predictions");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Show gross pool (before fees)
  // The fund?.entry_fee should always be defined if fund exists, but || 0 is a safe fallback.
  const prizePool = participants.length * (fund?.entry_fee || 0);

  const totalCredits = getTotalCredits();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading fund details...</p>
        </div>
      </div>
    );
  }

  if (error || !fund) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Fund Not Found</h2>
          <p className="text-gray-400 mb-6 text-center">{error || "The requested fund could not be found."}</p>
          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Home"))}
          className="mb-6 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-3">{fund.title}</h1>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {fund.credits_per_player || 12} Кредитов
                </Badge>
                <Badge className={`${
                  fund.status === "open" 
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : fund.status === "closed"
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : fund.status === "in_progress"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                }`}>
                  {fund.status === "open" ? "Открыт" : 
                   fund.status === "closed" ? "Закрыт" :
                   fund.status === "in_progress" ? "В процессе" :
                   fund.status === "finished" ? "Завершён" : fund.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Призовой фонд</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                ${prizePool}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                7% комиссия платформы при выплате
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Взнос</span>
              </div>
              <div className="text-2xl font-bold text-white">${fund.entry_fee}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Макс. игроков</span>
              </div>
              <div className="text-2xl font-bold text-white">{fund.max_participants}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Матчей</span>
              </div>
              <div className="text-2xl font-bold text-white">{matches.length}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Начало</span>
              </div>
              <div className="text-sm font-bold text-white">
                {fund.first_match_starts_at ? format(new Date(fund.first_match_starts_at), "MMM d, HH:mm") : "—"}
              </div>
            </div>
          </div>
        </Card>

        {hasJoined ? (
          <>
            <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Ваши прогнозы
              </h2>
              
              {myPredictions.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((match) => {
                    const prediction = myPredictions.find(p => p.match_id === match.id);
                    const isFinished = match.status === 'finished';
                    const points = prediction?.points_earned || 0;
                    
                    return (
                      <div
                        key={match.id}
                        className={`p-6 rounded-xl border ${
                          isFinished 
                            ? points > 0
                              ? "bg-green-500/10 border-green-500/30"
                              : "bg-red-500/10 border-red-500/30"
                            : "bg-white/5 border-gray-700"
                        }`}
                      >
                        <div className="text-center mb-4">
                          <p className="text-lg font-bold text-white">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <p className="text-sm text-gray-400">
                            {new Date(match.match_date).toLocaleString("ru-RU", {
                              day: "numeric",
                              month: "long",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-white/5 rounded-lg">
                            <span className="text-gray-400 text-sm">Ваши прогнозы ({prediction?.credits_spent || 0} кр):</span>
                            <div className="mt-2 flex flex-wrap gap-2 justify-center">
                              {(prediction?.selected_options || []).map((opt, idx) => {
                                let displayText = opt;
                                if (opt.startsWith('exact_')) {
                                  displayText = opt.replace('exact_', 'Счёт: ');
                                } else if (opt === 'home_win') {
                                  displayText = 'Победа хозяев';
                                } else if (opt === 'away_win') {
                                  displayText = 'Победа гостей';
                                } else if (opt === 'draw') {
                                  displayText = 'Ничья';
                                } else if (opt === 'over_1_5') {
                                  displayText = 'Больше 1.5';
                                } else if (opt === 'over_2_5') {
                                  displayText = 'Больше 2.5';
                                } else if (opt === 'btts_yes') {
                                  displayText = 'Обе забьют';
                                }
                                
                                return (
                                  <Badge key={idx} className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                                    {displayText}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>

                          {isFinished && (
                            <div className="text-center p-4 bg-white/5 rounded-lg">
                              <span className="text-gray-400 text-sm">Итоговый результат:</span>
                              <div className="mt-2">
                                <Badge className={`${
                                  points > 0
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                } text-lg px-4 py-2`}>
                                  {match.home_goals ?? '?'} - {match.away_goals ?? '?'}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </div>

                        {isFinished && (
                          <div className={`mt-4 text-center py-2 rounded-lg ${
                            points > 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            <span className="font-bold text-xl">
                              {points > 0 ? `+${points} очков` : "0 очков"}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Загрузка ваших прогнозов...</p>
                </div>
              )}
            </Card>

            {fund.status === 'finished' && (
              <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Победители
                </h2>
                
                {participants.filter(p => p.status === 'winner').length > 0 ? (
                  <div className="space-y-3">
                    {participants
                      .filter(p => p.status === 'winner')
                      .sort((a, b) => (b.final_payout || 0) - (a.final_payout || 0))
                      .map((winner, index) => (
                        <div
                          key={winner.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white text-xl">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">
                                {winner.user_id === user?.id ? "Вы" : `Игрок ${winner.user_id.slice(0, 8)}`}
                                {winner.is_creator && (
                                  <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                    Создатель
                                  </Badge>
                                )}
                              </p>
                              <p className="text-sm text-gray-400">
                                {winner.total_points || 0} очков • {winner.credits_used || 0} кредитов использовано
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                              ${winner.final_payout || 0}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">Пока нет победителей или фонд возвращён</p>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Участники
              </h2>
              
              {participants.length > 0 ? (
                <div className="space-y-3">
                  {participants
                    // Sort participants for display in a leaderboard style
                    .sort((a, b) => {
                      // 1. Winners with actual payout first (higher payout first)
                      const aPayout = a.final_payout || 0;
                      const bPayout = b.final_payout || 0;
                      if (aPayout > 0 && bPayout === 0) return -1; // a is winner, b is not
                      if (aPayout === 0 && bPayout > 0) return 1;  // b is winner, a is not
                      if (aPayout > 0 && bPayout > 0) {
                        return bPayout - aPayout; // Both are winners, sort by payout descending
                      }

                      // 2. Then by total_points (descending)
                      const aPoints = a.total_points || 0;
                      const bPoints = b.total_points || 0;
                      if (bPoints !== aPoints) {
                        return bPoints - aPoints;
                      }

                      // 3. Then by credits_used (ascending - fewer credits is better for ties)
                      const aCredits = a.credits_used || 0;
                      const bCredits = b.credits_used || 0;
                      if (aCredits !== bCredits) {
                        return aCredits - bCredits;
                      }

                      // 4. Finally, by joined_at (ascending - earlier join breaks ties)
                      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                    })
                    .map((participant, index) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-gray-700"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">
                            {participant.user_id === user.id ? "Вы" : `Игрок ${participant.user_id.slice(0, 8)}`}
                            {participant.is_creator && (
                              <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                Создатель
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-gray-400">
                            Кредиты: {participant.credits_used || 0}/12
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {participant.total_points || 0} оч
                        </p>
                        {participant.final_payout > 0 && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs mt-1">
                            Выигрыш: ${participant.final_payout}
                          </Badge>
                        )}
                        {participant.status === 'refunded' && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs mt-1">
                            Возврат: ${participant.final_payout || participant.entry_paid}
                          </Badge>
                        )}
                        {participant.status === 'loser' && (
                          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs mt-1">
                            Без приза
                          </Badge>
                        )}
                        {/* Show "Calculating..." if fund is in_progress and no final payout determined yet, and not explicitly refunded/loser */}
                        {fund.status === 'in_progress' && !participant.final_payout && participant.status !== 'refunded' && participant.status !== 'loser' && (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs mt-1">
                            Расчёт...
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Пока нет участников</p>
                </div>
              )}
            </Card>
          </>
        ) : (
          <div>
            <div className="sticky top-0 z-10 bg-[#0C1523] pb-4 mb-6">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Target className="w-6 h-6 text-orange-400" />
                      Распределите Ваши {fund.credits_per_player || 12} Кредитов
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{totalCredits}/12</div>
                    <div className="text-sm text-gray-400">кредитов использовано</div>
                  </div>
                </div>

                {user && user.total_balance < fund.entry_fee && (
                  <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                    <AlertDescription className="text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Недостаточно средств</p>
                        <p className="text-sm">
                          Вам нужно ${fund.entry_fee} для участия, но у вас есть ${user.total_balance}.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert variant={totalCredits < 10 ? "destructive" : totalCredits > 12 ? "destructive" : "default"}
                  className={totalCredits < 10 ? "bg-red-500/10 border-red-500/30" : totalCredits > 12 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}>
                  <AlertDescription className={totalCredits < 10 || totalCredits > 12 ? "text-red-400" : "text-green-400"}>
                    {totalCredits < 10 ? (
                      <>
                        ⚠️ Вам нужно минимум 10 кредитов (минимум 1 за матч)
                        <br />
                        <span className="text-sm">Осталось {12 - totalCredits} неиспользованных = 0 очков</span>
                      </>
                    ) : totalCredits > 12 ? (
                      "❌ Разрешено максимум 12 кредитов"
                    ) : totalCredits < 12 ? (
                      <>
                        💡 У вас есть {12 - totalCredits} неиспользованных кредитов
                        <br />
                        <span className="text-sm">→ Стоимость 0.5 очка каждый = {(12 - totalCredits) * 0.5} очков всего</span>
                        <br />
                        <span className="text-sm text-green-300">Совет: Используйте все кредиты для большего потенциала!</span>
                      </>
                    ) : (
                      `✅ Кредиты: ${totalCredits}/12 • Все кредиты распределены!`
                    )}
                  </AlertDescription>
                </Alert>
              </Card>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold">Ошибка</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <TooltipProvider>
              <div className="space-y-4 mb-6">
                {matches.map((match) => {
                  const opts = predictions[match.id] || [];
                  const matchCredits = getMatchCredits(match.id);
                  const showExact = showExactScore[match.id];
                  
                  return (
                    <Card
                      key={match.id}
                      className={`p-6 border transition-all ${
                        matchCredits > 0 ? "bg-green-500/5 border-green-500/30" : "bg-white/5 border-gray-700"
                      }`}
                    >
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-lg font-bold text-white">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-gray-400 cursor-help flex items-center gap-1">
                                Матч: {matchCredits}/3 
                                <span className="text-gray-500">ⓘ</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Вы можете использовать 1-3 кредита за матч</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(match.match_date).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { value: 'home_win', label: 'Победа хозяев' },
                            { value: 'draw', label: 'Ничья' },
                            { value: 'away_win', label: 'Победа гостей' }
                          ].map((option) => {
                            const isSelected = opts.includes(option.value);
                            return (
                              <Button
                                key={option.value}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                className={`flex items-center gap-2 ${
                                  isSelected
                                    ? "bg-orange-500 hover:bg-orange-600 text-white font-bold border-orange-500"
                                    : "border-gray-600 text-gray-300 hover:bg-white/5"
                                }`}
                                onClick={() => handlePredictionChange(match.id, option.value, !isSelected)}
                              >
                                {isSelected && <span>✓</span>}
                                <span>{option.label} (1кр→3оч)</span>
                              </Button>
                            );
                          })}
                        </div>

                        {!showExact ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => toggleExactScore(match.id)}
                            className="w-full border-gray-600 text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"
                          >
                            <span className="text-lg">🎯</span>
                            <span>Добавить прогноз на точный счёт</span>
                          </Button>
                        ) : (
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span className="text-white font-semibold">Прогнозировать точный счёт (1кр→9оч)</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExactScore(match.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                ❌ Удалить
                              </Button>
                            </div>
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <span className="text-gray-300 text-sm">{match.home_team}</span>
                              <Input
                                type="number"
                                min="0"
                                max="9"
                                placeholder=""
                                value={exactScores[match.id]?.home ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'home', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${
                                  exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                                  exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== ""
                                    ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30"
                                    : "bg-white/10"
                                }`}
                              />
                              <span className="text-gray-500 font-bold text-xl">-</span>
                              <Input
                                type="number"
                                min="0"
                                max="9"
                                placeholder=""
                                value={exactScores[match.id]?.away ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'away', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${
                                  exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                                  exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== ""
                                    ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30"
                                    : "bg-white/10"
                                }`}
                              />
                              <span className="text-gray-300 text-sm">{match.away_team}</span>
                            </div>
                            {exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                             exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "" ? (
                              <div className="text-center p-2 rounded bg-green-500/20 border border-green-500/30">
                                <span className="text-green-400 font-semibold">
                                  ✅ Ваш прогноз: {exactScores[match.id].home}-{exactScores[match.id].away} (9 очков, если верно)
                                </span>
                              </div>
                            ) : (
                              (exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "") ||
                              (exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "") ? (
                                <div className="text-center p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                                  <span className="text-yellow-400 text-sm">
                                    ⚠️ Введите оба счёта, чтобы завершить прогноз
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TooltipProvider>

            <div className="sticky bottom-0 bg-[#0C1523] pt-4">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <Button
                  onClick={submitPredictions}
                  disabled={!allPredictionsValid() || isSubmitting || !user || user.total_balance < fund.entry_fee}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Отправка...
                    </span>
                  ) : user && user.total_balance < fund.entry_fee ? (
                    `Недостаточно средств`
                  ) : (
                    `Присоединиться к фонду и отправить прогнозы (${totalCredits}/12 кредитов)`
                  )}
                </Button>

                {!allPredictionsValid() && totalCredits > 0 && (
                  <p className="text-center text-sm text-gray-400 mt-3">
                    {totalCredits < 10 
                      ? `⚠️ Используйте минимум 10 кредитов. Сейчас: ${totalCredits}/12`
                      : totalCredits > 12
                      ? `❌ Максимум 12 кредитов. Сейчас: ${totalCredits}/12`
                      : "Используйте всего 10-12 кредитов (1-3 за матч)"}
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
