import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Target, TrendingUp, Award, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TransactionHistory from "../components/TransactionHistory";
import ReferralCard from "../components/ReferralCard";
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
      let currentUser = await base44.auth.me();
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

  const stats = [
    {
      label: t("balance"),
      value: user?.total_balance ?? 0,
      icon: Trophy,
      color: "from-yellow-500 to-orange-500"
    },
    {
      label: t("total_predictions"),
      value: user?.total_predictions || 0,
      icon: Target,
      color: "from-blue-500 to-cyan-500"
    },
    {
      label: t("total_wins"),
      value: user?.total_wins || 0,
      icon: Award,
      color: "from-green-500 to-emerald-500"
    },
    {
      label: t("win_rate"),
      value: user?.total_participations ? Math.round(((user.total_wins || 0) / user.total_participations) * 100) : 0,
      suffix: "%",
      icon: TrendingUp,
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{t("my_profile")}</h1>
            <p className="text-gray-400">{t("stats_subtitle")}</p>
          </div>
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

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 border-gray-800 bg-[#0F1E35]">
                <Skeleton className="h-6 w-24 mb-4" />
                <Skeleton className="h-10 w-32" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6"
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-3xl`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-400">{stat.label}</span>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {stat.value}{stat.suffix || ""}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {user && (
              <div className="mb-8">
                <TransactionHistory userId={user.id} limit={5} />
              </div>
            )}

            {user && (
              <div className="mb-8">
                <ReferralCard user={user} onUserUpdate={() => loadData(true)} />
              </div>
            )}

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
                                    {t("entry_paid")}: {participation.entry_paid} • {t("matches")}: {fund.total_matches || 0}
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
                                    {t("entry_paid")}: {participation.entry_paid} • {t("winnings")}: {participation.final_payout || 0}
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
          </>
        )}
      </div>
    </div>
  );
}