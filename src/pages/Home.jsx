import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trophy, ArrowRight, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import OpenFundsPreview from "../components/OpenFundsPreview";
import FundCard from "../components/FundCard";
import usePullToRefresh from "@/hooks/usePullToRefresh";

export default function Home() {
  const { t } = useLanguage();
  const [funds, setFunds] = useState([]);
  const [user, setUser] = useState(null);
  const [wcMatches, setWcMatches] = useState([]);
  const [wcView, setWcView] = useState('date');
  const [isLoading, setIsLoading] = useState(true);
  const openFundsSectionRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();

      if (currentUser.total_balance === undefined || currentUser.total_balance === null) {
        await base44.entities.User.update(currentUser.id, {
          total_balance: 500,
          total_winnings: 0,
          total_wins: 0,
          total_participations: 0,
          total_predictions: 0
        });
        currentUser.total_balance = 500;
      }

      setUser(currentUser);

      const [allFundsRaw, wcRaw] = await Promise.all([
        Promise.all([
          base44.entities.MatchFund.filter({ status: "open" }, "-created_date", 50),
          base44.entities.MatchFund.filter({ status: "in_progress" }, "-created_date", 50),
          base44.entities.MatchFund.filter({ status: "closed" }, "-created_date", 50),
        ]).then(([open, inProgress, closed]) => [...open, ...inProgress, ...closed]),
        base44.entities.Match.filter({ competition: "World Cup 2026" }),
      ]);
      const allFunds = allFundsRaw;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const upcomingWC = wcRaw
        .filter(m => m.status !== "finished" && m.status !== "cancelled" && m.status !== "postponed")
        .filter(m => {
          const matchTime = m.match_date.endsWith('Z') ? new Date(m.match_date) : new Date(m.match_date + 'Z');
          return matchTime >= todayStart;
        })
        .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
      setWcMatches(upcomingWC);

      // Keep open (joinable), in_progress and closed (started/locked) funds — all public
      const visibleFunds = allFunds.filter(f => f.status === "open" || f.status === "in_progress" || f.status === "closed");
      setFunds(visibleFunds);
      setIsLoading(false);
      return;
    } catch (error) {
      console.error("loadData error:", error);
      setIsLoading(false);
    }
  };

  const { containerRef, pulling, pullDistance, refreshing } = usePullToRefresh(loadData);

  const openFunds = funds.filter(f => f.status === "open");
  const liveFunds = funds.filter(f => f.status === "in_progress" || f.status === "closed");

  const stats = [
    { 
      label: t("balance"),
      value: user?.total_balance || 0,
      icon: Trophy,
      color: "from-yellow-500 to-orange-500"
    }
  ];

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8" ref={containerRef}>
      {/* Pull-to-refresh indicator (mobile only) */}
      {(pulling || refreshing) && (
        <div
          className="md:hidden flex items-center justify-center transition-all duration-200"
          style={{ height: Math.min(pullDistance, 70), overflow: "hidden" }}
        >
          <RefreshCw
            className={`w-5 h-5 text-orange-400 ${refreshing ? "animate-spin" : ""}`}
            style={{ transform: refreshing ? undefined : `rotate(${(pullDistance / 70) * 180}deg)` }}
          />
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  MatchFund
                </span>
                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Fantasy</span>
              </h1>
              <p className="text-gray-400 text-lg">World Cup 2026 • Prediction Pools</p>
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

        {/* Open Funds — joinable */}
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
          <OpenFundsPreview funds={openFunds} totalCount={openFunds.length} allFundsCount={openFunds.length} />
        )}

        {/* Live Funds — started (in_progress / closed), locked, public */}
        {!isLoading && liveFunds.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-6">
              <span className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </span>
              Live Funds ({liveFunds.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveFunds.map(fund => (
                <FundCard key={fund.id} fund={fund} />
              ))}
            </div>
          </div>
        )}

        {/* World Cup 2026 Upcoming Matches */}
        {!isLoading && wcMatches.length > 0 && (() => {
          const MatchCard = ({ match }) => (
            <div className="p-4 rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                {match.group && (
                  <span className="text-xs font-medium text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full self-start">
                    {match.group}
                  </span>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-bold text-base leading-tight">
                    {match.home_team} <span className="text-gray-500 font-normal">vs</span> {match.away_team}
                  </span>
                  {match.status === "live" ? (
                    <span className="text-xs text-red-400 font-bold shrink-0 animate-pulse">🔴 LIVE</span>
                  ) : (
                    <span className="text-xs text-gray-400 shrink-0">
                      {(() => {
                        const d = new Date(match.match_date.endsWith('Z') ? match.match_date : match.match_date + 'Z');
                        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
                      })()}
                    </span>
                  )}
                </div>
              </div>
              <Link to={createPageUrl("CreateFund")}>
                <Button size="sm" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-xs">
                  Create Fund <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          );

          const byDate = {};
          for (const m of wcMatches) {
            const d = m.match_date.endsWith('Z') ? new Date(m.match_date) : new Date(m.match_date + 'Z');
            const dateKey = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
            if (!byDate[dateKey]) byDate[dateKey] = [];
            byDate[dateKey].push(m);
          }

          const byGroup = {};
          for (const m of wcMatches) {
            const g = m.group || 'Other';
            if (!byGroup[g]) byGroup[g] = [];
            byGroup[g].push(m);
          }
          const sortedGroups = Object.keys(byGroup).sort();

          return (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                🌍 <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">World Cup 2026</span>
                <span className="text-white">— Upcoming Matches</span>
              </h2>
              <p className="text-sm text-gray-400 mb-3">Create a fund around any of these games</p>

              {/* Toggle */}
              <div className="inline-flex rounded-full bg-white/5 border border-gray-700 p-1 mb-5">
                <button
                  onClick={() => setWcView('date')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-orange-400 ${wcView === 'date' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  style={{ minHeight: 44 }}
                >
                  By Date
                </button>
                <button
                  onClick={() => setWcView('group')}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-orange-400 ${wcView === 'group' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                  style={{ minHeight: 44 }}
                >
                  By Group
                </button>
              </div>

              {wcView === 'date' ? (
                <div className="space-y-6">
                  {Object.entries(byDate).map(([date, matches]) => (
                    <div key={date}>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-2">{date}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {matches.map(match => <MatchCard key={match.id} match={match} />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedGroups.map(group => (
                    <div key={group}>
                      <p className="text-xs font-semibold text-orange-400 uppercase tracking-widest mb-2">{group}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {byGroup[group]
                          .sort((a, b) => new Date(a.match_date) - new Date(b.match_date))
                          .map(match => <MatchCard key={match.id} match={match} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}