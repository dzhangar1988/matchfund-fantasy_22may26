import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Crown, Trophy, Medal, TrendingUp, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/LanguageContext";

const TABS = [
  { key: "month", label: "This Month" },
  { key: "week", label: "This Week" },
  { key: "alltime", label: "All Time" },
];

function getDateFilter(tab) {
  const now = new Date();
  if (tab === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (tab === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null; // all time = no filter
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const [allSorted, setAllSorted] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("month");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const [me, allUsers, allParticipations, allFunds, allPredictions] = await Promise.all([
      base44.auth.me().catch(() => null),
      base44.entities.User.list(),
      base44.entities.Participation.list(),
      base44.entities.MatchFund.list(),
      base44.entities.Prediction.list(),
    ]);

    setCurrentUser(me);

    const fundMap = {};
    for (const f of allFunds) fundMap[f.id] = f;

    // Build prediction accuracy map: participationId -> { correct, total }
    const predAccMap = {};
    for (const pred of allPredictions) {
      const pid = pred.participation_id;
      if (!predAccMap[pid]) predAccMap[pid] = { correct: 0, total: 0 };
      // Only count picks from finished matches (is_correct is set)
      if (pred.is_correct !== undefined && pred.is_correct !== null) {
        predAccMap[pid].total += (pred.selected_options?.length || 1);
        if (pred.is_correct) predAccMap[pid].correct += (pred.selected_options?.length || 1);
      }
    }

    const computeStats = (userParticipations, dateFilter) => {
      const filtered = dateFilter
        ? userParticipations.filter(p => {
            const fund = fundMap[p.fund_id];
            if (!fund || fund.status === 'cancelled') return false;
            return new Date(fund.created_date) >= dateFilter;
          })
        : userParticipations.filter(p => fundMap[p.fund_id]?.status !== 'cancelled');

      const finishedParticipations = filtered.filter(p => p.status === 'winner' || p.status === 'loser');
      const wins = filtered.filter(p => p.status === 'winner').length;
      const totalWinnings = filtered.filter(p => p.status === 'winner').reduce((sum, p) => sum + (p.final_payout || 0), 0);
      const totalPoints = filtered.reduce((sum, p) => sum + (p.total_points || 0), 0);

      // Prediction accuracy across filtered participations
      let correctPicks = 0, totalPicks = 0;
      for (const p of filtered) {
        const acc = predAccMap[p.id];
        if (acc) { correctPicks += acc.correct; totalPicks += acc.total; }
      }
      const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : null;

      const winRate = finishedParticipations.length > 0
        ? Math.round((wins / finishedParticipations.length) * 100)
        : 0;

      // Active (all time, not filtered by date)
      const activeParticipations = userParticipations.filter(
        p => (p.status === 'active' || p.status === 'pending') && fundMap[p.fund_id]?.status !== 'cancelled'
      ).length;

      return { totalPoints, totalWinnings, wins, finishedCount: finishedParticipations.length, winRate, accuracy, activeParticipations };
    };

    const usersWithStats = allUsers.map(user => {
      const userParticipations = allParticipations.filter(p => p.user_id === user.id);
      // Compute alltime stats for base data
      const stats = computeStats(userParticipations, null);
      return { ...user, _participations: userParticipations, ...stats };
    });

    const sorted = usersWithStats
      .filter(u => u.totalPoints > 0 || u.finishedCount > 0 || u.activeParticipations > 0)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalWinnings !== a.totalWinnings) return b.totalWinnings - a.totalWinnings;
        if ((b.respect_points || 0) !== (a.respect_points || 0)) return (b.respect_points || 0) - (a.respect_points || 0);
        return (b.total_balance || 0) - (a.total_balance || 0);
      });

    setAllSorted(sorted);
    setIsLoading(false);
  };

  // Recompute sorted list based on active tab
  const dateFilter = getDateFilter(activeTab);

  const tabSorted = useMemo(() => {
    if (!allSorted.length) return [];
    if (activeTab === "alltime") return allSorted;

    const fundMap = {};
    // We need fundMap here — but we stored _participations; re-derive from allSorted data
    // Instead, recompute points per user using stored _participations + fundMap
    // Since we don't have fundMap here, we store it in state
    return allSorted; // fallback, will be replaced by stateful approach below
  }, [allSorted, activeTab]);

  // Store fundMap and predAccMap in state for tab recomputation
  const [fundMap, setFundMap] = useState({});
  const [predAccMap, setPredAccMap] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.MatchFund.list(),
      base44.entities.Prediction.list(),
    ]).then(([funds, predictions]) => {
      const m = {};
      for (const f of funds) m[f.id] = f;
      setFundMap(m);

      const accMap = {};
      for (const pred of predictions) {
        const pid = pred.participation_id;
        if (!accMap[pid]) accMap[pid] = { correct: 0, total: 0 };
        if (pred.is_correct !== undefined && pred.is_correct !== null) {
          accMap[pid].total += (pred.selected_options?.length || 1);
          if (pred.is_correct) accMap[pid].correct += (pred.selected_options?.length || 1);
        }
      }
      setPredAccMap(accMap);
    });
  }, []);

  const displaySorted = useMemo(() => {
    if (!allSorted.length || !Object.keys(fundMap).length) return allSorted;
    if (activeTab === "alltime") return allSorted;

    const cutoff = getDateFilter(activeTab);

    return allSorted
      .map(u => {
        const userParticipations = u._participations || [];
        const filtered = userParticipations.filter(p => {
          const fund = fundMap[p.fund_id];
          if (!fund || fund.status === 'cancelled') return false;
          return new Date(fund.created_date) >= cutoff;
        });

        const finishedParticipations = filtered.filter(p => p.status === 'winner' || p.status === 'loser');
        const wins = filtered.filter(p => p.status === 'winner').length;
        const totalWinnings = filtered.filter(p => p.status === 'winner').reduce((sum, p) => sum + (p.final_payout || 0), 0);
        const totalPoints = filtered.reduce((sum, p) => sum + (p.total_points || 0), 0);
        const winRate = finishedParticipations.length > 0 ? Math.round((wins / finishedParticipations.length) * 100) : 0;

        // Accuracy scoped to filtered participations
        let correctPicks = 0, totalPicks = 0;
        for (const p of filtered) {
          const acc = predAccMap[p.id];
          if (acc) { correctPicks += acc.correct; totalPicks += acc.total; }
        }
        const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : null;

        // Active participations scoped to filtered period
        const activeParticipations = filtered.filter(
          p => p.status === 'active' || p.status === 'pending'
        ).length;

        return { ...u, totalPoints, totalWinnings, wins, finishedCount: finishedParticipations.length, winRate, accuracy, activeParticipations };
      })
      .filter(u => u.totalPoints > 0 || u.finishedCount > 0 || u.activeParticipations > 0)
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalWinnings !== a.totalWinnings) return b.totalWinnings - a.totalWinnings;
        if ((b.respect_points || 0) !== (a.respect_points || 0)) return (b.respect_points || 0) - (a.respect_points || 0);
        return (b.total_balance || 0) - (a.total_balance || 0);
      });
  }, [allSorted, activeTab, fundMap, predAccMap]);

  const top100 = displaySorted.slice(0, 100);
  const currentUserRank = currentUser ? displaySorted.findIndex(u => u.id === currentUser.id) : -1;
  const currentUserEntry = currentUserRank >= 0 ? displaySorted[currentUserRank] : null;
  const isOutsideTop100 = currentUserRank >= 100;

  const getPositionIcon = (index) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-300" />;
    if (index === 2) return <Medal className="w-6 h-6 text-orange-400" />;
    return null;
  };

  const getPositionColor = (index) => {
    if (index === 0) return "from-yellow-500 to-orange-500";
    if (index === 1) return "from-gray-400 to-gray-500";
    if (index === 2) return "from-orange-400 to-orange-500";
    return "from-gray-700 to-gray-800";
  };

  const renderRow = (user, rankIndex, highlight = false) => (
    <div
      key={user.id}
      className={`relative overflow-hidden rounded-xl p-6 border transition-all ${
        highlight
          ? "border-orange-500/60 bg-orange-500/10"
          : "border-gray-700 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${highlight ? "from-orange-400 to-orange-600" : getPositionColor(rankIndex)}`} />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white text-xl">
              {user.username?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            {rankIndex < 3 && user.totalWinnings > 0 && (
              <div className="absolute -top-1 -right-1">{getPositionIcon(rankIndex)}</div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-bold text-lg">#{rankIndex + 1}</span>
              <h3 className={`font-bold text-lg ${highlight ? "text-orange-300" : "text-white"} flex items-center gap-2 flex-wrap`}>
                {user.username || user.full_name || t("player_default")}
                {highlight && <span className="text-xs text-orange-400">(You)</span>}
                {(user.respect_points || 0) > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    💎 {user.respect_points} Respect
                  </span>
                )}
              </h3>
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap">
              {(user.finishedCount > 0 || user.activeParticipations > 0) ? (
                <>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>{user.wins || 0} {t("wins")}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Target className="w-4 h-4 text-blue-500" />
                    <span>{(user.finishedCount || 0) + (user.activeParticipations || 0)} {t("funds_count")}</span>
                  </div>
                  {user.winRate > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>{user.winRate}% {t("win_rate_pct")}</span>
                    </div>
                  )}
                  {user.accuracy !== null && user.accuracy !== undefined && (
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <span>🎯 {user.accuracy}% accuracy</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray-500">{t("no_participants_yet")}</div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {user.totalPoints || 0}
          </div>
          <div className="text-sm text-gray-400">pts earned</div>
          {user.totalWinnings > 0 && (
            <div className="text-xs text-green-400 mt-1">+{user.totalWinnings} won</div>
          )}
        </div>
      </div>
    </div>
  );

  // Neighbourhood: 3 above + user + 3 below (all-time only, outside top 100)
  const neighbourhoodRows = useMemo(() => {
    if (activeTab !== "alltime" || !isOutsideTop100 || currentUserRank < 0) return null;
    const start = Math.max(100, currentUserRank - 3);
    const end = Math.min(displaySorted.length - 1, currentUserRank + 3);
    return displaySorted.slice(start, end + 1).map((u, i) => ({
      user: u,
      rank: start + i,
      isMe: u.id === currentUser?.id,
    }));
  }, [activeTab, isOutsideTop100, currentUserRank, displaySorted, currentUser]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">{t("leaderboard_title")}</h1>
          <p className="text-gray-400">{t("leaderboard_subtitle")}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : top100.length > 0 ? (
            <div className="space-y-3">
              {top100.map((user, index) =>
                renderRow(user, index, user.id === currentUser?.id)
              )}

              {/* Current user outside top 100 — simple banner */}
              {isOutsideTop100 && currentUserEntry && (
                <div className="mt-4 p-4 rounded-xl border border-orange-500/40 bg-orange-500/10 text-center">
                  <span className="text-orange-300 font-semibold">
                    You are <span className="text-white">#{currentUserRank + 1}</span> with{" "}
                    <span className="text-white">{currentUserEntry.totalPoints || 0} pts</span> earned
                  </span>
                </div>
              )}

              {/* Neighbourhood view — all-time only */}
              {neighbourhoodRows && neighbourhoodRows.length > 0 && (
                <>
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-xs text-gray-500 uppercase tracking-widest">Your neighbourhood</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>
                  {neighbourhoodRows.map(({ user, rank, isMe }) =>
                    renderRow(user, rank, isMe)
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Crown className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400">{t("no_users_yet")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}