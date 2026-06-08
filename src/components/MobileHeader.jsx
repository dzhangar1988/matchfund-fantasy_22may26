import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";

const ROOT_PATHS = ["/", "/Home", "/Profile", "/Leaderboard", "/portfolio", "/CreateFund", "/FAQ"];

export default function MobileHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const isRoot = ROOT_PATHS.some(p =>
    p === "/" ? location.pathname === "/" : location.pathname === p || location.pathname.startsWith(p + "?")
  );

  if (isRoot) return null;

  return (
    <header
      className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0A1628]/90 backdrop-blur-xl border-b border-gray-800 sticky top-0 z-40"
      style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}
    >
      <button
        onClick={() => navigate(-1)}
        className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 transition-colors select-none"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
          <Trophy className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-white text-base">MatchFund</span>
      </div>
    </header>
  );
}