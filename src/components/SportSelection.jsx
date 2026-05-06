import React from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Gamepad2, Medal, ChevronRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/lib/LanguageContext";

export default function SportSelection({ onSelectSport }) {
  const { t } = useLanguage();

  const sports = [
    { 
      id: 'premier-league', 
      name: t("sport_epl"),
      shortName: t("sport_epl_short"),
      icon: Trophy, 
      enabled: true,
      color: 'from-purple-500 to-indigo-600'
    },
    { 
      id: 'esports', 
      name: t("sport_esports"),
      shortName: 'CS2 / Dota 2',
      icon: Gamepad2, 
      enabled: false,
      color: 'from-cyan-500 to-blue-600'
    },
    { 
      id: 'champions-league', 
      name: t("sport_ucl"),
      shortName: 'UCL',
      icon: Medal, 
      enabled: false,
      color: 'from-yellow-500 to-orange-600'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-3">
          {t("sport_select_title")}
        </h2>
        <p className="text-gray-400 text-lg">
          {t("sport_select_subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        {sports.map((sport) => {
          const Icon = sport.icon;
          
          return (
            <Card
              key={sport.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                sport.enabled
                  ? "cursor-pointer hover:scale-[1.02] hover:shadow-2xl border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]"
                  : "cursor-not-allowed opacity-50 border-gray-800 bg-[#0F1E35]"
              }`}
              onClick={() => sport.enabled && onSelectSport(sport.id)}
            >
              {/* Gradient background effect */}
              <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${sport.color} opacity-10 rounded-full blur-3xl`} />
              
              <div className="relative p-6 flex items-center gap-6">
                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${sport.color} flex items-center justify-center flex-shrink-0 ${!sport.enabled && 'grayscale'}`}>
                  <Icon className="w-10 h-10 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    {sport.name}
                    {!sport.enabled && (
                      <Badge className="bg-gray-700 text-gray-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {t("coming_soon")}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-gray-400">{sport.shortName}</p>
                </div>

                {/* Arrow */}
                {sport.enabled && (
                  <ChevronRight className="w-8 h-8 text-gray-400" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <p className="text-blue-300 text-sm text-center">
          💡 {t("more_sports_coming")}
        </p>
      </div>
    </div>
  );
}