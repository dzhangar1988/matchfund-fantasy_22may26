import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trophy, Calendar, ChevronDown, ChevronUp, Zap, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ru, enUS } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useLanguage } from "@/lib/LanguageContext";

export default function GameweekCard({ gameweek, matches, user }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [fundTitle, setFundTitle] = useState("");
  
  React.useEffect(() => {
    // Auto-generate title when user is loaded
    if (user && !fundTitle) {
      const username = user.username || user.full_name?.split(' ')[0] || 'Player';
      setFundTitle(`${username} GW${gameweek}`);
    }
  }, [user, gameweek, fundTitle]);
  
  if (!matches || matches.length === 0) return null;

  // Group matches by date for better display
  const startDate = new Date(matches[0].match_date);
  const endDate = new Date(matches[matches.length - 1].match_date);
  const dateLocale = language === "ru" ? ru : enUS;
  const dateRange = startDate.toDateString() === endDate.toDateString() 
    ? format(startDate, "d MMM", { locale: dateLocale })
    : `${format(startDate, "d", { locale: dateLocale })}-${format(endDate, "d MMM", { locale: dateLocale })}`;

  const competition = matches[0].competition || "Premier League";
  
  const displayedMatches = isExpanded ? matches : matches.slice(0, 3);
  const hiddenCount = matches.length - 3;

  const handleQuickCreate = () => {
    if (!fundTitle.trim()) {
      alert("Please enter a fund name");
      return;
    }

    const preFillData = {
      step: 3, // Skip to predictions
      fundSetup: {
        title: fundTitle.trim(),
        description: `${competition} • GW${gameweek} • ${matches.length} ${t("matches")}`,
        entry_fee: 100,
        max_participants: 10,
        min_participants: 2,
        credits_per_player: 12,
        visibility: "public",
        password: ""
      },
      selectedMatches: matches,
      isQuickCreate: true
    };

    navigate(createPageUrl("CreateFund"), { state: preFillData });
  };

  return (
    <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] overflow-hidden">
      <CardHeader className="border-b border-gray-800 bg-gradient-to-r from-orange-500/10 to-yellow-500/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {t("quick_create_fund")}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <Trophy className="w-4 h-4" />
              <span>{competition} • Gameweek {gameweek}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Fund Title Input */}
        <div className="mb-6 p-4 rounded-lg bg-white/5 border border-gray-700">
          <Label className="text-gray-300 mb-2 block">{t("fund_name")}</Label>
          <Input
            value={fundTitle}
            onChange={(e) => setFundTitle(e.target.value)}
            placeholder={`Player GW${gameweek}`}
            className="bg-white/10 border-gray-600 text-white text-lg font-semibold placeholder:text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            {t("fund_name_hint")}
          </p>
        </div>

        {/* Match Info */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-400">
              <Calendar className="w-5 h-5" />
              <span className="font-semibold">{dateRange} • {matches.length} {t("matches")}</span>
            </div>
          </div>

          <div className="space-y-2">
            {displayedMatches.map((match, index) => (
              <div
                key={match.id || index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-gray-700"
              >
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">
                    {match.home_team} vs {match.away_team}
                  </p>
                </div>
                <div className="text-xs text-gray-400">
                  {format(new Date(match.match_date), "d MMM, HH:mm", { locale: enUS })}
                </div>
              </div>
            ))}

            {!isExpanded && hiddenCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(true)}
                className="w-full text-gray-400 hover:text-white hover:bg-white/5 text-sm"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                +{hiddenCount} {t("matches")}
              </Button>
            )}

            {isExpanded && (
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(false)}
                className="w-full text-gray-400 hover:text-white hover:bg-white/5 text-sm"
              >
                <ChevronUp className="w-4 h-4 mr-2" />
                {t("collapse")}
              </Button>
            )}
          </div>
        </div>

        {/* Quick Create Button */}
        <div className="space-y-3">
          <Button
            onClick={handleQuickCreate}
            disabled={!fundTitle.trim()}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg shadow-2xl shadow-orange-500/30"
          >
            {t("continue_to_predictions")}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              ⚡ {t("matches_preselected")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t("gameweek_card_hint")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}