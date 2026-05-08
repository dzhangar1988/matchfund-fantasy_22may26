import React, { useState, useEffect } from "react";
import { MatchFund } from "@/entities/MatchFund";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Trophy } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Skeleton } from "@/components/ui/skeleton";
import OpenFundsPreview from "../components/OpenFundsPreview";

export default function Home() {
  const { t } = useLanguage();
  const [funds, setFunds] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log("=== LOADING HOME DATA ===");
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      
      if (currentUser.total_balance === undefined || currentUser.total_balance === null) {
        console.warn("⚠️ User balance is null on home, setting welcome bonus 500");
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
      console.log("User loaded:", currentUser.email, "Balance:", currentUser.total_balance);
    } catch (error) {
      console.log("User not authenticated");
    }
    
    console.log("Loading funds...");
    const allFunds = await MatchFund.list("-created_date");
    console.log("Total funds in database:", allFunds.length);
    setFunds(allFunds);
    setIsLoading(false);
  };

  const openFunds = funds.filter(f => f.status === "open");

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
          <div className="grid grid-cols-1 gap-6 mb-8">
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
          </div>
        </div>

        {/* Open Funds Preview */}
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