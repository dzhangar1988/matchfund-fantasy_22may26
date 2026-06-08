import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Trophy, Plus, Home, User as UserIcon, Crown, LogOut, HelpCircle, Settings, BarChart2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileHeader from "@/components/MobileHeader";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const getNavigationItems = (t) => [
  { title: t("nav_home"), url: createPageUrl("Home"), icon: Home },
  { title: t("nav_create_fund"), url: createPageUrl("CreateFund"), icon: Plus },
  { title: t("nav_profile"), url: createPageUrl("Profile"), icon: UserIcon },
  { title: t("nav_leaderboard"), url: createPageUrl("Leaderboard"), icon: Crown },
  { title: "Portfolio", url: "/portfolio", icon: BarChart2 },
  { title: "FAQ", url: createPageUrl("FAQ"), icon: HelpCircle },
];

const getAdminNavigationItems = (t) => [
  { title: t("nav_admin_matches"), url: createPageUrl("AdminMatches"), icon: Settings, adminOnly: true },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { language, toggleLanguage } = useLanguage();
  const [user, setUser] = React.useState(null);
  const [showUsernameModal, setShowUsernameModal] = React.useState(false);
  const [username, setUsername] = React.useState("");

  React.useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      
      // ✅ Проверяем username
      if (!currentUser.username || currentUser.username.trim() === "") {
        setShowUsernameModal(true);
      }
      
      setUser(currentUser);
    } catch (error) {
      console.error("User not authenticated");
    }
  };

  const handleSaveUsername = async () => {
    if (!username || username.trim().length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }
    
    try {
      await base44.entities.User.update(user.id, { username: username.trim() });
      setShowUsernameModal(false);
      await loadUser();
    } catch (error) {
      alert("Failed to save username: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout(createPageUrl("Home"));
    } catch (error) {
      console.error("Logout failed:", error);
      window.location.href = createPageUrl("Home");
    }
  };

  const { t } = useLanguage();
  const navigationItems = getNavigationItems(t);
  const adminNavigationItems = getAdminNavigationItems(t);
  const allNavigationItems = user?.is_admin
    ? [...navigationItems, ...adminNavigationItems]
    : navigationItems;

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --primary-orange: #FF6B00;
          --primary-dark: #0A1628;
          --accent-yellow: #FFD700;
          --gradient-start: #0A1628;
          --gradient-end: #000000;
        }
        body {
          background: linear-gradient(135deg, var(--gradient-start) 0%, var(--gradient-end) 100%);
          color: #FFFFFF;
        }
        button, a, [role="button"], nav, .select-none {
          -webkit-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      
      {/* ✅ Username Setup Modal */}
      {showUsernameModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0F1E35] border border-gray-800 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-4">{t("choose_username")}</h2>
            <p className="text-gray-400 mb-6">
              {t("username_hint")}
            </p>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("username_placeholder")}
              className="w-full px-4 py-3 bg-white/5 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
              minLength={3}
              maxLength={20}
            />
            <button
              onClick={handleSaveUsername}
              disabled={!username || username.trim().length < 3}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {t("save")}
            </button>
          </div>
        </div>
      )}
      
      <div className="min-h-screen flex w-full bg-gradient-to-br from-[#0A1628] via-[#0F1E35] to-[#000000]">
        <Sidebar className="border-r border-gray-800 bg-[#0A1628]/80 backdrop-blur-xl">
          <SidebarHeader className="border-b border-gray-800 p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-xl tracking-tight bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">MatchFund</h2>
                <p className="text-xs text-orange-400 font-medium">Fantasy</p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-4">
            {user && (
              <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">{t("your_balance")}</span>
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="text-3xl font-bold text-white">
                  {user.total_balance ?? 0}
                  <span className="text-sm text-orange-400 ml-2">{t("points")}</span>
                </div>
                {user.is_admin && (
                  <div className="mt-2 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-md inline-block">
                    {t("admin")}
                  </div>
                )}
              </div>
            )}

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {allNavigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`mb-2 rounded-lg transition-all duration-200 ${
                          location.pathname === item.url
                            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30"
                            : "hover:bg-white/5 text-gray-300 hover:text-white"
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-semibold">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-800 p-4">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username || user.full_name || "User"} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{(user.username?.[0] || user.full_name?.[0] || "U").toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {user.username || user.full_name || "User"}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-gray-700 transition-all duration-200"
                  >
                    <span className="text-sm font-bold text-orange-400">{language.toUpperCase()}</span>
                    <span className="text-gray-600 text-xs">|</span>
                    <span className="text-sm text-gray-400">{language === "ru" ? "EN" : "RU"}</span>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("logout")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg shadow-orange-500/30"
              >
                {t("login")}
              </Button>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header
            className="bg-[#0A1628]/60 backdrop-blur-xl border-b border-gray-800 px-6 py-4 md:hidden"
            style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}
          >
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-white/5 rounded-lg transition-colors duration-200 select-none" style={{ minWidth: 44, minHeight: 44 }} />
              <h1 className="text-xl font-bold text-white">MatchFund Fantasy</h1>
            </div>
          </header>

          <MobileHeader />

          <div
            className="flex-1 overflow-auto pb-[env(safe-area-inset-bottom)] md:pb-0"
            style={{ overscrollBehavior: "none" }}
          >
            <div key={location.pathname} className="md:pb-0 pb-16 page-enter">{children}</div>
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}