import React, { createContext, useContext, useState, useEffect } from "react";

const translations = {
  ru: {
    // Navigation
    nav_home: "Главная",
    nav_create_fund: "Создать фонд",
    nav_leaderboard: "Лидеры",
    nav_faq: "FAQ",
    nav_profile: "Профиль",
    nav_admin_matches: "Управление матчами",
    // Sidebar
    your_balance: "Ваш баланс",
    points: "баллов",
    admin: "Админ",
    logout: "Выход",
    login: "Войти",
    // Home
    home_subtitle: "Английская Премьер-Лига • Пулы прогнозов",
    create_fund: "Создать фонд",
    balance: "Баланс",
    back_to_sports: "Назад к выбору спорта",
    loading: "Загрузка...",
    // Sport Selection
    sport_select_title: "Выберите вид спорта",
    sport_select_subtitle: "Соревнуйтесь с друзьями в прогнозах на матчи",
    coming_soon: "Скоро",
    // Gameweek
    quick_create: "Быстрое создание",
    gw_title: "Тур",
    matches: "матчей",
    // Open Funds
    open_funds: "Открытые фонды",
    no_funds: "Нет открытых фондов",
    join: "Присоединиться",
    players: "игроков",
    prize_pool: "Призовой фонд",
    entry: "Взнос",
    // FAQ
    faq_title: "FAQ & Правила",
    faq_subtitle: "Всё что нужно знать об игре",
    faq_support: "Остались вопросы?",
    faq_support_text: "Свяжитесь с нами через боковое меню",
    // Profile
    profile_title: "Профиль",
    total_balance: "Баланс",
    total_winnings: "Всего выиграно",
    total_wins: "Побед",
    participations: "Участий",
    // Common
    min: "мин",
    max: "макс",
    participants: "участников",
    private: "Приватный",
    public: "Публичный",
    status_open: "Открыт",
    status_closed: "Закрыт",
    status_finished: "Завершён",
    status_in_progress: "В процессе",
    status_cancelled: "Отменён",
    fund_details: "Детали фонда",
    leaderboard: "Таблица лидеров",
    my_predictions: "Мои прогнозы",
    join_fund: "Присоединиться к фонду",
    fund_closed: "Фонд закрыт",
    // Username modal
    choose_username: "Выберите имя пользователя",
    username_hint: "Это имя будет отображаться в таблице лидеров и фондах",
    username_placeholder: "имя пользователя",
    save: "Сохранить",
    username_min: "Имя пользователя должно быть не менее 3 символов",
  },
  en: {
    // Navigation
    nav_home: "Home",
    nav_create_fund: "Create Fund",
    nav_leaderboard: "Leaderboard",
    nav_faq: "FAQ",
    nav_profile: "Profile",
    nav_admin_matches: "Manage Matches",
    // Sidebar
    your_balance: "Your balance",
    points: "points",
    admin: "Admin",
    logout: "Logout",
    login: "Login",
    // Home
    home_subtitle: "English Premier League • Prediction Pools",
    create_fund: "Create Fund",
    balance: "Balance",
    back_to_sports: "Back to sport selection",
    loading: "Loading...",
    // Sport Selection
    sport_select_title: "Select a Sport",
    sport_select_subtitle: "Compete with friends in match predictions",
    coming_soon: "Coming Soon",
    // Gameweek
    quick_create: "Quick Create",
    gw_title: "Gameweek",
    matches: "matches",
    // Open Funds
    open_funds: "Open Funds",
    no_funds: "No open funds",
    join: "Join",
    players: "players",
    prize_pool: "Prize Pool",
    entry: "Entry",
    // FAQ
    faq_title: "FAQ & Rules",
    faq_subtitle: "Everything you need to know about the game",
    faq_support: "Still have questions?",
    faq_support_text: "Contact us through the sidebar menu",
    // Profile
    profile_title: "Profile",
    total_balance: "Balance",
    total_winnings: "Total Winnings",
    total_wins: "Wins",
    participations: "Participations",
    // Common
    min: "min",
    max: "max",
    participants: "participants",
    private: "Private",
    public: "Public",
    status_open: "Open",
    status_closed: "Closed",
    status_finished: "Finished",
    status_in_progress: "In Progress",
    status_cancelled: "Cancelled",
    fund_details: "Fund Details",
    leaderboard: "Leaderboard",
    my_predictions: "My Predictions",
    join_fund: "Join Fund",
    fund_closed: "Fund Closed",
    // Username modal
    choose_username: "Choose a username",
    username_hint: "This name will appear in the leaderboard and funds",
    username_placeholder: "username",
    save: "Save",
    username_min: "Username must be at least 3 characters",
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("app_language") || "ru";
  });

  const toggleLanguage = () => {
    const newLang = language === "ru" ? "en" : "ru";
    setLanguage(newLang);
    localStorage.setItem("app_language", newLang);
  };

  const t = (key) => {
    return translations[language]?.[key] || translations["ru"]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}