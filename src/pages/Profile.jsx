import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Target, TrendingUp, Award, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/LanguageContext";

export default function Profile() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [participations, setParticipations] = useState([]);
  const [funds, setFunds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const userParticipations = await base44.entities.Participation.filter({ user_id: currentUser.id }, "-created_date");
      const allFunds = await base44.entities.MatchFund.list();
      const userFundIds = userParticipations.map(p => p.fund_id);
      const userFunds = allFunds.filter(f => userFundIds.includes(f.id));
      setFunds(userFunds);

      const validParticipations = userParticipations.filter(p =>
        userFunds.some(f => f.id === p.fund_id)
      );
      setParticipations(validParticipations);
    } catch (error) {
      console.error("Error loading profile data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const activeFunds = participations.filter(p => {
    const fund = funds.find(f => f.id === p.fund_id);
    return fund && (fund.status === 'open' || fund.status === 'closed' || fund.status === 'in_progress');
  });

  const finishedFunds = participations.filter(p => {
    const fund = funds.find(f => f.id === p.fund_id);
    return fund && (fund.status === 'finished' || fund.status === 'cancelled');
  });

  const totalFinished = finishedFunds.length;
  const wins = participations.filter(p => p.status === 'winner').length;
  const winRate = totalFinished > 0 ? Math.round((wins / totalFinished) * 100) : null;

  const respectReceived = user?.show_respects_received ?? 0;
  const progressPct = Math.min(((respectReceived % 10) / 10) * 100, 100);


  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Refresh button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-white/5 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t("refresh")}
          </Button>
        </div>

        {/* HERO SECTION */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-lg shadow-orange-500/30">
            {(user?.username?.[0] || user?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-bold text-white">
              {user?.username || user?.full_name || user?.email?.split('@')[0] || "User"}
            </h1>
            {user?.is_premium && (
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-semibold border border-yellow-500/30">
                ⭐ Premium
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{user?.email}</p>
        </div>

        {/* RESPECT SECTION */}
        {!isLoading && user && (
          <Card className="mb-6 border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6">
            {(user.respect_points ?? 0) > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💎</span>
                <span className="text-3xl font-bold text-yellow-400">
                  {user.respect_points} Respect
                </span>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300 font-medium">
                ⭐ {respectReceived % 10} / 10 Show Respects towards next 💎
              </span>
              <span className="text-xs text-gray-500">{respectReceived % 10}/10</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {!user.is_premium && respectReceived > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Want to give Respect?{" "}
                <span className="text-orange-400 cursor-pointer hover:text-orange-300">
                  Ask about Premium →
                </span>
              </p>
            )}
          </Card>
        )}

        {/* STATS GRID */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 border-gray-800 bg-[#0F1E35]">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-24" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Balance */}
            <Card className="relative overflow-hidden border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 opacity-10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">{t("balance")}</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{user?.total_balance ?? 0} <span className="text-lg text-gray-400">pts</span></div>
              </div>
            </Card>

            {/* Total Funds */}
            <Card className="relative overflow-hidden border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">Funds Played</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{participations.length}</div>
              </div>
            </Card>

            {/* Wins */}
            <Card className="relative overflow-hidden border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500 to-emerald-500 opacity-10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">{t("total_wins")}</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{wins}</div>
              </div>
            </Card>

            {/* Win Rate */}
            <Card className="relative overflow-hidden border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 opacity-10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-400">{t("win_rate")}</span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">
                  {winRate !== null ? `${winRate}%` : "—"}
                </div>
              </div>
            </Card>
          </div>
        )}


        {/* MY FUNDS */}
        {!isLoading && (
          <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
            <h2 className="text-2xl font-bold text-white mb-6">{t("my_funds")}</h2>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-[#0F1E35] border border-gray-800 mb-6">
                <TabsTrigger
                  value="active"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
                >
                  {t("active_tab")} ({activeFunds.length})
                </TabsTrigger>
                <TabsTrigger
                  value="finished"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
                >
                  {t("finished_tab")} ({finishedFunds.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active">
                {activeFunds.length > 0 ? (
                  <div className="space-y-4">
                    {activeFunds.map((participation) => {
                      const fund = funds.find(f => f.id === participation.fund_id);
                      if (!fund) return null;
                      return (
                        <Link
                          key={participation.id}
                          to={createPageUrl(`FundDetails?id=${participation.fund_id}`)}
                        >
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-semibold">{fund.title}</p>
                                <p className="text-sm text-gray-400">
                                  {t("entry_paid")}: {participation.entry_paid} pts • {t("matches")}: {fund.total_matches || 0}
                                </p>
                              </div>
                              <div className="text-right">
                                <span className={`text-sm px-3 py-1 rounded-full ${
                                  fund.status === 'open' ? 'bg-green-500/20 text-green-400' :
                                  fund.status === 'closed' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {fund.status === 'open' ? t("status_open_label") :
                                   fund.status === 'closed' ? t("status_closed_label") : t("in_progress_label")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">{t("no_active_funds")}</p>
                    <Link to={createPageUrl("Home")}>
                      <button className="mt-4 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700">
                        {t("find_fund")}
                      </button>
                    </Link>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="finished">
                {finishedFunds.length > 0 ? (
                  <div className="space-y-4">
                    {finishedFunds.map((participation) => {
                      const fund = funds.find(f => f.id === participation.fund_id);
                      if (!fund) return null;
                      return (
                        <Link
                          key={participation.id}
                          to={createPageUrl(`FundDetails?id=${participation.fund_id}`)}
                        >
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700 hover:border-orange-500/50 transition-all cursor-pointer">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-semibold">{fund.title}</p>
                                <p className="text-sm text-gray-400">
                                  {t("entry_paid")}: {participation.entry_paid} pts • {t("winnings")}: {participation.final_payout || 0} pts
                                </p>
                              </div>
                              <div className="text-right">
                                {participation.status === "winner" ? (
                                  <div className="flex items-center gap-2 text-green-400">
                                    <Trophy className="w-5 h-5" />
                                    <span className="font-bold">{t("winner_label")}</span>
                                  </div>
                                ) : participation.status === "refunded" ? (
                                  <span className="text-yellow-400">{t("refunded_label")}</span>
                                ) : (
                                  <span className="text-gray-500">{t("finished_label")}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">{t("no_finished_funds")}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        )}
      </div>
    </div>
  );
}