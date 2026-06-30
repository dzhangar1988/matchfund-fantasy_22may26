import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Trophy, ArrowLeft, Target, AlertCircle, Loader2, Zap, Check } from "lucide-react";
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
import { useLanguage } from "@/lib/LanguageContext";
import { getAllowedPredictions, validatePredictions, getKnockoutOptions, isKnockoutMatch } from "@/lib/predictionUtils";

// ── Prize distribution options ─────────────────────────────────────────────
const PRIZE_OPTIONS = [
  {
    key: "winner_all",
    label: "Winner takes all",
    distribution: [100],
    colors: ["bg-yellow-500"],
  },
  {
    key: "top2",
    label: "Top 2 split",
    distribution: [60, 40],
    colors: ["bg-yellow-500", "bg-gray-400"],
  },
  {
    key: "top3",
    label: "Top 3 split",
    distribution: [50, 30, 20],
    colors: ["bg-yellow-500", "bg-gray-400", "bg-orange-400"],
  },
];

const PLACE_LABELS = ["🥇 1st", "🥈 2nd", "🥉 3rd"];

export default function CreateFund() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const preFillData = location.state;

  const [step, setStep] = useState(1);
  const [user, setUser] = useState(null);
  const [allMatches, setAllMatches] = useState([]); // all upcoming matches
  const [matches, setMatches] = useState([]);        // selected matches
  const [predictions, setPredictions] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matchFilter, setMatchFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('');
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
    credits_per_player: 20,
    prize_distribution: [100],
  });

  useEffect(() => {
    if (preFillData && preFillData.isQuickCreate) {
      loadUser().then(() => {
        setFundData(prev => ({ ...prev, ...preFillData.fundSetup }));
        setMatches(preFillData.selectedMatches);
        setAllMatches(preFillData.selectedMatches);
        setStep(2); // skip straight to predictions
        setIsLoading(false);
      }).catch(err => {
        setError("Ошибка загрузки: " + err.message);
        setIsLoading(false);
      });
    } else {
      loadData();
    }
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    if (currentUser.total_balance === undefined || currentUser.total_balance === null) {
      await base44.entities.User.update(currentUser.id, { total_balance: 500 });
      currentUser.total_balance = 500;
    }
    setUser(currentUser);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await loadUser();
      const now = new Date();
      const [allUpcoming, allLive] = await Promise.all([
        base44.entities.Match.filter({ status: "upcoming" }),
        base44.entities.Match.filter({ status: "live" }),
      ]);
      const upcomingMatches = [...allUpcoming, ...allLive].filter(m => {
        const matchTime = m.match_date.endsWith('Z') ? new Date(m.match_date) : new Date(m.match_date + 'Z');
        // Include upcoming (future) and live (started within last 3 hours)
        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        return matchTime > threeHoursAgo;
      });
      const uniqueMatches = [];
      const seen = new Set();
      for (const match of upcomingMatches) {
        const key = `${match.home_team}-${match.away_team}-${match.match_date}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMatches.push(match);
        }
      }
      setAllMatches(uniqueMatches);
    } catch (err) {
      setError("Failed to load data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Match selection ───────────────────────────────────────────────────────
  const toggleMatch = (match) => {
    setMatches(prev => {
      const isSelected = prev.some(m => m.id === match.id);
      if (isSelected) {
        // deselect — also clear predictions for this match
        setPredictions(p => { const n = { ...p }; delete n[match.id]; return n; });
        setExactScores(p => { const n = { ...p }; delete n[match.id]; return n; });
        setShowExactScore(p => { const n = { ...p }; delete n[match.id]; return n; });
        return prev.filter(m => m.id !== match.id);
      }
      if (prev.length >= 10) return prev; // max 10
      return [...prev, match];
    });
  };

  // ── Prediction helpers ────────────────────────────────────────────────────
  const getConflictingOptions = (matchId, selectedOptions) => {
    const conflicts = new Set();
    const exactScorePrediction = selectedOptions.find(o => o.startsWith('exact_'));
    if (exactScorePrediction) {
      const scoreMatch = exactScorePrediction.match(/exact_(\d+)-(\d+)/);
      if (scoreMatch) {
        const total = parseInt(scoreMatch[1]) + parseInt(scoreMatch[2]);
        if (total > 2) conflicts.add('under_2_5');
        if (total <= 2) conflicts.add('over_2_5');
        if (total > 1) conflicts.add('under_1_5');
        if (total <= 1) conflicts.add('over_1_5');
      }
    }
    selectedOptions.forEach(option => {
      if (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win') conflicts.add('btts_yes');
      if (option === 'btts_yes') { conflicts.add('home_clean_sheet_win'); conflicts.add('away_clean_sheet_win'); }
      if (option === 'home_clean_sheet_win') { conflicts.add('draw'); conflicts.add('away_win'); }
      if (option === 'away_clean_sheet_win') { conflicts.add('draw'); conflicts.add('home_win'); }
      if (option === 'home_win') conflicts.add('away_clean_sheet_win');
      if (option === 'away_win') conflicts.add('home_clean_sheet_win');
      if (option === 'et_home_win') conflicts.add('et_away_win');
      if (option === 'et_away_win') conflicts.add('et_home_win');
      if (option === 'pen_home_win') conflicts.add('pen_away_win');
      if (option === 'pen_away_win') conflicts.add('pen_home_win');
      if (option === 'draw') { conflicts.add('home_clean_sheet_win'); conflicts.add('away_clean_sheet_win'); conflicts.add('blowout_yes'); }
      if (option === 'under_2_5') conflicts.add('blowout_yes');
      if (option === 'blowout_yes') { conflicts.add('under_2_5'); conflicts.add('draw'); }
    });
    return conflicts;
  };

  const isOptionDisabled = (matchId, option) => {
    const current = predictions[matchId] || [];
    // Block if total predictions across all matches would exceed allowed
    const totalUsed = getTotalPredictions();
    const alreadySelected = current.includes(option);
    if (!alreadySelected && totalUsed >= allowedPredictions) return true;
    return getConflictingOptions(matchId, current).has(option);
  };

  const getDisabledReason = (option, matchId) => {
    const current = predictions[matchId] || [];
    const exactScorePrediction = current.find(o => o.startsWith('exact_'));
    if (exactScorePrediction) {
      const scoreMatch = exactScorePrediction.match(/exact_(\d+)-(\d+)/);
      if (scoreMatch) {
        const home = parseInt(scoreMatch[1]), away = parseInt(scoreMatch[2]);
        const total = home + away;
        if (option === 'under_2_5' && total > 2) return `Точный счёт ${home}:${away} (${total} голов) > 2`;
        if (option === 'over_2_5' && total <= 2) return `Точный счёт ${home}:${away} (${total} голов) ≤ 2`;
        if (option === 'under_1_5' && total > 1) return `Точный счёт ${home}:${away} (${total} голов) > 1`;
        if (option === 'over_1_5' && total <= 1) return `Точный счёт ${home}:${away} (${total} голов) ≤ 1`;
      }
    }
    if (current.includes('under_2_5') && option.startsWith('exact_')) return 'Несовместимо с "0-2 гола"';
    if (current.includes('over_2_5') && option.startsWith('exact_')) return 'Несовместимо с "3+ голов"';
    if (current.includes('under_1_5') && option.startsWith('exact_')) return 'Несовместимо с "0-1 гол"';
    if (current.includes('over_1_5') && option.startsWith('exact_')) return 'Несовместимо с "2+ голов"';
    if ((current.includes('home_clean_sheet_win') || current.includes('away_clean_sheet_win')) && option === 'btts_yes') return 'Несовместимо с "Победа всухую"';
    if (current.includes('btts_yes') && (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win')) return 'Несовместимо с "Обе забьют: Да"';
    if (current.includes('home_clean_sheet_win')) {
      if (option === 'draw') return 'Всухую означает победу, не ничью';
      if (option === 'away_win') return 'Обе команды не могут выиграть';
    }
    if (current.includes('away_clean_sheet_win')) {
      if (option === 'draw') return 'Всухую означает победу, не ничью';
      if (option === 'home_win') return 'Обе команды не могут выиграть';
    }
    if (current.includes('draw')) {
      if (option === 'home_clean_sheet_win' || option === 'away_clean_sheet_win') return 'Всухую означает победу, не ничью';
      if (option === 'blowout_yes') return 'При ничьей разница голов = 0';
    }
    if (current.includes('home_win') && option === 'away_clean_sheet_win') return 'Обе команды не могут выиграть';
    if (current.includes('away_win') && option === 'home_clean_sheet_win') return 'Обе команды не могут выиграть';
    if (current.includes('under_2_5') && option === 'blowout_yes') return 'При 0-2 голах невозможна разница 3+';
    if (current.includes('blowout_yes')) {
      if (option === 'under_2_5') return 'Разгром требует минимум 3 гола';
      if (option === 'draw') return 'При разгроме разница 3+, не ничья';
    }
    return '';
  };

  const handleSetPrediction = (matchId, option, checked) => {
    setPredictions(prev => {
      const current = prev[matchId] || [];
      if (checked) {
        if (option.startsWith('exact_')) {
          return { ...prev, [matchId]: [...new Set([...current.filter(o => !o.startsWith('exact_')), option])] };
        }
        // Dedupe-safe add: never allow the same option twice
        return { ...prev, [matchId]: [...new Set([...current, option])] };
      }
      return { ...prev, [matchId]: current.filter(o => o !== option) };
    });
  };

  const handleExactScore = (matchId, home, away) => {
    const h = home !== "" ? parseInt(home, 10) : "";
    const a = away !== "" ? parseInt(away, 10) : "";
    if (h === "" || isNaN(h) || a === "" || isNaN(a)) {
      setPredictions(prev => ({ ...prev, [matchId]: (prev[matchId] || []).filter(o => !o.startsWith('exact_')) }));
      return;
    }
    const total = h + a;
    const exactOption = `exact_${h}-${a}`;
    setPredictions(prev => {
      const current = prev[matchId] || [];
      let withoutExact = current.filter(o => !o.startsWith('exact_'));
      if (total > 2) withoutExact = withoutExact.filter(o => o !== 'under_2_5');
      if (total <= 2) withoutExact = withoutExact.filter(o => o !== 'over_2_5');
      if (total > 1) withoutExact = withoutExact.filter(o => o !== 'under_1_5');
      if (total <= 1) withoutExact = withoutExact.filter(o => o !== 'over_1_5');
      return { ...prev, [matchId]: [...withoutExact, exactOption] };
    });
  };

  const toggleExactScore = (matchId) => {
    setShowExactScore(prev => {
      const newState = { ...prev, [matchId]: !prev[matchId] };
      if (!newState[matchId]) {
        setPredictions(c => ({ ...c, [matchId]: (c[matchId] || []).filter(o => !o.startsWith('exact_')) }));
        setExactScores(c => { const n = { ...c }; delete n[matchId]; return n; });
      }
      return newState;
    });
  };

  const handleExactScoreInput = (matchId, field, value) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    setExactScores(prev => {
      const updatedMatchScores = { ...prev[matchId], [field]: cleanedValue };
      const updated = { ...prev, [matchId]: updatedMatchScores };
      const { home, away } = updatedMatchScores;
      if (home !== undefined && home !== "" && away !== undefined && away !== "") {
        handleExactScore(matchId, home, away);
      } else {
        handleExactScore(matchId, "", "");
      }
      return updated;
    });
  };

  const getTotalPredictions = () => {
    let total = 0;
    for (const matchId in predictions) {
      total += (predictions[matchId] || []).length;
    }
    return total;
  };

  const getMatchPredictionCount = (matchId) => (predictions[matchId] || []).length;

  const allowedPredictions = getAllowedPredictions(matches.length);
  const totalPredictions = getTotalPredictions();

  const allPredictionsValid = () => {
    if (matches.length < 1) return false;
    const matchIds = matches.map(m => m.id);
    const result = validatePredictions(predictions, matches.length, matchIds);
    return result.valid;
  };

  const userBalance = user?.total_balance ?? 0;
  const canCreate = allPredictionsValid() && !isCreating && user;

  const createFund = async () => {
    if (isCreating) return;
    setIsCreating(true);
    setError(null);
    try {
      if (!user) throw new Error("User not loaded");
      if (userBalance < fundData.entry_fee) {
        throw new Error(`Insufficient balance! You need ${fundData.entry_fee} points but have ${userBalance} points.`);
      }
      if (matches.length < 1) throw new Error("Select at least 1 match.");
      if (!fundData.prize_distribution || fundData.prize_distribution.length === 0) {
        throw new Error("Please select a prize distribution.");
      }
      if (!allPredictionsValid()) {
        throw new Error("Invalid predictions. Check max 2 per match and at least 1 per match.");
      }
      if (fundData.visibility === "private" && (!fundData.password || fundData.password.length < 4)) {
        throw new Error("Private funds require a password of at least 4 digits.");
      }

      const sortedMatches = [...matches].sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

      const newFund = await base44.entities.MatchFund.create({
        creator_id: user.id,
        title: fundData.title,
        description: fundData.description,
        entry_fee: fundData.entry_fee,
        max_participants: fundData.max_participants,
        min_participants: fundData.min_participants,
        credits_per_player: 20,
        scoring_mode: "standard",
        prize_distribution: fundData.prize_distribution,
        prize_split: fundData.prize_distribution.length === 1 ? "winner_takes_all" : fundData.prize_distribution.length === 2 ? "top2" : "top3",
        visibility: fundData.visibility,
        password: fundData.password || null,
        status: "open",
        total_pool: fundData.entry_fee,
        total_matches: matches.length,
        first_match_starts_at: sortedMatches[0]?.match_date,
        last_match_ends_at: sortedMatches[sortedMatches.length - 1]?.match_date,
        published_at: new Date().toISOString()
      });

      await Promise.all(matches.map((m, i) =>
        base44.entities.FundMatch.create({ fund_id: newFund.id, match_id: m.id, position: i + 1 })
      ));

      const participation = await base44.entities.Participation.create({
        fund_id: newFund.id,
        user_id: user.id,
        user_name: user.username || user.full_name || user.email,
        user_email: user.email,
        entry_paid: fundData.entry_fee,
        is_creator: true,
        status: "active",
        credits_used: totalPredictions,
        total_points: 0,
        joined_at: new Date().toISOString(),
        predictions_completed_at: new Date().toISOString()
      });

      await Promise.all(matches.map((match) => {
        const opts = predictions[match.id] || [];
        const exactScoreData = exactScores[match.id];
        return base44.entities.Prediction.create({
          participation_id: participation.id,
          match_id: match.id,
          selected_options: opts,
          predicted_home_goals: exactScoreData?.home !== undefined && exactScoreData?.home !== "" ? parseInt(exactScoreData.home) : null,
          predicted_away_goals: exactScoreData?.away !== undefined && exactScoreData?.away !== "" ? parseInt(exactScoreData.away) : null,
          credits_spent: opts.length
        });
      }));

      const newBalance = Math.max(0, userBalance - fundData.entry_fee);
      await base44.entities.User.update(user.id, { total_balance: newBalance });

      navigate(createPageUrl("Home"));
    } catch (err) {
      setError(err.message || "Failed to create fund");
    } finally {
      setIsCreating(false);
    }
  };

  // ── Loading / auth guards ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0C1523]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{t("loading")}</p>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
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
  const TOTAL_STEPS = 4;
  const stepLabels = ["Matches", "Predictions", "Settings", "Prize"];

  return (
    <div className="p-4 md:p-8 pb-28 md:pb-8 bg-[#0C1523] min-h-full">
      <div className="max-w-4xl mx-auto">

        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate(createPageUrl("Home")) : setStep(step - 1)}
          className="mb-6 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t("back")}
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-2">
            {isQuickCreate && <Zap className="w-8 h-8 text-orange-400" />}
            {isQuickCreate ? t("quick_create_title") : t("create_new_fund")}
          </h1>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
            <Trophy className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">{t("your_balance_label")}: {userBalance || 0} {t("points")}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold">{t("error_label")}</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Progress bar — 4 steps */}
        {!isQuickCreate && (
          <div className="mb-8">
            <div className="flex gap-2 mb-2">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    s <= step ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-gray-800"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {stepLabels.map((label, i) => (
                <div key={i} className={`flex-1 text-center text-xs ${i + 1 <= step ? "text-orange-400" : "text-gray-600"}`}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 1: Match Selection ───────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Select Matches</h2>
                  <p className="text-gray-400 text-sm mt-1">Tap to select/deselect. Min 1, max 10.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allSelected = allMatches.every(m => matches.some(s => s.id === m.id));
                      if (allSelected) {
                        setMatches([]);
                      } else {
                        setMatches(allMatches.slice(0, 10));
                      }
                    }}
                    className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 text-xs"
                  >
                    {allMatches.every(m => matches.some(s => s.id === m.id)) ? "Deselect all" : "Select all"}
                  </Button>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{matches.length} <span className="text-gray-500 text-lg">/ 10</span></div>
                    <div className="text-sm text-gray-400">matches selected</div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Filter bar */}
            {allMatches.length > 0 && (() => {
              const groups = [...new Set(allMatches.map(m => m.group).filter(Boolean))].sort();
              return (
                <div className="flex flex-col gap-3">
                  {groups.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setMatchFilter('all')}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${matchFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-gray-700'}`}
                      >
                        All
                      </button>
                      {groups.map(g => (
                        <button
                          key={g}
                          onClick={() => setMatchFilter(matchFilter === g ? 'all' : g)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${matchFilter === g ? 'bg-orange-500 text-white' : 'bg-white/5 text-gray-400 hover:text-white border border-gray-700'}`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    placeholder="Filter by country..."
                    value={countryFilter}
                    onChange={e => setCountryFilter(e.target.value)}
                    className="text-sm bg-white/5 border border-gray-700 rounded-lg px-3 py-1.5 text-white placeholder-gray-500 w-48 focus:outline-none focus:border-orange-500"
                  />
                </div>
              );
            })()}

            {allMatches.length === 0 ? (
              <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] text-center">
                <p className="text-gray-400">No upcoming matches available.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {allMatches
                  .filter(m => {
                    const groupMatch = matchFilter === 'all' || m.group === matchFilter;
                    const c = countryFilter.toLowerCase();
                    const countryMatch = !c || m.home_team.toLowerCase().includes(c) || m.away_team.toLowerCase().includes(c);
                    return groupMatch && countryMatch;
                  })
                  .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
                  .map((match) => {
                  const isSelected = matches.some(m => m.id === match.id);
                  const isDisabled = !isSelected && matches.length >= 10;
                  return (
                    <button
                      key={match.id}
                      onClick={() => !isDisabled && toggleMatch(match)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/10"
                          : isDisabled
                          ? "border-gray-800 bg-white/2 opacity-50 cursor-not-allowed"
                          : "border-gray-700 bg-white/5 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "border-orange-500 bg-orange-500" : "border-gray-600"
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              {match.group && (
                                <span className="text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                                  {match.group}
                                </span>
                              )}
                            </div>
                            <p className="text-white font-semibold">{match.home_team} vs {match.away_team}</p>
                            <p className="text-gray-400 text-sm">
                              {new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(match.match_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                              {match.competition && <span className="ml-2 text-gray-500">• {match.competition}</span>}
                            </p>
                          </div>
                        </div>
                        {isSelected && <span className="text-orange-400 text-xs font-semibold">Selected</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="sticky bottom-16 md:bottom-0 bg-[#0C1523] pt-4 pb-2">
              <Button
                onClick={() => setStep(2)}
                disabled={matches.length < 1}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
              >
                Next: Make Predictions ({matches.length} {matches.length === 1 ? "match" : "matches"}) →
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Predictions ───────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="sticky top-0 z-10 bg-[#0C1523] pb-4 mb-6">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Target className="w-6 h-6 text-orange-400" />
                      Make Predictions
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">
                      {fundData.title} • {matches.length} {matches.length === 1 ? "match" : "matches"}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">{totalPredictions}<span className="text-gray-500 text-lg"> / {allowedPredictions}</span></div>
                    <div className="text-sm text-gray-400">predictions used</div>
                  </div>
                </div>

                <Alert
                  className={
                    totalPredictions > allowedPredictions
                      ? "bg-red-500/10 border-red-500/30"
                      : totalPredictions === allowedPredictions
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-blue-500/10 border-blue-500/30"
                  }
                >
                  <AlertDescription
                    className={
                      totalPredictions > allowedPredictions ? "text-red-400" :
                      totalPredictions === allowedPredictions ? "text-green-400" : "text-blue-300"
                    }
                  >
                    {totalPredictions > allowedPredictions
                      ? `❌ Max ${allowedPredictions} predictions allowed`
                      : totalPredictions === allowedPredictions
                      ? `✅ All ${allowedPredictions} predictions used!`
                      : `💡 ${allowedPredictions - totalPredictions} predictions remaining (max ${allowedPredictions} for ${matches.length} matches)`
                    }
                  </AlertDescription>
                </Alert>
                </Card>
                </div>

                <InfoCard />

                <TooltipProvider>
              <div className="space-y-4 mb-6">
                {matches.map((match) => {
                  const opts = predictions[match.id] || [];
                  const matchPredCount = getMatchPredictionCount(match.id);
                  const showExact = showExactScore[match.id];

                  return (
                    <Card
                      key={match.id}
                      className={`p-6 border transition-all ${
                        matchPredCount > 0 ? "bg-green-500/5 border-green-500/30" : "bg-white/5 border-gray-700"
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
                                {t("used_of")} {matchPredCount} {t("of_two")}
                                <span className="text-gray-500">ⓘ</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("max_2_per_match")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} {new Date(match.match_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Match outcome */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">{t("match_outcome")}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'home_win', label: match.home_team },
                              { value: 'draw', label: t("draw") },
                              { value: 'away_win', label: match.away_team }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-orange-500 hover:bg-orange-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* BTTS */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">{t("btts")}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[{ value: 'btts_yes', label: t("yes") }, { value: 'btts_no', label: t("no") }].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-blue-500 hover:bg-blue-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Goals */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">{t("goals")}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[{ value: 'over_2_5', label: t("over_goals") }, { value: 'under_2_5', label: t("under_goals") }].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-purple-500 hover:bg-purple-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Goals 1.5 line — 1 pt */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">Total Goals 1.5 (1 pt)</p>
                          <div className="flex gap-2 flex-wrap">
                            {[{ value: 'over_1_5', label: 'Over 1.5' }, { value: 'under_1_5', label: 'Under 1.5' }].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-purple-500 hover:bg-purple-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Blowout */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">{t("blowout")}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[{ value: 'blowout_yes', label: t("blowout_yes") }, { value: 'blowout_no', label: t("no") }].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-orange-500 hover:bg-orange-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Clean sheet */}
                        <div>
                          <p className="text-xs text-gray-400 mb-2 font-semibold">{t("clean_sheet")}</p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'home_clean_sheet_win', label: `${match.home_team} ${t("clean_sheet_suffix")}` },
                              { value: 'away_clean_sheet_win', label: `${match.away_team} ${t("clean_sheet_suffix")}` }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                              const disabledReason = getDisabledReason(option.value, match.id);
                              return (
                                <Tooltip key={option.value}>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                      className={`flex items-center gap-1 ${isSelected ? "bg-green-500 hover:bg-green-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                      onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                      disabled={isDisabled}
                                    >
                                      {isSelected && <span>✓</span>}
                                      {isDisabled && !isSelected && <span>🔒</span>}
                                      <span>{option.label}</span>
                                    </Button>
                                  </TooltipTrigger>
                                  {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>

                        {/* Extra Time / Penalty — knockout only, 7 pts */}
                        {isKnockoutMatch(match) && (
                          <div>
                            <p className="text-xs text-gray-400 mb-2 font-semibold">Extra Time / Penalty Win (7 pts)</p>
                            <div className="flex gap-2 flex-wrap">
                              {getKnockoutOptions(match).map((option) => {
                                const isSelected = opts.includes(option.value);
                                const isDisabled = !isSelected && (opts.length >= 2 || isOptionDisabled(match.id, option.value));
                                const disabledReason = getDisabledReason(option.value, match.id);
                                return (
                                  <Tooltip key={option.value}>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button" variant={isSelected ? "default" : "outline"} size="sm"
                                        className={`flex items-center gap-1 ${isSelected ? "bg-red-500 hover:bg-red-600 text-white font-bold" : isDisabled ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                        onClick={() => handleSetPrediction(match.id, option.value, !isSelected)}
                                        disabled={isDisabled}
                                      >
                                        {isSelected && <span>✓</span>}
                                        {isDisabled && !isSelected && <span>🔒</span>}
                                        <span>{option.label}</span>
                                      </Button>
                                    </TooltipTrigger>
                                    {isDisabled && disabledReason && <TooltipContent><p>{disabledReason}</p></TooltipContent>}
                                  </Tooltip>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Exact Score */}
                        {!showExact ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button" variant="outline"
                                onClick={() => toggleExactScore(match.id)}
                                className={`w-full flex items-center justify-center gap-2 ${(opts.length >= 2 || (totalPredictions >= allowedPredictions && !opts.some(o => o.startsWith('exact_')))) ? "border-gray-700 text-gray-600 cursor-not-allowed opacity-50" : "border-gray-600 text-gray-300 hover:bg-white/5"}`}
                                disabled={opts.length >= 2 || (totalPredictions >= allowedPredictions && !opts.some(o => o.startsWith('exact_')))}
                              >
                                {opts.length >= 2 && <span>🔒</span>}
                                <span className="text-lg">🎯</span>
                                <span>{t("exact_score")}</span>
                              </Button>
                            </TooltipTrigger>
                            {opts.length >= 2 && <TooltipContent><p>{t("max_2_tooltip")}</p></TooltipContent>}
                          </Tooltip>
                        ) : (
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span className="text-white font-semibold">{t("exact_score")}</span>
                              </div>
                              <Button type="button" variant="ghost" size="sm" onClick={() => toggleExactScore(match.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                {t("exact_score_remove")}
                              </Button>
                            </div>
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <span className="text-gray-300 text-sm">{match.home_team}</span>
                              <Input
                                type="number" min="0" max="9" placeholder=""
                                value={exactScores[match.id]?.home ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'home', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" && exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "" ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30" : "bg-white/10"}`}
                              />
                              <span className="text-gray-500 font-bold text-xl">-</span>
                              <Input
                                type="number" min="0" max="9" placeholder=""
                                value={exactScores[match.id]?.away ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'away', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" && exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "" ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30" : "bg-white/10"}`}
                              />
                              <span className="text-gray-300 text-sm">{match.away_team}</span>
                            </div>
                            {exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                             exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "" ? (
                              <div className="text-center p-2 rounded bg-green-500/20 border border-green-500/30">
                                <span className="text-green-400 font-semibold">
                                  {t("exact_score_confirmed")}: {exactScores[match.id].home}-{exactScores[match.id].away} (9 {t("if_correct")})
                                </span>
                              </div>
                            ) : (
                              ((exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "") ||
                               (exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "")) ? (
                                <div className="text-center p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                                  <span className="text-yellow-400 text-sm">{t("exact_score_both")}</span>
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

            <div className="sticky bottom-16 md:bottom-0 bg-[#0C1523] pt-4 pb-2">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <div className="flex flex-col md:flex-row gap-4">
                  {!isQuickCreate && (
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="flex-1 border-gray-700 text-gray-300 hover:bg-white/5"
                    >
                      {t("back")}
                    </Button>
                  )}
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!allPredictionsValid()}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg disabled:opacity-50"
                  >
                    Next: Fund Settings →
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── STEP 3: Fund Settings ──────────────────────────────────────── */}
        {step === 3 && (
          <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
            <h2 className="text-2xl font-bold text-white mb-6">{t("fund_settings")}</h2>
            <div className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-2">{t("fund_name")}</Label>
                <Input
                  value={fundData.title}
                  onChange={(e) => setFundData({ ...fundData, title: e.target.value })}
                  placeholder="Arsenal Fans GW23"
                  className="bg-white/5 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <Label className="text-gray-300 mb-2">{t("description_optional")}</Label>
                <Textarea
                  value={fundData.description}
                  onChange={(e) => setFundData({ ...fundData, description: e.target.value })}
                  placeholder={t("description_placeholder")}
                  className="bg-white/5 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2">{t("entry_fee_label")}</Label>
                  <Input
                    type="number"
                    min="10"
                    step="1"
                    value={fundData.entry_fee}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      setFundData({ ...fundData, entry_fee: Math.max(10, val) });
                    }}
                    className="bg-white/5 border-gray-700 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t("points")} (min 10)</p>
                </div>
                <div>
                  <Label className="text-gray-300 mb-2">{t("max_players")}</Label>
                  <Input
                    type="number"
                    min="2"
                    max="10"
                    value={fundData.max_participants}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setFundData({ ...fundData, max_participants: Math.min(10, Math.max(2, val)) });
                    }}
                    className="bg-white/5 border-gray-700 text-white"
                  />
                </div>
              </div>

              {/* Private fund */}
              <div className="space-y-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300 text-base">{t("private_fund")}</Label>
                    <p className="text-xs text-gray-500 mt-1">{t("private_fund_hint")}</p>
                  </div>
                  <Switch
                    checked={fundData.visibility === "private"}
                    onCheckedChange={(checked) =>
                      setFundData({ ...fundData, visibility: checked ? "private" : "public", password: checked ? fundData.password : "" })
                    }
                  />
                </div>
                {fundData.visibility === "private" && (
                  <div className="pt-2">
                    <Label className="text-gray-300 mb-2">{t("password_label")}</Label>
                    <Input
                      type="text"
                      maxLength={6}
                      placeholder="1234"
                      value={fundData.password}
                      onChange={(e) => setFundData({ ...fundData, password: e.target.value.replace(/\D/g, '') })}
                      className="bg-white/5 border-gray-700 text-white text-center text-2xl font-bold tracking-widest"
                    />
                    {fundData.password && fundData.password.length < 4 && (
                      <p className="text-xs text-red-400 mt-1">{t("password_error")}</p>
                    )}
                    <p className="text-xs text-purple-300 mt-2">{t("password_hint")}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-white/5"
                >
                  {t("back")}
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={
                    !fundData.title ||
                    fundData.max_participants < 2 ||
                    fundData.entry_fee < 10 ||
                    (fundData.visibility === "private" && (!fundData.password || fundData.password.length < 4))
                  }
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6"
                >
                  Next: Prize Distribution →
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* ── STEP 4: Prize Distribution ────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <h2 className="text-2xl font-bold text-white mb-2">Prize Distribution</h2>
              <p className="text-gray-400 mb-6">How should the prize pool be split among winners?</p>

              <div className="space-y-4">
                {PRIZE_OPTIONS.map((opt) => {
                  const isSelected = JSON.stringify(fundData.prize_distribution) === JSON.stringify(opt.distribution);
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setFundData({ ...fundData, prize_distribution: opt.distribution })}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/10"
                          : "border-gray-700 bg-white/5 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-white font-semibold text-lg">{opt.label}</span>
                        {isSelected && <Check className="w-5 h-5 text-orange-400" />}
                      </div>
                      <div className="flex rounded-full overflow-hidden h-4 mb-3 gap-0.5">
                        {opt.distribution.map((pct, idx) => (
                          <div key={idx} className={`${opt.colors[idx]} h-full transition-all`} style={{ width: `${pct}%` }} />
                        ))}
                      </div>
                      <div className="flex gap-4">
                        {opt.distribution.map((pct, idx) => (
                          <span key={idx} className="text-sm text-gray-300">
                            {PLACE_LABELS[idx]}: <span className="font-bold text-white">{pct}%</span>
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
                className="flex-1 border-gray-700 text-gray-300 hover:bg-white/5"
                disabled={isCreating}
              >
                {t("back")}
              </Button>
              <Button
                onClick={createFund}
                disabled={!canCreate || isCreating}
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg"
              >
                {isCreating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> {t("creating")}
                  </span>
                ) : (
                  t("create_fund_btn")
                )}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}