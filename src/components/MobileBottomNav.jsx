import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Plus, User, Crown, BarChart2 } from "lucide-react";
import { createPageUrl } from "@/utils";

const tabs = [
  { label: "Home", icon: Home, url: "/" },
  { label: "Create", icon: Plus, url: createPageUrl("CreateFund") },
  { label: "Profile", icon: User, url: createPageUrl("Profile") },
  { label: "Leaders", icon: Crown, url: createPageUrl("Leaderboard") },
  { label: "Portfolio", icon: BarChart2, url: "/portfolio" },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0A1628]/95 backdrop-blur-xl border-t border-gray-800 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.url || 
          (tab.url !== "/" && location.pathname.startsWith(tab.url));
        return (
          <Link
            key={tab.label}
            to={tab.url}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 select-none"
            style={{ minHeight: 56 }}
          >
            <tab.icon
              className={`w-5 h-5 transition-colors ${isActive ? "text-orange-400" : "text-gray-500"}`}
            />
            <span
              className={`text-[10px] font-medium transition-colors ${isActive ? "text-orange-400" : "text-gray-500"}`}
            >
              {tab.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-6 h-0.5 bg-orange-400 rounded-t-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}