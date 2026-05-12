import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Trophy, Target, ArrowRight, TrendingUp, Loader2 } from "lucide-react";

function StatusBadge({ status }) {
  if (status === "in_progress") return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse">🔴 Live</Badge>;
  if (status === "open") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Open</Badge>;
  if (status === "finished") return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">Finished</Badge>;
  if (status === "closed") return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Closed</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">{status}</Badge>;
}

export default function Portfolio() {
  const [user, setUser] = useState(null);
  const [fundRows, setFundRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Get all participations for this user
      const participations = await base44.entities.Participation.filter({ user_id: currentUser.id });
      if (participations.length === 0) { setIsLoading(false); return; }

      const fundIds = [...new Set(participations.map(p => p.fund_id))];

      // Load all funds and all participations for leaderboard position
      const [allFunds, allParticipations] = await Promise.all([
        base44.entities.MatchFund.list(),
        base44.entities.Participation.list(),
      ]);

      const rows = fundIds.map(fundId => {
        const fund = allFunds.find(f => f.id === fundId);
        if (!fund) return null;

        const myParticipation = participations.find(p => p.fund_id === fundId);
        const fundParticipations = allParticipations
          .filter(p => p.fund_id === fundId)
          .sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

        const myRank = fundParticipations.findIndex(p => p.user_id === currentUser.id) + 1;
        const totalParticipants = fundParticipations.length;
        const prizePool = totalParticipants * (fund.entry_fee || 0);

        // Calculate potential prize based on rank and prize_split
        let potentialPrize = 0;
        const split = fund.prize_split;
        if (myRank === 1) {
          const pct = split === "top2" ? 60 : split === "top3" ? 50 : 100;
          potentialPrize = Math.round(prizePool * pct / 100);
        } else if (myRank === 2 && (split === "top2" || split === "top3")) {
          const pct = split === "top2" ? 40 : 30;
          potentialPrize = Math.round(prizePool * pct / 100);
        } else if (myRank === 3 && split === "top3") {
          potentialPrize = Math.round(prizePool * 20 / 100);
        }

        return {
          fund,
          myParticipation,
          myRank,
          totalParticipants,
          prizePool,
          potentialPrize,
        };
      }).filter(Boolean);

      // Sort: in_progress first, then open, then rest
      const order = { in_progress: 0, open: 1, closed: 2, finished: 3 };
      rows.sort((a, b) => (order[a.fund.status] ?? 4) - (order[b.fund.status] ?? 4));

      setFundRows(rows);
    } catch (e) {
      console.error("Portfolio load error", e);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Portfolio</h1>
          <p className="text-gray-400">Track your funds and investments</p>
        </div>

        {/* My Funds */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-400" />
            My Funds
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl bg-[#0F1E35]" />)}
            </div>
          ) : fundRows.length === 0 ? (
            <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] text-center">
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">You haven't joined or created any funds yet.</p>
              <Link to="/CreateFund" className="inline-block mt-4">
                <Button className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold">
                  Create a Fund
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {fundRows.map(({ fund, myParticipation, myRank, totalParticipants, potentialPrize }) => (
                <div
                  key={fund.id}
                  className="p-5 rounded-2xl border border-gray-700 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] flex flex-col md:flex-row md:items-center gap-4"
                >
                  {/* Fund info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-bold text-base truncate">{fund.title}</h3>
                      <StatusBadge status={fund.status} />
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Target className="w-3.5 h-3.5" />
                        {fund.total_matches || 0} matches
                      </span>
                      <span>
                        Rank: <span className="text-white font-semibold">#{myRank}</span>
                        <span className="text-gray-500"> / {totalParticipants}</span>
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">My Points</div>
                      <div className="text-lg font-bold text-white">{myParticipation?.total_points || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-0.5">Potential Prize</div>
                      <div className={`text-lg font-bold ${potentialPrize > 0 ? "text-yellow-400" : "text-gray-500"}`}>
                        ${potentialPrize}
                      </div>
                    </div>
                    <Link to={`/FundDetails?id=${fund.id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold">
                        View Fund <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Investments */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-400" />
            My Investments
          </h2>
          <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] text-center">
            <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No share investments yet.</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              When the fractional market launches, your purchased shares will appear here.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}