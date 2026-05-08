import React, { useState, useEffect } from "react";

import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Crown, Trophy, Medal, TrendingUp, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/LanguageContext";

export default function Leaderboard() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    const [allUsers, allParticipations, allFunds] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Participation.list(),
      base44.entities.MatchFund.list(),
    ]);

    const fundMap = {};
    for (const f of allFunds) fundMap[f.id] = f;

    const usersWithStats = allUsers.map(user => {
      const userParticipations = allParticipations.filter(p => p.user_id === user.id);
      const finishedParticipations = userParticipations.filter(
        p => p.status === 'winner' || p.status === 'loser'
      );

      const wins = userParticipations.filter(p => p.status === 'winner').length;
      const totalWinnings = userParticipations
        .filter(p => p.status === 'winner')
        .reduce((sum, p) => sum + (p.final_payout || 0), 0);

      // Total prediction points earned across all participations
      const totalPoints = userParticipations.reduce((sum, p) => sum + (p.total_points || 0), 0);

      // Potential prize: sum of what this user could win from active funds
      const potentialPrize = userParticipations
        .filter(p => p.status === 'active' || p.status === 'pending')
        .reduce((sum, p) => {
          const fund = fundMap[p.fund_id];
          if (!fund || !fund.prize_distribution) return sum;
          const pool = (fund.total_pool || 0) * (1 - ((fund.platform_fee_percent || 7) / 100));
          const topPrize = pool * ((fund.prize_distribution[0] || 100) / 100);
          return sum + topPrize;
        }, 0);

      const winRate = finishedParticipations.length > 0
        ? Math.round((wins / finishedParticipations.length) * 100)
        : 0;

      return {
        ...user,
        total_wins: wins,
        total_winnings: totalWinnings,
        total_points: totalPoints,
        potential_prize: Math.round(potentialPrize),
        total_participations: finishedParticipations.length,
        active_participations: userParticipations.filter(p => p.status === 'active' || p.status === 'pending').length,
        win_rate: winRate
      };
    });

    // Sort by total prediction points, then by winnings, then by balance
    const sorted = usersWithStats
      .filter(u => u.total_points > 0 || u.total_participations > 0 || u.active_participations > 0)
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.total_winnings !== a.total_winnings) return b.total_winnings - a.total_winnings;
        return (b.total_balance || 0) - (a.total_balance || 0);
      });

    setUsers(sorted);
    setIsLoading(false);
  };

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
          ) : users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="relative overflow-hidden rounded-xl p-6 border border-gray-700 bg-white/5 hover:bg-white/10 transition-all"
                >
                  <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${getPositionColor(index)}`} />
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white text-xl">
                          {user.username?.[0]?.toUpperCase() || user.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        {index < 3 && user.total_winnings > 0 && (
                          <div className="absolute -top-1 -right-1">
                            {getPositionIcon(index)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold text-lg">#{index + 1}</span>
                          <h3 className="text-white font-bold text-lg">
                            {user.username || user.full_name || t("player_default")}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          {(user.total_participations > 0 || user.active_participations > 0) ? (
                            <>
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span>{user.total_wins || 0} {t("wins")}</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-400">
                                <Target className="w-4 h-4 text-blue-500" />
                                <span>{(user.total_participations || 0) + (user.active_participations || 0)} {t("funds_count")}</span>
                              </div>
                              {user.win_rate > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-400">
                                  <TrendingUp className="w-4 h-4 text-green-500" />
                                  <span>{user.win_rate}% {t("win_rate_pct")}</span>
                                </div>
                              )}
                              {user.potential_prize > 0 && (
                                <div className="flex items-center gap-1 text-sm text-green-400">
                                  <span>🏆 Potential: {user.potential_prize} pts</span>
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
                        {user.total_points || 0}
                      </div>
                      <div className="text-sm text-gray-400">pts earned</div>
                      {user.total_winnings > 0 && (
                        <div className="text-xs text-green-400 mt-1">+{user.total_winnings} won</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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