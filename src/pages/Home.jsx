import React, { useState, useEffect, useRef } from "react";
import { MatchFund } from "@/entities/MatchFund";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trophy, ArrowRight, Users } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import OpenFundsPreview from "../components/OpenFundsPreview";

export default function Home() {
  const { t } = useLanguage();
  const [funds, setFunds] = useState([]);
  const [user, setUser] = useState(null);
  const [myActiveFunds, setMyActiveFunds] = useState([]);
  const [myRoles, setMyRoles] = useState({}); // fund_id -> { creator, player, investor }
  const [participantCounts, setParticipantCounts] = useState({}); // fund_id -> count
  const [isLoading, setIsLoading] = useState(true);
  const openFundsSectionRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();

      if (currentUser.total_balance === undefined || currentUser.total_balance === null) {
        await User.update(currentUser.id, {
          total_balance: 500,
          total_winnings: 0,
          total_wins: 0,
          total_participations: 0,
          total_predictions: 0
        });
        currentUser.total_balance = 500;
      }

      setUser(currentUser);

      // Load participations AND share purchases in parallel
      // Note: Participation RLS is scoped to created_by (current user), so no filter needed
      const [participations, sharePurchases, allFunds] = await Promise.all([
        base44.entities.Participation.list(),
        base44.entities.SharePurchase.list(),
        MatchFund.list("-created_date"),
      ]);

      setFunds(allFunds);

      const participatedFundIds = new Set(participations.map(p => p.fund_id));
      const investedFundIds = new Set(sharePurchases.map(s => s.fund_id));
      const ACTIVE_STATUSES = ["open", "in_progress"];

      const active = allFunds.filter(f =>
        (participatedFundIds.has(f.id) || f.creator_id === currentUser.id) &&
        ACTIVE_STATUSES.includes(f.status)
      );

      // Build roles map
      const roles = {};
      for (const f of active) {
        roles[f.id] = {
          creator: f.creator_id === currentUser.id,
          player: participatedFundIds.has(f.id),
          investor: investedFundIds.has(f.id) && !participatedFundIds.has(f.id) && f.creator_id !== currentUser.id,
        };
      }

      // Load participant counts for each active fund
      const countEntries = await Promise.all(
        active.map(async (f) => {
          const parts = await base44.entities.Participation.filter({ fund_id: f.id });
          return [f.id, parts.length];
        })
      );
      setParticipantCounts(Object.fromEntries(countEntries));
      setMyRoles(roles);
      setMyActiveFunds(active);
      setIsLoading(false);
      return;
    } catch (error) {
      console.log("User not authenticated");
    }

    const allFunds = await MatchFund.list("-created_date");
    setFunds(allFunds);
    setIsLoading(false);
  };

  const myActiveFundIds = new Set(myActiveFunds.map(f => f.id));
  const openFunds = funds.filter(f => (f.status === "open" || f.status === "in_progress") && !myActiveFundIds.has(f.id));

  const stats = [
    { 
      label: t("balance"),
      value: user?.total_balance || 0,
      icon: Trophy,
      color: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  MatchFund
                </span>
                Fantasy
              </h1>
              <p className="text-gray-400 text-lg">{t("home_subtitle")}</p>
            </div>
            <Link to={createPageUrl("CreateFund")}>
              <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold px-6 py-6 text-lg shadow-2xl shadow-orange-500/30">
                <Plus className="w-5 h-5 mr-2" />
                {t("create_fund")}
              </Button>
            </Link>
          </div>

          {/* Balance stat */}
          <div className="grid grid-cols-1 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] p-6"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-3xl`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                    <p className="text-4xl font-bold text-white">{isLoading ? "—" : stat.value}</p>
                  </div>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            ))}

            {/* Respect card — only shown if user has any respect activity */}
            {!isLoading && user && (
              <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500 to-orange-500 opacity-10 rounded-full blur-3xl" />
                <div className="relative">
                  {(user.respect_points ?? 0) > 0 && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">💎</span>
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">{user.respect_points} Respect</p>
                        <p className="text-xs text-gray-400">Community reputation</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-300">
                      ⭐ {(user.show_respects_received ?? 0) % 10} / 10 towards next 💎 Respect
                    </span>
                  </div>
                  <div className="w-full bg-gray-800/60 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-500"
                      style={{ width: `${Math.min(((user.show_respects_received ?? 0) % 10) / 10 * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* My Active Funds */}
        {!isLoading && user && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">My Active Funds</h2>
            {myActiveFunds.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myActiveFunds.map(fund => {
                  const role = myRoles[fund.id] || {};
                  return (
                    <div key={fund.id} className="p-5 rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-bold text-lg leading-tight">{fund.title}</h3>
                        {fund.status === "in_progress" ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse shrink-0">🔴 LIVE</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs shrink-0">Open</Badge>
                        )}
                      </div>

                      {/* Role badge — single, priority: Creator > Player > Investor */}
                      <div className="flex flex-wrap gap-1">
                        {fund.creator_id === user.id ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Creator</Badge>
                        ) : role.player ? (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Player</Badge>
                        ) : role.investor ? (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Investor</Badge>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Entry: <span className="text-white font-semibold">{fund.entry_fee} pts</span></span>
                        <span>{fund.total_matches || 0} matches</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {participantCounts[fund.id] ?? "—"}
                        </span>
                      </div>

                      <Link to={`/FundDetails?id=${fund.id}`}>
                        <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm">
                          View Fund <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] text-center">
                <p className="text-gray-400 mb-4">You're not in any active funds yet.</p>
                <Button
                  variant="outline"
                  className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  onClick={() => openFundsSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  Browse Open Funds
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Open Funds Preview */}
        <div ref={openFundsSectionRef} />
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-800 bg-[#0F1E35]">
                <Skeleton className="h-8 w-3/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-6" />
                <Skeleton className="h-24 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <OpenFundsPreview funds={openFunds} totalCount={openFunds.length} />
        )}
      </div>
    </div>
  );
}