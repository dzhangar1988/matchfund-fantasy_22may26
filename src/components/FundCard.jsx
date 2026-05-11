import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLanguage } from "@/lib/LanguageContext";

export default function FundCard({ fund }) {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    loadData();
  }, [fund.id]);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      const participations = await base44.entities.Participation.filter({ fund_id: fund.id });
      setParticipantCount(participations.length);
      
      const userParticipation = participations.find(p => p.user_id === currentUser.id);
      setHasJoined(!!userParticipation);
    } catch (error) {
      console.log("User not authenticated");
    }
  };

  const prizePool = participantCount * (fund.entry_fee || 0);

  return (
    <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="text-xl font-bold text-white truncate">{fund.title}</h3>
              {fund.status === "in_progress" && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse">
                  🔴 LIVE
                </Badge>
              )}
              {hasJoined && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  {t("joined")}
                </Badge>
              )}
              {fund.visibility === "private" && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("private")}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Target className="w-4 h-4" />
              <span>{fund.total_matches || 0} {t("matches")}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">{t("prize_pool")}</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              ${prizePool}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">{t("entry")}</span>
            </div>
            <div className="text-lg font-bold text-white">${fund.entry_fee}</div>
          </div>
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">{t("players")}</span>
            </div>
            <div className="text-lg font-bold text-white">
              {participantCount}/{fund.max_participants}
            </div>
          </div>
        </div>

        <Link to={createPageUrl(`FundDetails?id=${fund.id}`)}>
          <Button
            disabled={fund.status === "finished" || fund.status === "cancelled" || fund.status === "closed"}
            className={`w-full font-semibold ${
              hasJoined
                ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            } text-white shadow-lg`}
          >
            {fund.status === "finished" 
              ? t("status_finished")
              : fund.status === "cancelled"
              ? t("status_cancelled")
              : fund.status === "in_progress"
              ? t("view_details")
              : hasJoined 
              ? t("view_details")
              : t("join")
            }
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}