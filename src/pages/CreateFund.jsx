import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Calendar, ArrowLeft, Target, AlertCircle, Loader2, Zap } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import InfoCard from "../components/InfoCard";
import { Switch } from "@/components/ui/switch";

export default function CreateFund() {
  const navigate = useNavigate();
  const location = useLocation();
  const preFillData = location.state;
  
  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExactScore, setShowExactScore] = useState({});
  const [exactScores, setExactScores] = useState({});
  const [fundData, setFundData] = useState({
    title: "",
    description: "",
    entry_fee: 100,
    max_participants: 10,
    min_participants: 2,
    visibility: "public",
    password: "",
    credits_per_player: 20
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Handle pre-fill from Quick Create
    if (preFillData && preFillData.isQuickCreate) {
      setFundData(preFillData.fundSetup);
      setSelectedMatches(preFillData.selectedMatches);
      setStep(preFillData.step || 3);
    }
  }, [preFillData]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.total_balance === undefined || currentUser.total_balance === null) {
        await base44.entities.User.update(currentUser.id, { total_balance: 500 });
        currentUser.total_balance = 500;
      }
      setUser(currentUser);

      const upcomingMatches = await base44.entities.Match.filter({ status: "upcoming" }, "match_date", 50);
      const uniqueMatches = [];
      const seen = new Set();
      for (const match of upcomingMatches) {
        const key = `${match.home_team}-${match.away_team}-${match.match_date}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMatches.push(match);
        }
      }
      setMatches(uniqueMatches);
    } catch (error) {
      setError("Failed to load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMatch = (match) => {
    const matchId = match.id;
    setSelectedMatches(prev => {
      if (prev.find(m => m.id === matchId)) {
        setPredictions(current => {
          const updated = { ...current };
          delete updated[matchId];
          return updated;
        });
        setShowExactScore(current => {
          const updated = { ...current };
          delete updated[matchId];
          return updated;
        });
        setExactScores(current => {
          const updated = { ...current };
          delete updated[matchId];
          return updated;
        });
        return prev.filter(m => m.id !== matchId);
      } else {
        return [...prev, match];
      }
    });
  };

  const handleSetPrediction = (matchId, option, checked) => {
    setPredictions(prev => {
      const current = prev[matchId] || [];
      if (checked) {
        // Ensure only one exact score can be selected at a time, if applicable
        if (option.startsWith('exact_')) {
          const withoutExact = current.filter(o => !o.startsWith('exact_'));
          return { ...prev, [matchId]: [...withoutExact, option] };
        }
        return { ...prev, [matchId]: [...current, option] };
      } else {
        return { ...prev, [matchId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleExactScore = (matchId, home, away) => {
    // Convert to numbers if they are valid, otherwise keep as ""
    const homeScore = home !== "" ? parseInt(home, 10) : "";
    const awayScore = away !== "" ? parseInt(away, 10) : "";

    if (homeScore === "" || isNaN(homeScore) || awayScore === "" || isNaN(awayScore)) {
      // If fields are empty or not valid numbers, remove exact score prediction
      setPredictions(prev => {
        const current = prev[matchId] || [];
        const withoutExact = current.filter(o => !o.startsWith('exact_'));
        return { ...prev, [matchId]: withoutExact };
      });
      return;
    }

    const exactOption = `exact_${homeScore}-${awayScore}`;
    setPredictions(prev => {
      const current = prev[matchId] || [];
      const withoutExact = current.filter(o => !o.startsWith('exact_'));
      return { ...prev, [matchId]: [...withoutExact, exactOption] };
    });
  };

  const toggleExactScore = (matchId) => {
    setShowExactScore(prev => {
      const newState = { ...prev, [matchId]: !prev[matchId] };

      // If hiding, remove exact score from predictions and clear inputs
      if (!newState[matchId]) {
        setPredictions(current => {
          const opts = current[matchId] || [];
          const withoutExact = opts.filter(o => !o.startsWith('exact_'));
          return { ...current, [matchId]: withoutExact };
        });
        setExactScores(current => {
          const newScores = { ...current };
          delete newScores[matchId];
          return newScores;
        });
      }

      return newState;
    });
  };

  const handleExactScoreInput = (matchId, field, value) => {
    // Only allow digits for score input
    const cleanedValue = value.replace(/[^0-9]/g, '');

    setExactScores(prev => {
      const updatedMatchScores = { ...prev[matchId], [field]: cleanedValue };
      const updated = { ...prev, [matchId]: updatedMatchScores };

      const home = updatedMatchScores.home;
      const away = updatedMatchScores.away;

      // Update predictions if both fields have valid values
      if (home !== undefined && home !== "" && away !== undefined && away !== "") {
        handleExactScore(matchId, home, away);
      } else {
        // If one field becomes empty, remove the exact score prediction
        handleExactScore(matchId, "", "");
      }

      return updated;
    });
  };

  const getTotalCredits = () => {
    let total = 0;
    for (const matchId in predictions) {
      const opts = predictions[matchId] || [];
      total += opts.length; // All predictions = 1 credit
    }
    return total;
  };

  const getMatchCredits = (matchId) => {
    const opts = predictions[matchId] || [];
    return opts.length; // All predictions = 1 credit
  };

  const allPredictionsValid = () => {
    if (selectedMatches.length < 10) return false;
    const totalCredits = getTotalCredits();
    if (totalCredits < 10 || totalCredits > 20) return false;

    for (const match of selectedMatches) {
      const opts = predictions[match.id] || [];
      if (opts.length === 0 || opts.length > 2) return false;
    }
    return true;
  };

  const userBalance = user?.total_balance ?? 0;
  const canCreate = allPredictionsValid() && !isCreating && user && userBalance >= fundData.entry_fee;
  const totalCredits = getTotalCredits();

  const createFund = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);

    try {
      if (!user) throw new Error("User not loaded");
      if (userBalance < fundData.entry_fee) {
        throw new Error(`Insufficient balance! You need ${fundData.entry_fee} points but have ${userBalance} points.`);
      }
      if (selectedMatches.length < 10) {
        throw new Error("Please select at least 10 matches");
      }
      if (!allPredictionsValid()) {
        throw new Error("Invalid predictions. Use 10-20 credits total, max 2 options per match.");
      }
      if (fundData.visibility === "private" && (!fundData.password || fundData.password.length < 4)) {
        throw new Error("Private funds require a password of at least 4 digits.");
      }

      const sortedMatches = [...selectedMatches].sort((a, b) =>
        new Date(a.match_date) - new Date(b.match_date)
      );

      const newFund = await base44.entities.MatchFund.create({
        creator_id: user.id,
        title: fundData.title,
        description: fundData.description,
        entry_fee: 100,
        max_participants: fundData.max_participants,
        min_participants: fundData.min_participants,
        credits_per_player: 20,
        visibility: fundData.visibility,
        password: fundData.password || null,
        status: "open",
        total_pool: 100, // Initial pool from creator
        total_matches: selectedMatches.length,
        first_match_starts_at: sortedMatches[0]?.match_date,
        last_match_ends_at: sortedMatches[sortedMatches.length - 1]?.match_date,
        published_at: new Date().toISOString()
      });

      for (let i = 0; i < selectedMatches.length; i++) {
        await base44.entities.FundMatch.create({
          fund_id: newFund.id,
          match_id: selectedMatches[i].id,
          position: i + 1
        });
      }

      const totalCreditsUsed = getTotalCredits();
      const participation = await base44.entities.Participation.create({
        fund_id: newFund.id,
        user_id: user.id,
        entry_paid: fundData.entry_fee,
        is_creator: true,
        status: "active",
        credits_used: totalCreditsUsed,
        total_points: 0,
        joined_at: new Date().toISOString(),
        predictions_completed_at: new Date().toISOString()
      });

      for (const match of selectedMatches) {
        const opts = predictions[match.id] || [];
        const exactScoreData = exactScores[match.id];

        // All predictions = 1 credit each
        const creditsSpent = opts.length;

        await base44.entities.Prediction.create({
          participation_id: participation.id,
          match_id: match.id,
          selected_options: opts,
          predicted_home_goals: exactScoreData?.home !== undefined && exactScoreData?.home !== "" ? parseInt(exactScoreData.home) : null,
          predicted_away_goals: exactScoreData?.away !== undefined && exactScoreData?.away !== "" ? parseInt(exactScoreData.away) : null,
          credits_spent: creditsSpent
        });
      }

      const newBalance = Math.max(0, userBalance - fundData.entry_fee);
      await base44.entities.User.update(user.id, { total_balance: newBalance });

      // NOTE: total_pool already includes creator's entry (100)
      // No need to update again, it's already set to 100

      navigate(createPageUrl("Home"));
    } catch (error) {
      setError(error.message || "Failed to create fund");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C1523]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C1523]">
        <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Load User</h2>
          <p className="text-gray-400 mb-4">Please refresh the page or log in again.</p>
          <Button onClick={() => window.location.reload()} className="bg-gradient-to-r from-orange-500 to-orange-600">
            Refresh Page
          </Button>
        </Card>
      </div>
    );
  }

  const isQuickCreate = preFillData?.isQuickCreate;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#0C1523]">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate(createPageUrl("Home")) : setStep(step - 1)}
          className="mb-6 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            {isQuickCreate && <Zap className="w-8 h-8 text-orange-400" />}
            {isQuickCreate ? "Быстрое создание фонда" : "Создать новый фонд"}
          </h1>
          <p className="text-gray-400">
            {isQuickCreate 
              ? "Матчи выбраны автоматически • Сделайте прогнозы" 
              : "Credit-based prediction pool • 12 credits for 10 matches"}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <Trophy className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">Ваш баланс: {userBalance || 0} баллов</span>
          </div>
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

        {!isQuickCreate && (
          <div className="flex gap-4 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                  s <= step ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-gray-800"
                }`}
              />
            ))}
          </div>
        )}

        {step === 1 && (
          <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
            <h2 className="text-2xl font-bold text-white mb-6">Настройки фонда</h2>

            <div className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-2">Название фонда</Label>
                <Input
                  value={fundData.title}
                  onChange={(e) => setFundData({ ...fundData, title: e.target.value })}
                  placeholder="Arsenal Fans GW23"
                  className="bg-white/5 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2">Описание (необязательно)</Label>
                <Textarea
                  value={fundData.description}
                  onChange={(e) => setFundData({ ...fundData, description: e.target.value })}
                  placeholder="Опишите ваш фонд..."
                  className="bg-white/5 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2">Взнос</Label>
                  <div className="p-3 rounded-lg bg-white/5 border border-gray-700 text-white font-bold text-lg">
                    100 баллов
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Фиксированный взнос</p>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2">Макс. игроков</Label>
                  <Input
                    type="number"
                    min="2"
                    max="20"
                    value={fundData.max_participants}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setFundData({ ...fundData, max_participants: Math.min(20, Math.max(2, val)) });
                    }}
                    className="bg-white/5 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* 🔒 PRIVATE FUND SECTION */}
              <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300 text-base">Приватный фонд</Label>
                    <p className="text-xs text-gray-500 mt-1">Доступен только по ссылке и паролю</p>
                  </div>
                  <Switch 
                    checked={fundData.visibility === "private"}
                    onCheckedChange={(checked) => 
                      setFundData({
                        ...fundData, 
                        visibility: checked ? "private" : "public",
                        password: checked ? fundData.password : "" // Clear password if switching to public
                      })
                    }
                  />
                </div>
                
                {fundData.visibility === "private" && (
                  <div className="pt-2">
                    <Label className="text-gray-300 mb-2">Пароль (4-6 цифр)</Label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="1234"
                      value={fundData.password}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, ''); // Allow only digits
                        setFundData({...fundData, password: digits});
                      }}
                      className="bg-white/5 border-gray-700 text-white text-center text-2xl font-bold tracking-widest"
                    />
                    {fundData.password && fundData.password.length < 4 && (
                      <p className="text-xs text-red-400 mt-1">Пароль должен содержать не менее 4 цифр.</p>
                    )}
                    <p className="text-xs text-purple-300 mt-2 flex items-center gap-1">
                      💡 Поделитесь ссылкой и паролем с друзьями после создания
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <strong>📊 Система кредитов:</strong> Вы получите 10-20 кредитов на 10 матчей. Максимум 2 прогноза на матч!
                </p>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={
                  !fundData.title || 
                  fundData.max_participants < 2 ||
                  (fundData.visibility === "private" && (!fundData.password || fundData.password.length < 4))
                }
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6"
              >
                Далее: Выбрать матчи
              </Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-orange-400" />
              Выберите 10 матчей
            </h2>

            <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>Выбрано: {selectedMatches.length}/10</strong>
              </p>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Нет доступных матчей</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {matches.map((match) => {
                  const isSelected = selectedMatches.find(m => m.id === match.id);
                  return (
                    <div
                      key={match.id}
                      onClick={() => toggleMatch(match)}
                      className={`p-4 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30"
                          : "border-gray-700 bg-white/5 hover:border-orange-500/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-orange-500 bg-orange-500" : "border-gray-600"
                        }`}>
                          {isSelected && <span className="text-white text-sm font-bold">✓</span>}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-semibold">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <p className="text-sm text-gray-400">
                            GW{match.matchweek} • {new Date(match.match_date).toLocaleString("ru-RU", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-white/5"
              >
                Назад
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedMatches.length !== 10}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6"
              >
                Далее: Распределить кредиты ({selectedMatches.length}/10)
              </Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <div>
            <div className="sticky top-0 z-10 bg-[#0C1523] pb-4 mb-6">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Target className="w-6 h-6 text-orange-400" />
                      Распределите 10-20 кредитов
                    </h2>
                    {isQuickCreate && (
                      <p className="text-sm text-gray-400 mt-1">
                        {fundData.title} • {selectedMatches.length} матчей
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{totalCredits}/20</div>
                    <div className="text-sm text-gray-400">кредитов</div>
                  </div>
                </div>

                <Alert variant={totalCredits < 10 ? "destructive" : totalCredits > 20 ? "destructive" : "default"}
                  className={totalCredits < 10 ? "bg-red-500/10 border-red-500/30" : totalCredits > 20 ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"}>
                  <AlertDescription className={totalCredits < 10 || totalCredits > 20 ? "text-red-400" : "text-green-400"}>
                    {totalCredits < 10 ? (
                      "⚠️ Минимум 10 кредитов (минимум 1 прогноз на матч)"
                    ) : totalCredits > 20 ? (
                      "❌ Максимум 20 кредитов"
                    ) : totalCredits < 20 ? (
                      <>
                        💡 У вас {20 - totalCredits} неиспользованных кредитов
                        <br />
                        <span className="text-sm">→ Стоят по 0.5 очка = {(20 - totalCredits) * 0.5} бонусных очков</span>
                      </>
                    ) : (
                      `✅ Кредиты: ${totalCredits}/20 • Все кредиты распределены!`
                    )}
                  </AlertDescription>
                </Alert>
              </Card>

              {/* InfoCard */}
              <InfoCard />
            </div>

            <TooltipProvider>
              <div className="space-y-4 mb-6">
                {selectedMatches.map((match) => {
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
                                {matchCredits} кр
                                <span className="text-gray-500">ⓘ</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Макс 2 прогноза на матч</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(match.match_date).toLocaleString("ru-RU", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Bold Predictions (3 pts, 1 cr) */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Исход матча (3 очка, 1 кредит):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'home_win', label: match.home_team },
                              { value: 'draw', label: 'Ничья' },
                              { value: 'away_win', label: match.away_team }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-orange-500 hover:bg-orange-600 text-white font-bold"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                  disabled={!isSelected && opts.length >= 2}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* BTTS (2 pts, 1 cr) */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Обе забьют (2 очка, 1 кредит):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'btts_yes', label: 'Да' },
                              { value: 'btts_no', label: 'Нет' }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white font-bold"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                  disabled={!isSelected && opts.length >= 2}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Over/Under 2.5 (2.5 pts, 1 cr) */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Количество голов (2.5 очка, 1 кредит):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'over_2_5', label: '3+ голов' },
                              { value: 'under_2_5', label: '0-2 гола' }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-purple-500 hover:bg-purple-600 text-white font-bold"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                  disabled={!isSelected && opts.length >= 2}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Blowout (2.5 pts, 1 cr) */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Будет ли разгром? (2.5 очка, 1 кредит):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'blowout_yes', label: 'Да (разница 3+)' },
                              { value: 'blowout_no', label: 'Нет' }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-cyan-500 hover:bg-cyan-600 text-white font-bold"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                  disabled={!isSelected && opts.length >= 2}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Win to Nil (4 pts, 1 cr) */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Победа всухую (4 очка, 1 кредит):</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'home_clean_sheet_win', label: `${match.home_team} всухую` },
                              { value: 'away_clean_sheet_win', label: `${match.away_team} всухую` }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-green-500 hover:bg-green-600 text-white font-bold"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                  disabled={!isSelected && opts.length >= 2}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Exact Score Section (6 pts, 1 cr) */}
                        {!showExact ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => toggleExactScore(match.id)}
                            className="w-full border-gray-600 text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"
                            disabled={opts.length >= 2}
                          >
                            <span className="text-lg">🎯</span>
                            <span>Точный счёт (6 очков, 1 кредит)</span>
                          </Button>
                        ) : (
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span className="text-white font-semibold">Точный счёт (6 очков, 1 кредит)</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExactScore(match.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                ❌ Убрать
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
                                  ✅ Ваш прогноз: {exactScores[match.id].home}-{exactScores[match.id].away} (9 очков если верно)
                                </span>
                              </div>
                            ) : (
                              (exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "") ||
                              (exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "") ? (
                                <div className="text-center p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                                  <span className="text-yellow-400 text-sm">
                                    ⚠️ Введите оба счета
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
                <div className="flex flex-col md:flex-row gap-4">
                  {!isQuickCreate && (
                    <Button
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="flex-1 border-gray-700 text-gray-300 hover:bg-white/5"
                      disabled={isCreating}
                    >
                      Назад
                    </Button>
                  )}
                  <Button
                    onClick={createFund}
                    disabled={!canCreate}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg"
                  >
                    {isCreating ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Создание...
                      </span>
                    ) : (
                      `Создать фонд и отправить прогнозы`
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}