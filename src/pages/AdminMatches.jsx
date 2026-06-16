import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, CheckCircle, AlertCircle, Loader2, Calculator, Pencil, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COMPETITIONS = [
  "World Cup 2026",
  "Premier League",
];

const TEAMS = {
  "World Cup 2026": [
    "USA", "Mexico", "Canada",
    "Argentina", "Brazil", "Uruguay", "Ecuador", "Colombia", "Chile", "Bolivia", "Venezuela", "Paraguay",
    "Spain", "Germany", "France", "England", "Portugal", "Netherlands", "Italy", "Belgium",
    "Croatia", "Serbia", "Austria", "Hungary", "Czechia", "Turkey", "Ukraine", "Poland", "Slovakia", "Romania", "Switzerland",
    "Morocco", "Senegal", "Egypt", "Nigeria", "Cameroon", "South Africa", "DR Congo", "Ivory Coast", "Algeria",
    "Japan", "South Korea", "Saudi Arabia", "Iran", "Australia", "New Zealand", "Indonesia", "Uzbekistan",
    "Panama", "Honduras", "Jamaica", "Costa Rica", "El Salvador", "Cuba",
    "Qatar", "Iraq"
  ],
  "Premier League": [
    "Arsenal", "Manchester City", "Bournemouth", "Liverpool", "Chelsea",
    "Tottenham Hotspur", "Sunderland", "Crystal Palace", "Manchester United", "Brighton",
    "Aston Villa", "Everton", "Brentford", "Newcastle United", "Fulham",
    "Leeds United", "Burnley", "Nottingham Forest", "West Ham United", "Wolves"
  ],
};

const WC_FIXTURES = [
  // GROUP A: Mexico, South Africa, South Korea, Czechia
  { home_team: "Mexico", away_team: "South Africa", match_date: "2026-06-11T20:00:00Z", group: "Group A", matchweek: 1 },
  { home_team: "South Korea", away_team: "Czechia", match_date: "2026-06-12T01:00:00Z", group: "Group A", matchweek: 1 },
  { home_team: "Mexico", away_team: "Czechia", match_date: "2026-06-18T23:00:00Z", group: "Group A", matchweek: 2 },
  { home_team: "South Korea", away_team: "South Africa", match_date: "2026-06-19T02:00:00Z", group: "Group A", matchweek: 2 },
  { home_team: "Mexico", away_team: "South Korea", match_date: "2026-06-26T20:00:00Z", group: "Group A", matchweek: 3 },
  { home_team: "South Africa", away_team: "Czechia", match_date: "2026-06-26T20:00:00Z", group: "Group A", matchweek: 3 },
  // GROUP B: Canada, Bosnia & Herzegovina, Qatar, Switzerland
  { home_team: "Canada", away_team: "Bosnia & Herzegovina", match_date: "2026-06-12T19:00:00Z", group: "Group B", matchweek: 1 },
  { home_team: "Qatar", away_team: "Switzerland", match_date: "2026-06-13T19:00:00Z", group: "Group B", matchweek: 1 },
  { home_team: "Canada", away_team: "Qatar", match_date: "2026-06-19T22:00:00Z", group: "Group B", matchweek: 2 },
  { home_team: "Bosnia & Herzegovina", away_team: "Switzerland", match_date: "2026-06-20T01:00:00Z", group: "Group B", matchweek: 2 },
  { home_team: "Canada", away_team: "Switzerland", match_date: "2026-06-26T23:00:00Z", group: "Group B", matchweek: 3 },
  { home_team: "Qatar", away_team: "Bosnia & Herzegovina", match_date: "2026-06-26T23:00:00Z", group: "Group B", matchweek: 3 },
  // GROUP C: Brazil, Morocco, Haiti, Scotland
  { home_team: "Brazil", away_team: "Morocco", match_date: "2026-06-13T22:00:00Z", group: "Group C", matchweek: 1 },
  { home_team: "Haiti", away_team: "Scotland", match_date: "2026-06-14T01:00:00Z", group: "Group C", matchweek: 1 },
  { home_team: "Brazil", away_team: "Haiti", match_date: "2026-06-20T22:00:00Z", group: "Group C", matchweek: 2 },
  { home_team: "Morocco", away_team: "Scotland", match_date: "2026-06-21T01:00:00Z", group: "Group C", matchweek: 2 },
  { home_team: "Brazil", away_team: "Scotland", match_date: "2026-06-27T01:00:00Z", group: "Group C", matchweek: 3 },
  { home_team: "Morocco", away_team: "Haiti", match_date: "2026-06-27T01:00:00Z", group: "Group C", matchweek: 3 },
  // GROUP D: USA, Paraguay, Australia, Türkiye
  { home_team: "USA", away_team: "Paraguay", match_date: "2026-06-13T01:00:00Z", group: "Group D", matchweek: 1 },
  { home_team: "Australia", away_team: "Türkiye", match_date: "2026-06-14T01:00:00Z", group: "Group D", matchweek: 1 },
  { home_team: "USA", away_team: "Australia", match_date: "2026-06-19T23:00:00Z", group: "Group D", matchweek: 2 },
  { home_team: "Paraguay", away_team: "Türkiye", match_date: "2026-06-20T02:00:00Z", group: "Group D", matchweek: 2 },
  { home_team: "USA", away_team: "Türkiye", match_date: "2026-06-27T02:00:00Z", group: "Group D", matchweek: 3 },
  { home_team: "Paraguay", away_team: "Australia", match_date: "2026-06-27T02:00:00Z", group: "Group D", matchweek: 3 },
  // GROUP E: Germany, Curaçao, Côte d'Ivoire, Ecuador
  { home_team: "Germany", away_team: "Curaçao", match_date: "2026-06-14T22:00:00Z", group: "Group E", matchweek: 1 },
  { home_team: "Côte d'Ivoire", away_team: "Ecuador", match_date: "2026-06-15T01:00:00Z", group: "Group E", matchweek: 1 },
  { home_team: "Germany", away_team: "Ecuador", match_date: "2026-06-21T22:00:00Z", group: "Group E", matchweek: 2 },
  { home_team: "Curaçao", away_team: "Côte d'Ivoire", match_date: "2026-06-22T01:00:00Z", group: "Group E", matchweek: 2 },
  { home_team: "Germany", away_team: "Côte d'Ivoire", match_date: "2026-06-27T22:00:00Z", group: "Group E", matchweek: 3 },
  { home_team: "Ecuador", away_team: "Curaçao", match_date: "2026-06-27T22:00:00Z", group: "Group E", matchweek: 3 },
  // GROUP F: Netherlands, Japan, Sweden, Tunisia
  { home_team: "Netherlands", away_team: "Tunisia", match_date: "2026-06-15T19:00:00Z", group: "Group F", matchweek: 1 },
  { home_team: "Japan", away_team: "Sweden", match_date: "2026-06-15T22:00:00Z", group: "Group F", matchweek: 1 },
  { home_team: "Netherlands", away_team: "Sweden", match_date: "2026-06-22T19:00:00Z", group: "Group F", matchweek: 2 },
  { home_team: "Japan", away_team: "Tunisia", match_date: "2026-06-22T22:00:00Z", group: "Group F", matchweek: 2 },
  { home_team: "Netherlands", away_team: "Japan", match_date: "2026-06-27T19:00:00Z", group: "Group F", matchweek: 3 },
  { home_team: "Sweden", away_team: "Tunisia", match_date: "2026-06-27T19:00:00Z", group: "Group F", matchweek: 3 },
  // GROUP G: Belgium, Egypt, Iran, New Zealand
  { home_team: "Belgium", away_team: "Egypt", match_date: "2026-06-15T22:00:00Z", group: "Group G", matchweek: 1 },
  { home_team: "Iran", away_team: "New Zealand", match_date: "2026-06-16T01:00:00Z", group: "Group G", matchweek: 1 },
  { home_team: "Belgium", away_team: "Iran", match_date: "2026-06-22T22:00:00Z", group: "Group G", matchweek: 2 },
  { home_team: "Egypt", away_team: "New Zealand", match_date: "2026-06-23T01:00:00Z", group: "Group G", matchweek: 2 },
  { home_team: "Belgium", away_team: "New Zealand", match_date: "2026-06-27T23:00:00Z", group: "Group G", matchweek: 3 },
  { home_team: "Egypt", away_team: "Iran", match_date: "2026-06-27T23:00:00Z", group: "Group G", matchweek: 3 },
  // GROUP H: Spain, Cabo Verde, Saudi Arabia, Uruguay
  { home_team: "Spain", away_team: "Cabo Verde", match_date: "2026-06-15T17:00:00Z", group: "Group H", matchweek: 1 },
  { home_team: "Saudi Arabia", away_team: "Uruguay", match_date: "2026-06-15T23:00:00Z", group: "Group H", matchweek: 1 },
  { home_team: "Spain", away_team: "Saudi Arabia", match_date: "2026-06-22T20:00:00Z", group: "Group H", matchweek: 2 },
  { home_team: "Uruguay", away_team: "Cabo Verde", match_date: "2026-06-22T23:00:00Z", group: "Group H", matchweek: 2 },
  { home_team: "Spain", away_team: "Uruguay", match_date: "2026-06-27T20:00:00Z", group: "Group H", matchweek: 3 },
  { home_team: "Saudi Arabia", away_team: "Cabo Verde", match_date: "2026-06-27T20:00:00Z", group: "Group H", matchweek: 3 },
  // GROUP I: France, Senegal, Iraq, Norway
  { home_team: "France", away_team: "Senegal", match_date: "2026-06-16T19:00:00Z", group: "Group I", matchweek: 1 },
  { home_team: "Iraq", away_team: "Norway", match_date: "2026-06-16T22:00:00Z", group: "Group I", matchweek: 1 },
  { home_team: "France", away_team: "Iraq", match_date: "2026-06-23T19:00:00Z", group: "Group I", matchweek: 2 },
  { home_team: "Senegal", away_team: "Norway", match_date: "2026-06-23T22:00:00Z", group: "Group I", matchweek: 2 },
  { home_team: "France", away_team: "Norway", match_date: "2026-06-27T01:00:00Z", group: "Group I", matchweek: 3 },
  { home_team: "Senegal", away_team: "Iraq", match_date: "2026-06-27T01:00:00Z", group: "Group I", matchweek: 3 },
  // GROUP J: Argentina, Algeria, Austria, Jordan
  { home_team: "Argentina", away_team: "Algeria", match_date: "2026-06-16T19:00:00Z", group: "Group J", matchweek: 1 },
  { home_team: "Austria", away_team: "Jordan", match_date: "2026-06-16T22:00:00Z", group: "Group J", matchweek: 1 },
  { home_team: "Argentina", away_team: "Jordan", match_date: "2026-06-24T19:00:00Z", group: "Group J", matchweek: 2 },
  { home_team: "Algeria", away_team: "Austria", match_date: "2026-06-24T22:00:00Z", group: "Group J", matchweek: 2 },
  { home_team: "Argentina", away_team: "Austria", match_date: "2026-06-28T01:00:00Z", group: "Group J", matchweek: 3 },
  { home_team: "Algeria", away_team: "Jordan", match_date: "2026-06-28T01:00:00Z", group: "Group J", matchweek: 3 },
  // GROUP K: Portugal, DR Congo, Uzbekistan, Colombia
  { home_team: "Portugal", away_team: "Uzbekistan", match_date: "2026-06-17T01:00:00Z", group: "Group K", matchweek: 1 },
  { home_team: "Colombia", away_team: "DR Congo", match_date: "2026-06-17T22:00:00Z", group: "Group K", matchweek: 1 },
  { home_team: "Portugal", away_team: "DR Congo", match_date: "2026-06-24T01:00:00Z", group: "Group K", matchweek: 2 },
  { home_team: "Colombia", away_team: "Uzbekistan", match_date: "2026-06-24T22:00:00Z", group: "Group K", matchweek: 2 },
  { home_team: "Portugal", away_team: "Colombia", match_date: "2026-06-28T19:00:00Z", group: "Group K", matchweek: 3 },
  { home_team: "DR Congo", away_team: "Uzbekistan", match_date: "2026-06-28T19:00:00Z", group: "Group K", matchweek: 3 },
  // GROUP L: England, Croatia, Ghana, Panama
  { home_team: "England", away_team: "Panama", match_date: "2026-06-18T19:00:00Z", group: "Group L", matchweek: 1 },
  { home_team: "Croatia", away_team: "Ghana", match_date: "2026-06-18T22:00:00Z", group: "Group L", matchweek: 1 },
  { home_team: "England", away_team: "Croatia", match_date: "2026-06-25T01:00:00Z", group: "Group L", matchweek: 2 },
  { home_team: "Panama", away_team: "Ghana", match_date: "2026-06-25T22:00:00Z", group: "Group L", matchweek: 2 },
  { home_team: "England", away_team: "Ghana", match_date: "2026-06-28T23:00:00Z", group: "Group L", matchweek: 3 },
  { home_team: "Croatia", away_team: "Panama", match_date: "2026-06-28T23:00:00Z", group: "Group L", matchweek: 3 },
];

// Helper function to add delay between requests
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default function AdminMatches() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [matchScores, setMatchScores] = useState({});
  const [newMatch, setNewMatch] = useState({
    home_team: "",
    away_team: "",
    match_date: "",
    matchweek: 1,
    season: "2024/25",
    competition: "World Cup 2026"
  });
  const [problemFunds, setProblemFunds] = useState([]);
  const [showProblems, setShowProblems] = useState(false);
  const [cancellingFund, setCancellingFund] = useState(null);

  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editScore, setEditScore] = useState({ home: 0, away: 0 });
  const [editingDateMatchId, setEditingDateMatchId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [allUsers, setAllUsers] = useState([]);
  const [premiumUpdating, setPremiumUpdating] = useState({});

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!currentUser.is_admin) {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
      await Promise.all([loadMatches(), checkProblemFunds(), loadUsers()]);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const loadUsers = async () => {
    const users = await base44.entities.User.list();
    setAllUsers(users);
  };

  const togglePremium = async (userId, currentValue) => {
    setPremiumUpdating(prev => ({ ...prev, [userId]: true }));
    await base44.entities.User.update(userId, { is_premium: !currentValue });
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !currentValue } : u));
    setPremiumUpdating(prev => ({ ...prev, [userId]: false }));
  };

  const seedMissingMatches = async () => {
    const wcMatchesToSeed = [
      { home_team: "Argentina", away_team: "Algeria", match_date: "2026-06-16T19:00:00Z", competition: "World Cup 2026", matchweek: 1, group: "Group J", season: "2026" },
      { home_team: "Austria", away_team: "Jordan", match_date: "2026-06-16T22:00:00Z", competition: "World Cup 2026", matchweek: 1, group: "Group J", season: "2026" },
      { home_team: "Portugal", away_team: "DR Congo", match_date: "2026-06-18T01:00:00Z", competition: "World Cup 2026", matchweek: 1, group: "Group K", season: "2026" },
      { home_team: "England", away_team: "Croatia", match_date: "2026-06-18T19:00:00Z", competition: "World Cup 2026", matchweek: 1, group: "Group L", season: "2026" },
      { home_team: "Ghana", away_team: "Panama", match_date: "2026-06-18T22:00:00Z", competition: "World Cup 2026", matchweek: 1, group: "Group L", season: "2026" },
    ];
    for (const m of wcMatchesToSeed) {
      const existing = await base44.entities.Match.filter({ home_team: m.home_team, away_team: m.away_team });
      if (existing.length === 0) {
        await base44.entities.Match.create({ ...m, status: "upcoming" });
      }
    }
  };

  const loadMatches = async () => {
    await seedMissingMatches();
    const allMatches = await base44.entities.Match.list("-match_date");
    setMatches(allMatches);

    const scores = {};
    allMatches.forEach(m => {
      if (m.status === 'upcoming') {
        scores[m.id] = { home: 0, away: 0 };
      } else if (m.status === 'live' || m.status === 'finished') {
        scores[m.id] = {
          home: m.home_goals ?? 0,
          away: m.away_goals ?? 0
        };
      }
    });
    setMatchScores(scores);
  };

  const checkProblemFunds = async () => {
    try {
      const allFunds = await base44.entities.MatchFund.list();
      const allMatches = await base44.entities.Match.list();
      const problems = [];

      for (const fund of allFunds) {
        const fundProblems = [];

        // Only check funds that aren't finished/cancelled
        if (fund.status !== 'finished' && fund.status !== 'cancelled') {
          const fundMatches = await base44.entities.FundMatch.filter({ fund_id: fund.id });
          const matchIds = fundMatches.map(fm => fm.match_id);
          const fundMatchesData = allMatches.filter(m => matchIds.includes(m.id));

          if (fundMatchesData.length > 0 && fundMatchesData.every(m => m.status === 'finished')) {
            fundProblems.push("All matches finished but fund not closed");
          }
        }

        // Only check participant count for OPEN funds
        if (fund.status === 'open') {
          const participations = await base44.entities.Participation.filter({ fund_id: fund.id });
          const activeParticipants = participations.filter(p => p.status === 'active' || p.status === 'pending');

          if (activeParticipants.length < (fund.min_participants || 2)) {
            fundProblems.push(`Only ${activeParticipants.length} participants (min: ${fund.min_participants || 2})`);
          }
        }

        // Only check start date for OPEN funds (not closed/in_progress)
        if (fund.status === 'open' && fund.first_match_starts_at) {
          const startDate = new Date(fund.first_match_starts_at);
          const now = new Date();

          if (startDate < now) {
            fundProblems.push("Start date passed but fund still open");
          }
        }

        if (fundProblems.length > 0) {
          problems.push({
            fund,
            problems: fundProblems
          });
        }
      }

      setProblemFunds(problems);
    } catch (error) {
      console.error("Error checking problem funds:", error);
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const addMatch = async () => {
    if (!newMatch.home_team || !newMatch.away_team || !newMatch.match_date) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    if (newMatch.home_team === newMatch.away_team) {
      showNotification("Home and away teams must be different", "error");
      return;
    }

    try {
      await base44.entities.Match.create({
        ...newMatch,
        status: "upcoming"
      });

      setNewMatch({
        home_team: "",
        away_team: "",
        match_date: "",
        matchweek: newMatch.matchweek + 1,
        season: newMatch.competition === "World Cup 2026" ? "2026" : "2024/25",
        competition: newMatch.competition
      });

      await loadMatches();
      showNotification("Match added successfully!");
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    }
  };

  const startMatch = async (matchId) => {
    if (!confirm("Start this match? This will lock all predictions and close open funds.")) return;

    setIsCalculating(true);
    try {
      console.log("=== STARTING MATCH ===", matchId);

      await base44.entities.Match.update(matchId, { status: "live" });
      console.log("✅ Match status → live");

      const fundMatches = await base44.entities.FundMatch.filter({ match_id: matchId });
      console.log("Found", fundMatches.length, "funds with this match");

      const allFunds = await base44.entities.MatchFund.list();
      
      for (const fm of fundMatches) {
        const fund = allFunds.find(f => f.id === fm.fund_id);
        
        if (!fund) {
          console.warn(`⚠️ Fund ${fm.fund_id.slice(0, 8)} not found, skipping (orphaned FundMatch)`);
          continue;
        }

        if (fund && fund.status === 'open') {
          const fundMatchRecords = await base44.entities.FundMatch.filter({ fund_id: fund.id }, "position");
          const firstFundMatch = fundMatchRecords[0];
          
          if (firstFundMatch && firstFundMatch.match_id === matchId) {
            console.log(`🔒 Auto-closing fund "${fund.title}" - first match started`);
            await base44.entities.MatchFund.update(fund.id, { status: 'closed' });
          }
        }
      }

      showNotification("✅ Match started! Predictions locked & funds closed.");
      await loadMatches();
      await checkProblemFunds();
    } catch (error) {
      console.error("Error starting match:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const calculateFundPredictions = async (fundId, matchId, outcome, actualScore) => {
    console.log("=== CALCULATING PREDICTIONS (CREDIT SYSTEM) ===");
    console.log("Match:", matchId);
    console.log("Outcome:", outcome, typeof outcome);
    console.log("Actual Score:", actualScore);

    try {
      const participations = await base44.entities.Participation.filter({ fund_id: fundId });
      console.log("Found participations:", participations.length);

      for (const participation of participations) {
        try {
          const predictions = await base44.entities.Prediction.filter({
            participation_id: participation.id,
            match_id: matchId
          });

          if (predictions.length === 0) {
            console.warn(`⚠️ No prediction record found for user ${participation.user_id?.slice(0, 8)} on match ${matchId} in fund ${fundId}`);
            continue;
          }

          const pred = predictions[0];
          
          let selectedOptions = pred.selected_options;
          let creditsSpent = pred.credits_spent;

          if (!Array.isArray(selectedOptions) || selectedOptions.length === 0) {
            console.warn(`⚠️ Old prediction format or empty prediction detected for user ${participation.user_id?.slice(0, 8)} on match ${matchId} in fund ${fundId}!`);
            
            if (pred.simple_prediction) {
              selectedOptions = [pred.simple_prediction];
              creditsSpent = creditsSpent ?? 1;
            } else {
              console.warn(`⚠️ No actual predictions made for user ${participation.user_id?.slice(0, 8)} on match ${matchId} in fund ${fundId}! Setting points to 0.`);
              await base44.entities.Prediction.update(pred.id, {
                points_earned: 0,
                is_correct: false,
                credits_spent: creditsSpent ?? 0,
                selected_options: []
              });
              await sleep(50);
              continue;
            }
          }
          
          if (!Array.isArray(selectedOptions)) {
            selectedOptions = [];
          }

          if (creditsSpent === undefined || creditsSpent === null) {
            creditsSpent = selectedOptions.length || 1;
          }
          
          console.log("\n--- User:", participation.user_id?.slice(0, 8));
          console.log("Selected options:", selectedOptions);
          console.log("Credits spent:", creditsSpent);
          
          // Extract match goals from actualScore
          const [homeGoals, awayGoals] = actualScore.split('-').map(Number);
          const totalGoals = homeGoals + awayGoals;
          
          let points = 0;

          // 1. Bold match (3 pts)
          const boldMatch = selectedOptions.includes(outcome);
          console.log("Bold check:", outcome, "in", selectedOptions, "=", boldMatch);
          if (boldMatch) {
            points += 3;
            console.log("  Bold match! +3 pts");
          }

          // 2. Exact score (9 pts)
          const exactOption = `exact_${actualScore}`;
          const exactMatch = selectedOptions.includes(exactOption);
          console.log("Exact check:", exactOption, "in", selectedOptions, "=", exactMatch);
          if (exactMatch) {
            points += 9; // Updated from 8 to 9
            console.log("  Exact match! +9 pts");
          }

          // 3. NEW: Over 1.5 Goals (2 pts)
          if (selectedOptions.includes('over_1_5') && totalGoals > 1.5) {
            points += 2;
            console.log("  Over 1.5 Goals! +2 pts");
          }

          // 4. NEW: Over 2.5 Goals (2 pts)
          if (selectedOptions.includes('over_2_5') && totalGoals > 2.5) {
            points += 2;
            console.log("  Over 2.5 Goals! +2 pts");
          }

          // 5. NEW: Both Teams Score (2 pts)
          if (selectedOptions.includes('btts_yes') && homeGoals > 0 && awayGoals > 0) {
            points += 2;
            console.log("  Both Teams Score! +2 pts");
          }

          // 6. Hedge fallback (1.5 pts) - only if nothing matched
          if (points === 0 && selectedOptions.length > 1) {
            const hasAnyMatch = 
              selectedOptions.includes(outcome) ||
              selectedOptions.includes(exactOption) ||
              (totalGoals > 1.5 && selectedOptions.includes('over_1_5')) ||
              (totalGoals > 2.5 && selectedOptions.includes('over_2_5')) ||
              (homeGoals > 0 && awayGoals > 0 && selectedOptions.includes('btts_yes'));
            
            console.log("Hedge check (fallback):", hasAnyMatch);
            if (hasAnyMatch) {
              points = 1.5;
              console.log("  Hedge fallback! +1.5 pts");
            }
          }

          console.log("Final points:", points);

          await base44.entities.Prediction.update(pred.id, {
            points_earned: points,
            is_correct: points > 0,
            credits_spent: creditsSpent,
            selected_options: selectedOptions
          });

          await sleep(50);

          const currentTotalPoints = (await base44.entities.Participation.get(participation.id)).total_points || 0;
          const newTotalPoints = currentTotalPoints + points;

          await base44.entities.Participation.update(participation.id, {
            total_points: newTotalPoints
          });
          
          await sleep(50);
          
          console.log("Updated participation total_points:", newTotalPoints);
        } catch (error) {
          console.error(`❌ Error calculating prediction for user ${participation.user_id?.slice(0, 8)} on match ${matchId} in fund ${fundId}:`, error);
        }
      }

      console.log("=== PREDICTIONS CALCULATED ===\n");
    } catch (error) {
      console.error("❌ Error in calculateFundPredictions for fund", fundId, ":", error);
      throw error;
    }
  };

  const finishMatch = async (matchId) => {
    setIsCalculating(true);

    try {
      const scores = matchScores[matchId];
      if (!scores || scores.home === null || scores.home === undefined || scores.home === "" || scores.away === null || scores.away === undefined || scores.away === "") {
        throw new Error("Please enter valid scores for both teams");
      }

      const homeGoals = parseInt(scores.home);
      const awayGoals = parseInt(scores.away);
      if (isNaN(homeGoals) || isNaN(awayGoals) || homeGoals < 0 || awayGoals < 0) {
        throw new Error("Please enter valid scores (0 or higher)");
      }

      console.log("=== FINISHING MATCH ===");
      console.log("Match ID:", matchId);
      console.log("Score:", homeGoals, "-", awayGoals);

      let outcome = "draw";
      if (homeGoals > awayGoals) outcome = "home_win";
      if (awayGoals > homeGoals) outcome = "away_win";
      const actualScore = `${homeGoals}-${awayGoals}`;

      await base44.entities.Match.update(matchId, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        result: outcome,
        status: "finished"
      });
      console.log("✅ Match updated with result:", outcome);

      const fundMatches = await base44.entities.FundMatch.filter({ match_id: matchId });
      console.log("Found", fundMatches.length, "funds with this match");

      // Load all funds ONCE
      const allFunds = await base44.entities.MatchFund.list();

      // Process funds ONE BY ONE with delays and existence checks
      const results = [];
      for (const fm of fundMatches) {
        try {
          // Check if fund exists BEFORE processing
          const fund = allFunds.find(f => f.id === fm.fund_id);
          if (!fund) {
            console.warn(`⚠️ Fund ${fm.fund_id.slice(0, 8)} not found, skipping (orphaned FundMatch)`);
            results.push({ status: 'fulfilled', fundId: fm.fund_id, success: false, skipped: true });
            continue;
          }

          console.log(`\n🔄 Processing fund: ${fund.title}`);
          await calculateFundPredictions(fm.fund_id, matchId, outcome, actualScore);
          
          await sleep(200); // Delay between calculating and updating status
          
          await updateFundStatusAndCalculate(fm.fund_id);
          
          await sleep(200); // Delay before next fund
          
          results.push({ status: 'fulfilled', fundId: fm.fund_id, success: true });
        } catch (error) {
          console.error(`❌ Error processing fund ${fm.fund_id?.slice(0, 8)}:`, error);
          results.push({ status: 'rejected', fundId: fm.fund_id, error: error.message });
        }
      }

      const successfulFunds = results.filter(r => r.status === 'fulfilled' && r.success).length;
      const skippedFunds = results.filter(r => r.status === 'fulfilled' && r.skipped).length;
      const failedFunds = results.filter(r => r.status === 'rejected').length;

      if (failedFunds > 0 || skippedFunds > 0) {
        showNotification(`⚠️ Match finished! ${successfulFunds} funds processed, ${skippedFunds} skipped, ${failedFunds} errors.`, failedFunds > 0 ? "error" : "info");
      } else {
        showNotification(`✅ Match finished! All ${successfulFunds} funds processed successfully.`);
      }

      await loadMatches();
      await checkProblemFunds();
    } catch (error) {
      console.error("Error finishing match:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const updateFundStatusAndCalculate = async (fundId) => {
    console.log("=== UPDATING FUND STATUS ===", fundId);
    
    try {
      // Use list() + find() instead of get() to avoid extra request
      const allFunds = await base44.entities.MatchFund.list();
      let fund = allFunds.find(f => f.id === fundId);
      
      if (!fund) {
        console.warn(`⚠️ Fund ${fundId.slice(0, 8)} not found during status update, skipping`);
        return;
      }

      if (fund.status === 'finished' || fund.status === 'cancelled') {
        console.log("⚠️ Fund already finished/cancelled");
        return;
      }

      if (fund.status === 'closed') {
        console.log("Transitioning: closed → in_progress");
        await base44.entities.MatchFund.update(fundId, { status: 'in_progress' });
        await sleep(50);
      }

      await checkAndFinishFund(fundId);
    } catch (error) {
      console.error(`❌ Error updating fund ${fundId}:`, error);
      throw error; // Re-throw to propagate failure
    }
  };

  const checkAndFinishFund = async (fundId) => {
    console.log("Checking if fund is complete:", fundId);

    // Check fund existence
    const allFunds = await base44.entities.MatchFund.list();
    const fund = allFunds.find(f => f.id === fundId);
    
    if (!fund) {
      console.warn(`⚠️ Fund ${fundId.slice(0, 8)} not found, skipping`);
      return;
    }

    const fundMatches = await base44.entities.FundMatch.filter({ fund_id: fundId });
    const allMatches = await base44.entities.Match.list();
    const matchesInFund = fundMatches.map(fm => allMatches.find(m => m.id === fm.match_id)).filter(Boolean);
    const allFinished = matchesInFund.every(m => m.status === 'finished');

    console.log(`All matches finished: ${allFinished} (${matchesInFund.filter(m => m.status === 'finished').length}/${matchesInFund.length})`);

    if (allFinished) {
      console.log("✅ All matches finished! Distributing prizes...");
      await distributePrizes(fundId);
    }
  };

  const distributePrizes = async (fundId) => {
    console.log("=== DISTRIBUTING PRIZES (RANK-BASED) ===", fundId);
    
    try {
      // Check fund existence
      const allFunds = await base44.entities.MatchFund.list();
      const fund = allFunds.find(f => f.id === fundId);
      
      if (!fund) {
        console.error("Fund not found:", fundId);
        return;
      }
      
      if (fund.status === 'finished' || fund.status === 'cancelled') {
        console.log("⚠️ Fund already finished/cancelled");
        return;
      }

      const participations = await base44.entities.Participation.filter({ fund_id: fundId });
      console.log(`Found ${participations.length} participations`);
      
      if (participations.length === 0) {
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification("Fund completed with no participants.");
        return;
      }

      // Add unused credits bonus before ranking
      const creditsPerPlayer = fund.credits_per_player || 12; // Assuming fund has this field, or default
      for (const p of participations) {
        const creditsUsed = p.credits_used ?? 0;
        const unusedCredits = Math.max(0, creditsPerPlayer - creditsUsed); // Ensure non-negative
        const unusedBonus = unusedCredits * 0.5;
        
        if (unusedBonus > 0) {
          console.log(`💡 User ${p.user_id?.slice(0, 8)}: ${unusedCredits} unused credits = +${unusedBonus}pt`);
          await base44.entities.Participation.update(p.id, {
            total_points: (p.total_points || 0) + unusedBonus
          });
          await sleep(50);
        }
      }
      
      // Re-fetch participations with updated points
      const updatedParticipations = await base44.entities.Participation.filter({ fund_id: fundId });

      const allUsers = await base44.entities.User.list();
      const activeParticipations = updatedParticipations.filter(p => p.status === 'active' || p.status === 'pending');
      const minRequired = fund.min_participants || 2;
      
      // Check minimum participants
      if (activeParticipations.length < minRequired) {
        console.log(`⚠️ Not enough participants (${activeParticipations.length}/${minRequired}), refunding all`);
        for (const p of updatedParticipations) {
          const refund = p.entry_paid || 0;
          await base44.entities.Participation.update(p.id, {
            final_payout: refund,
            status: 'refunded',
            paid_out_at: new Date().toISOString()
          });
          await sleep(50);

          const user = allUsers.find(u => u.id === p.user_id);
          if (user) {
            await base44.entities.User.update(user.id, {
              total_balance: (user.total_balance || 0) + refund
            });
            await sleep(50);
          }
        }

        await base44.entities.MatchFund.update(fundId, { status: 'cancelled' });
        showNotification("Fund cancelled - not enough participants. 100% refunded.", "info");
        return;
      }

      const totalPool = fund.total_pool || 0;
      const platformFee = Math.floor(totalPool * (fund.platform_fee_percent || 7) / 100);
      const creatorBonus = Math.floor(totalPool * (fund.creator_bonus_percent || 1) / 100);
      const prizePool = totalPool - platformFee - creatorBonus;

      console.log(`💰 Total: ${totalPool}, Platform: ${platformFee}, Creator: ${creatorBonus}, Prize: ${prizePool}`);

      if (prizePool <= 0) {
        console.log("⚠️ Prize pool is 0 or negative, marking all as losers");
        for (const p of updatedParticipations) {
          await base44.entities.Participation.update(p.id, {
            status: 'loser',
            final_payout: 0
          });
          await sleep(50);
        }
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification(`Fund completed. No prize pool left after fees.`, "info");
        return;
      }

      const ranked = [...activeParticipations].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
      const count = ranked.length;
      
      console.log(`\n=== PRIZE DISTRIBUTION (${count} participants) ===`);
      
      // Edge case: 1 participant (refund)
      if (count === 1) {
        console.log("⚠️ Only 1 participant, refunding entry fee");
        const p = ranked[0];
        const refund = p.entry_paid || 0;
        
        await base44.entities.Participation.update(p.id, {
          final_payout: refund,
          final_rank: 1,
          status: 'refunded',
          paid_out_at: new Date().toISOString()
        });
        await sleep(50);
        
        const user = allUsers.find(u => u.id === p.user_id);
        if (user) {
          await base44.entities.User.update(user.id, {
            total_balance: (user.total_balance || 0) + refund
          });
          await sleep(50);
        }
        
        // Pay creator bonus
        const creatorParticipation = updatedParticipations.find(p => p.is_creator);
        if (creatorParticipation && creatorBonus > 0) {
          await base44.entities.Participation.update(creatorParticipation.id, {
            creator_bonus: creatorBonus
          });
          await sleep(50);
          const creator = allUsers.find(u => u.id === creatorParticipation.user_id);
          if (creator) {
            await base44.entities.User.update(creator.id, {
              total_balance: (creator.total_balance || 0) + creatorBonus
            });
            await sleep(50);
          }
        }
        
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification("Fund completed with 1 participant. Entry fee refunded.");
        return;
      }
      
      // Edge case: 2 participants (60/40)
      if (count === 2) {
        console.log("🎯 2 participants: 60/40 split");
        const prizes = [
          Math.floor(prizePool * 0.60), // 1st: 60%
          Math.floor(prizePool * 0.40)  // 2nd: 40%
        ];
        
        for (let i = 0; i < 2; i++) {
          const p = ranked[i];
          const prize = prizes[i];
          
          console.log(`Rank ${i + 1}: ${p.user_id?.slice(0, 8)} → $${prize} (${p.total_points || 0} pts)`);
          
          await base44.entities.Participation.update(p.id, {
            final_payout: prize,
            final_rank: i + 1,
            status: 'winner',
            paid_out_at: new Date().toISOString()
          });
          await sleep(50);
          
          const user = allUsers.find(u => u.id === p.user_id);
          if (user) {
            await base44.entities.User.update(user.id, {
              total_balance: (user.total_balance || 0) + prize,
              total_winnings: (user.total_winnings || 0) + prize,
              total_wins: (user.total_wins || 0) + 1
            });
            await sleep(50);
          }
        }
        
        // Pay creator bonus
        const creatorParticipation = updatedParticipations.find(p => p.is_creator);
        if (creatorParticipation && creatorBonus > 0) {
          await base44.entities.Participation.update(creatorParticipation.id, {
            creator_bonus: creatorBonus
          });
          await sleep(50);
          const creator = allUsers.find(u => u.id === creatorParticipation.user_id);
          if (creator) {
            await base44.entities.User.update(creator.id, {
              total_balance: (creator.total_balance || 0) + creatorBonus
            });
            await sleep(50);
          }
        }
        
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification(`✅ Fund completed! Prizes: 60/40 split`);
        return;
      }
      
      // Edge case: 3 participants (50/30/20)
      if (count === 3) {
        console.log("🎯 3 participants: 50/30/20 split");
        const prizes = [
          Math.floor(prizePool * 0.50), // 1st: 50%
          Math.floor(prizePool * 0.30), // 2nd: 30%
          Math.floor(prizePool * 0.20)  // 3rd: 20%
        ];
        
        for (let i = 0; i < 3; i++) {
          const p = ranked[i];
          const prize = prizes[i];
          
          console.log(`Rank ${i + 1}: ${p.user_id?.slice(0, 8)} → $${prize} (${p.total_points || 0} pts)`);
          
          await base44.entities.Participation.update(p.id, {
            final_payout: prize,
            final_rank: i + 1,
            status: 'winner',
            paid_out_at: new Date().toISOString()
          });
          await sleep(50);
          
          const user = allUsers.find(u => u.id === p.user_id);
          if (user) {
            await base44.entities.User.update(user.id, {
              total_balance: (user.total_balance || 0) + prize,
              total_winnings: (user.total_winnings || 0) + prize,
              total_wins: (user.total_wins || 0) + 1
            });
            await sleep(50);
          }
        }
        
        // Pay creator bonus
        const creatorParticipation = updatedParticipations.find(p => p.is_creator);
        if (creatorParticipation && creatorBonus > 0) {
          await base44.entities.Participation.update(creatorParticipation.id, {
            creator_bonus: creatorBonus
          });
          await sleep(50);
          const creator = allUsers.find(u => u.id === creatorParticipation.user_id);
          if (creator) {
            await base44.entities.User.update(creator.id, {
              total_balance: (creator.total_balance || 0) + creatorBonus
            });
            await sleep(50);
          }
        }
        
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification(`✅ Fund completed! Prizes: 50/30/20 split`);
        return;
      }
      
      // 4-9 participants
      if (count >= 4 && count <= 9) {
        console.log(`🎯 ${count} participants: 40/25/15 + rest split`);
        
        const prizes = {
          1: Math.floor(prizePool * 0.40),
          2: Math.floor(prizePool * 0.25),
          3: Math.floor(prizePool * 0.15),
          rest: Math.floor(prizePool * 0.20)
        };
        
        const restCount = count - 3;
        const prizePerRest = restCount > 0 ? Math.floor(prizes.rest / restCount) : 0;
        
        console.log("Prize distribution:", {...prizes, prizePerRest});
        
        for (let i = 0; i < count; i++) {
          const p = ranked[i];
          let prize = 0;
          let rank = i + 1;

          if (rank === 1) prize = prizes[1];
          else if (rank === 2) prize = prizes[2];
          else if (rank === 3) prize = prizes[3];
          else prize = prizePerRest;

          console.log(`Rank ${rank}: ${p.user_id?.slice(0, 8)} → $${prize} (${p.total_points || 0} pts)`);

          await base44.entities.Participation.update(p.id, {
            final_payout: prize,
            final_rank: rank,
            status: prize > 0 ? 'winner' : 'loser',
            paid_out_at: new Date().toISOString()
          });
          await sleep(50);

          if (prize > 0) {
            const user = allUsers.find(u => u.id === p.user_id);
            if (user) {
              await base44.entities.User.update(user.id, {
                total_balance: (user.total_balance || 0) + prize,
                total_winnings: (user.total_winnings || 0) + prize,
                total_wins: (user.total_wins || 0) + 1
              });
              await sleep(50);
            }
          }
        }
        
        // Pay creator bonus
        const creatorParticipation = updatedParticipations.find(p => p.is_creator);
        if (creatorParticipation && creatorBonus > 0) {
          await base44.entities.Participation.update(creatorParticipation.id, {
            creator_bonus: creatorBonus
          });
          await sleep(50);
          const creator = allUsers.find(u => u.id === creatorParticipation.user_id);
          if (creator) {
            await base44.entities.User.update(creator.id, {
              total_balance: (creator.total_balance || 0) + creatorBonus
            });
            await sleep(50);
          }
        }
        
        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        showNotification(`✅ Fund completed! Prizes distributed to ${count} players!`);
        return;
      }
      
      // 10+ participants (standard)
      if (count >= 10) {
        console.log(`🎯 ${count} participants: Standard distribution (top 10)`);
      
        const prizes = {
          1: Math.floor(prizePool * 0.40),
          2: Math.floor(prizePool * 0.25),
          3: Math.floor(prizePool * 0.15),
          rest: Math.floor(prizePool * 0.20)
        };

        const top10Count = Math.min(10, count) - 3;
        const prizePerRest = top10Count > 0 ? Math.floor(prizes.rest / top10Count) : 0;

        for (let i = 0; i < count; i++) {
          const p = ranked[i];
          let prize = 0;
          let rank = i + 1;

          if (rank === 1) prize = prizes[1];
          else if (rank === 2) prize = prizes[2];
          else if (rank === 3) prize = prizes[3];
          else if (rank <= 10) prize = prizePerRest;
          else prize = 0;

          console.log(`Rank ${rank}: ${p.user_id?.slice(0, 8)} → $${prize} (${p.total_points || 0} pts)`);

          await base44.entities.Participation.update(p.id, {
            final_payout: prize,
            final_rank: rank,
            status: prize > 0 ? 'winner' : 'loser',
            paid_out_at: new Date().toISOString()
          });
          await sleep(50);

          if (prize > 0) {
            const user = allUsers.find(u => u.id === p.user_id);
            if (user) {
              await base44.entities.User.update(user.id, {
                total_balance: (user.total_balance || 0) + prize,
                total_winnings: (user.total_winnings || 0) + prize,
                total_wins: (user.total_wins || 0) + 1
              });
              await sleep(50);
            }
          }
        }

        const creatorParticipation = updatedParticipations.find(p => p.is_creator);
        if (creatorParticipation && creatorBonus > 0) {
          console.log(`\n🎁 Processing creator bonus: $${creatorBonus}`);
          await base44.entities.Participation.update(creatorParticipation.id, {
            creator_bonus: creatorBonus
          });
          await sleep(50);

          const creator = allUsers.find(u => u.id === creatorParticipation.user_id);
          if (creator) {
            await base44.entities.User.update(creator.id, {
              total_balance: (creator.total_balance || 0) + creatorBonus
            });
            await sleep(50);
            console.log(`✅ Creator bonus paid!`);
          }
        }

        await base44.entities.MatchFund.update(fundId, { status: 'finished' });
        console.log("✅ PRIZES DISTRIBUTED");

        showNotification(`✅ Fund completed! Prizes distributed!`);
        return;
      }
    } catch (error) {
      console.error("❌ ERROR in distributePrizes:", error);
      showNotification(`Error: ${error.message}`, "error");
      throw error;
    }
  };

  const deleteMatch = async (matchId) => {
    if (!confirm("Are you sure you want to delete this match?")) return;

    try {
      await base44.entities.Match.delete(matchId);
      await loadMatches();
      showNotification("Match deleted successfully!");
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    }
  };

  const forceCalculateAllFunds = async () => {
    if (!confirm("Force calculate results for ALL funds? This will check all funds with finished matches.")) return;

    setIsCalculating(true);
    try {
      const allFunds = await base44.entities.MatchFund.list();
      const fundsToProcess = allFunds.filter(f => f.status === 'open' || f.status === 'in_progress' || f.status === 'closed');

      console.log(`Checking ${fundsToProcess.length} funds...`);

      const results = [];
      for (const fund of fundsToProcess) {
        try {
          await checkAndFinishFund(fund.id);
          results.push({ status: 'fulfilled', fundId: fund.id, success: true });
          await sleep(200); // Add a small delay between processing funds
        } catch (error) {
          console.error(`❌ Error force processing fund ${fund.id}:`, error);
          results.push({ status: 'rejected', fundId: fund.id, error: error.message });
        }
      }
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.success).length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        showNotification(`⚠️ Force calculation complete! ${successful} funds processed, ${failed} had errors. Check console.`, "error");
      } else {
        showNotification(`✅ Force calculation complete! All ${successful} funds processed successfully.`);
      }

      await checkProblemFunds();
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const loadTestMatches = async () => {
    if (!confirm("Load test matches? This will add a predefined set of matches to the database.")) return;
    
    setIsCalculating(true);
    try {
      const today = new Date();
      const nextDay = new Date(today);
      nextDay.setDate(today.getDate() + 1);
      nextDay.setHours(20, 0, 0, 0);

      const matchesToCreate = [
        {
          home_team: "Manchester United",
          away_team: "Liverpool",
          match_date: new Date(nextDay.getTime() + 1 * 60 * 60 * 1000).toISOString().slice(0, -8),
          matchweek: 1,
          season: "2024/25",
          competition: "Premier League"
        },
        {
          home_team: "Real Madrid",
          away_team: "Barcelona",
          match_date: new Date(nextDay.getTime() + 2 * 60 * 60 * 1000).toISOString().slice(0, -8),
          matchweek: 1,
          season: "2024/25",
          competition: "La Liga"
        },
        {
          home_team: "Chelsea",
          away_team: "Arsenal",
          match_date: new Date(nextDay.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, -8),
          matchweek: 2,
          season: "2024/25",
          competition: "Premier League"
        }
      ];

      for (const match of matchesToCreate) {
        await base44.entities.Match.create({ ...match, status: "upcoming" });
      }

      await loadMatches();
      showNotification("✅ Test matches loaded successfully!");
    } catch (error) {
      console.error("Error loading test matches:", error);
      showNotification(`Error loading test matches: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const seedWCMatches = async () => {
    if (!confirm(`This will DELETE all existing "World Cup 2026" matches and re-seed all ${WC_FIXTURES.length} group stage fixtures. Continue?`)) return;
    setIsCalculating(true);
    try {
      // Delete all existing WC 2026 matches first
      const existing = await base44.entities.Match.filter({ competition: "World Cup 2026" });
      for (const m of existing) {
        await base44.entities.Match.delete(m.id);
        await sleep(60);
      }
      // Insert correct fixtures
      for (const fixture of WC_FIXTURES) {
        await base44.entities.Match.create({
          ...fixture,
          season: "2026",
          competition: "World Cup 2026",
          status: "upcoming"
        });
        await sleep(80);
      }
      await loadMatches();
      showNotification(`✅ Deleted ${existing.length} old matches, seeded ${WC_FIXTURES.length} WC 2026 group stage matches!`);
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  const cancelFund = async (fundId) => {
    if (!confirm("Cancel this fund? All participants will receive 100% refund.")) return;
    
    setCancellingFund(fundId);
    try {
      console.log("=== CANCELLING FUND ===", fundId);
      
      const fund = await base44.entities.MatchFund.get(fundId);
      
      if (!fund) {
        throw new Error("Fund not found");
      }
      
      if (fund.status === 'finished' || fund.status === 'cancelled') {
        throw new Error("Fund already finished or cancelled");
      }
      
      const participations = await base44.entities.Participation.filter({ fund_id: fundId });
      console.log(`Found ${participations.length} participants to refund`);
      
      const allUsers = await base44.entities.User.list();
      
      for (const p of participations) {
        const refund = p.entry_paid || 0;
        
        await base44.entities.Participation.update(p.id, {
          final_payout: refund,
          status: 'refunded',
          paid_out_at: new Date().toISOString()
        });
        await sleep(50);
        
        const user = allUsers.find(u => u.id === p.user_id);
        if (user) {
          console.log(`💰 Refunding ${user.username || user.email}: +${refund} points`);
          await base44.entities.User.update(user.id, {
            total_balance: (user.total_balance || 0) + refund
          });
          await sleep(50);
        }
      }
      
      await base44.entities.MatchFund.update(fundId, { status: 'cancelled' });
      
      showNotification(`✅ Fund cancelled! ${participations.length} participants refunded 100%`);
      await checkProblemFunds();
    } catch (error) {
      console.error("Error cancelling fund:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setCancellingFund(null);
    }
  };

  const openEditScore = (match) => {
    setEditingMatchId(match.id);
    setEditScore({
      home: match.home_goals ?? 0,
      away: match.away_goals ?? 0
    });
  };

  const openEditDate = (match) => {
    setEditingDateMatchId(match.id);
    // Convert UTC date to local datetime-local format
    const d = new Date(match.match_date);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditDate(local);
  };

  const saveEditedDate = async () => {
    if (!editingDateMatchId || !editDate) return;
    try {
      await base44.entities.Match.update(editingDateMatchId, {
        match_date: new Date(editDate).toISOString()
      });
      setEditingDateMatchId(null);
      await loadMatches();
      showNotification("✅ Match date updated!");
    } catch (error) {
      showNotification(`Error: ${error.message}`, "error");
    }
  };

  const saveEditedScore = async () => {
    if (!editingMatchId) return;
    
    setIsCalculating(true);
    try {
      const homeGoals = parseInt(editScore.home);
      const awayGoals = parseInt(editScore.away);
      
      if (isNaN(homeGoals) || isNaN(awayGoals) || homeGoals < 0 || awayGoals < 0) {
        showNotification("Invalid scores", "error");
        setIsCalculating(false);
        return;
      }
      
      let outcome = "draw";
      if (homeGoals > awayGoals) outcome = "home_win";
      if (awayGoals > homeGoals) outcome = "away_win";
      const actualScore = `${homeGoals}-${awayGoals}`;
      
      console.log("=== EDITING MATCH SCORE ===", editingMatchId);
      console.log("New score:", actualScore, "Outcome:", outcome);
      
      // Update match
      await base44.entities.Match.update(editingMatchId, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        result: outcome
      });
      await sleep(100);
      
      // AUTO-RECALCULATE affected funds
      const fundMatches = await base44.entities.FundMatch.filter({ match_id: editingMatchId });
      console.log("Found", fundMatches.length, "funds to recalculate");
      
      const allFunds = await base44.entities.MatchFund.list();
      let successCount = 0;
      let skipCount = 0;
      
      for (const fm of fundMatches) {
        try {
          const fund = allFunds.find(f => f.id === fm.fund_id);
          
          if (!fund) {
            console.warn(`⚠️ Fund ${fm.fund_id.slice(0, 8)} not found, skipping`);
            skipCount++;
            continue;
          }

          if (fund.status === 'cancelled') {
            console.log(`⚠️ Fund ${fund.title} is cancelled, skipping recalculation.`);
            skipCount++;
            continue;
          }
          
          console.log(`♻️ Recalculating fund: ${fund.title}`);
          
          // Reset participations for this fund with delays
          const participations = await base44.entities.Participation.filter({ fund_id: fm.fund_id });
          console.log(`Resetting ${participations.length} participations...`);
          
          for (const p of participations) {
            await base44.entities.Participation.update(p.id, { total_points: 0 });
            await sleep(100); // Increased delay after each reset
          }
          
          await sleep(200); // Extra delay after all resets
          
          // Recalculate ALL finished matches in this fund with delays
          const allFundMatches = await base44.entities.FundMatch.filter({ fund_id: fm.fund_id });
          const allSystemMatches = await base44.entities.Match.list();
          
          for (const fundMatch of allFundMatches) {
            const m = allSystemMatches.find(x => x.id === fundMatch.match_id);
            if (m && m.status === 'finished') {
              const o = m.result;
              const s = `${m.home_goals}-${m.away_goals}`;
              
              console.log(`Recalculating match: ${m.home_team} vs ${m.away_team} (${s})`);
              await calculateFundPredictions(fm.fund_id, m.id, o, s);
              await sleep(300); // Increased delay between match calculations
            }
          }
          
          await sleep(200); // Delay before checking if fund should finish
          
          // Check if fund should be finished
          await checkAndFinishFund(fm.fund_id);
          await sleep(300); // Increased delay after finishing fund status
          
          successCount++;
        } catch (error) {
          console.error(`Error recalculating fund ${fm.fund_id?.slice(0, 8)}:`, error);
          skipCount++;
        }
      }
      
      setEditingMatchId(null);
      
      if (skipCount > 0) {
        showNotification(`✅ Score updated & ${successCount} funds recalculated! ${skipCount} skipped.`, "info");
      } else {
        showNotification(`✅ Score updated! ${successCount} funds recalculated automatically.`);
      }
      
      await loadMatches();
      await checkProblemFunds();
    } catch (error) {
      console.error("Error editing score:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCalculating(false);
    }
  };

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {notification && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            notification.type === "success"
              ? "bg-green-500/20 border border-green-500/30 text-green-400"
              : "bg-red-500/20 border border-red-500/30 text-red-400"
          }`}>
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{notification.message}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Manage Matches</h1>
          <div className="flex gap-3">
            {problemFunds.length > 0 && (
              <Button
                onClick={() => setShowProblems(!showProblems)}
                variant="outline"
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Problem Funds ({problemFunds.length})
              </Button>
            )}
            <Button
              onClick={seedWCMatches}
              disabled={isCalculating}
              className="bg-green-700 hover:bg-green-800 flex items-center gap-2"
            >
              {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <>🌍 Seed WC 2026 Matches</>}
            </Button>
            <Button
              onClick={loadTestMatches}
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Load Test Matches
                </>
              )}
            </Button>
            <Button
              onClick={forceCalculateAllFunds}
              disabled={isCalculating}
              className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Force Calculate All Funds
                </>
              )}
            </Button>
          </div>
        </div>

        {showProblems && problemFunds.length > 0 && (
          <Card className="mb-6 border-yellow-500/30 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-yellow-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Problem Funds ({problemFunds.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {problemFunds.map(({ fund, problems }) => (
                  <div
                    key={fund.id}
                    className="p-4 rounded-lg bg-white/5 border border-yellow-500/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-white font-semibold">{fund.title}</h3>
                        <p className="text-sm text-gray-400">
                          Status: {fund.status} • ID: {fund.id?.slice(0, 8)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/dashboard/data/MatchFund/${fund.id}`, '_blank')}
                          className="text-yellow-400 hover:text-yellow-300"
                        >
                          Edit →
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelFund(fund.id)}
                          disabled={cancellingFund === fund.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {cancellingFund === fund.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Cancel Fund"
                          )}
                        </Button>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {problems.map((problem, idx) => (
                        <li key={idx} className="text-sm text-yellow-300 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full" />
                          {problem}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Date Modal */}
        {editingDateMatchId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="border-gray-800 bg-[#0F1E35] p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Edit Match Date & Time</h3>
              <Input
                type="datetime-local"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-white/5 border-gray-700 text-white mb-6"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditingDateMatchId(null)} className="flex-1 border-gray-700">
                  Cancel
                </Button>
                <Button onClick={saveEditedDate} className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Save Date
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Simple Edit Modal */}
        {editingMatchId && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="border-gray-800 bg-[#0F1E35] p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Edit Match Score</h3>
              <div className="flex items-center justify-center gap-3 mb-6">
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={editScore.home}
                  onChange={(e) => setEditScore({ ...editScore, home: e.target.value })}
                  className="w-20 text-center bg-white/5 border-gray-700 text-white font-bold text-2xl"
                />
                <span className="text-gray-500 font-bold text-2xl">-</span>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={editScore.away}
                  onChange={(e) => setEditScore({ ...editScore, away: e.target.value })}
                  className="w-20 text-center bg-white/5 border-gray-700 text-white font-bold text-2xl"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingMatchId(null)}
                  className="flex-1 border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveEditedScore}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save & Recalculate"
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                This will automatically recalculate all affected funds.
              </p>
            </Card>
          </div>
        )}

        <Card className="mb-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <CardHeader>
            <CardTitle className="text-white">Add New Match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Competition</label>
                <Select
                  value={newMatch.competition}
                  onValueChange={(value) => setNewMatch({ ...newMatch, competition: value, home_team: "", away_team: "" })}
                >
                  <SelectTrigger className="bg-white/5 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPETITIONS.map((comp) => (
                      <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Home Team</label>
                <Select
                  value={newMatch.home_team}
                  onValueChange={(value) => setNewMatch({ ...newMatch, home_team: value })}
                >
                  <SelectTrigger className="bg-white/5 border-gray-700 text-white">
                    <SelectValue placeholder="Select home team" />
                  </SelectTrigger>
                  <SelectContent>
                    {(TEAMS[newMatch.competition] || TEAMS["Premier League"]).map((team) => (
                      <SelectItem key={team} value={team} disabled={team === newMatch.away_team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Away Team</label>
                <Select
                  value={newMatch.away_team}
                  onValueChange={(value) => setNewMatch({ ...newMatch, away_team: value })}
                >
                  <SelectTrigger className="bg-white/5 border-gray-700 text-white">
                    <SelectValue placeholder="Select away team" />
                  </SelectTrigger>
                  <SelectContent>
                    {(TEAMS[newMatch.competition] || TEAMS["Premier League"]).map((team) => (
                      <SelectItem key={team} value={team} disabled={team === newMatch.home_team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Match Date & Time</label>
                <Input
                  type="datetime-local"
                  value={newMatch.match_date}
                  onChange={(e) => setNewMatch({ ...newMatch, match_date: e.target.value })}
                  className="bg-white/5 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Matchweek</label>
                <Input
                  type="number"
                  min="1"
                  value={newMatch.matchweek}
                  onChange={(e) => setNewMatch({ ...newMatch, matchweek: parseInt(e.target.value) || 1 })}
                  className="bg-white/5 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Season</label>
                <Input
                  value={newMatch.season}
                  onChange={(e) => setNewMatch({ ...newMatch, season: e.target.value })}
                  className="bg-white/5 border-gray-700 text-white"
                />
              </div>
            </div>

            <Button
              onClick={addMatch}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Match
            </Button>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>All Matches ({matches.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const sevenDaysAgo = new Date();
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
              const activeMatches = matches.filter(m => !(m.status === 'finished' && new Date(m.match_date) < sevenDaysAgo));
              const archivedMatches = matches.filter(m => m.status === 'finished' && new Date(m.match_date) < sevenDaysAgo);
              const visibleMatches = showArchived ? matches : activeMatches;
              return (
                <>
                  {archivedMatches.length > 0 && (
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm text-gray-400">{archivedMatches.length} finished match{archivedMatches.length !== 1 ? 'es' : ''} older than 7 days archived</span>
                      <button
                        onClick={() => setShowArchived(v => !v)}
                        className="text-sm text-orange-400 hover:text-orange-300 underline"
                      >
                        {showArchived ? "Hide archived" : "Show archived"}
                      </button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {visibleMatches.map((match) => {
                      const isArchived = match.status === 'finished' && new Date(match.match_date) < sevenDaysAgo;
                      return (
                <div
                  key={match.id}
                  className={`flex flex-col gap-3 p-4 rounded-lg border ${isArchived ? "bg-white/2 border-gray-800 opacity-60" : "bg-white/5 border-gray-700"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-white font-semibold">
                        GW{match.matchweek}: {match.home_team} vs {match.away_team}
                      </p>
                      <p className="text-sm text-gray-400">
                        {match.competition} • {new Date(match.match_date).toLocaleString("en-US")}
                      </p>
                      {match.status === "live" && (
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-red-400 text-sm font-semibold">LIVE - Predictions Locked</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {(match.status === "upcoming" || match.status === "live") && (
                        <>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            placeholder="H"
                            value={matchScores[match.id]?.home ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : parseInt(e.target.value);
                              setMatchScores({
                                ...matchScores,
                                [match.id]: {
                                  ...matchScores[match.id],
                                  home: val === "" ? "" : Math.max(0, Math.min(20, val))
                                }
                              });
                            }}
                            className="w-16 bg-white/5 border-gray-700 text-white text-center font-bold"
                          />
                          <span className="text-gray-500 font-bold">:</span>
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            placeholder="A"
                            value={matchScores[match.id]?.away ?? ""}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : parseInt(e.target.value);
                              setMatchScores({
                                ...matchScores,
                                [match.id]: {
                                  ...matchScores[match.id],
                                  away: val === "" ? "" : Math.max(0, Math.min(20, val))
                                }
                              });
                            }}
                            className="w-16 bg-white/5 border-gray-700 text-white text-center font-bold"
                          />
                          <Button
                            size="sm"
                            onClick={() => finishMatch(match.id)}
                            disabled={isCalculating}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isCalculating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark Finished
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {match.status === "finished" && (
                        <>
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-bold">{match.home_goals} - {match.away_goals}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditScore(match)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </>
                      )}

                      {match.status === "upcoming" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDate(match)}
                          className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                          title="Edit date/time"
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMatch(match.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                    );
                    })}
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Premium Accounts Section */}
        <Card className="mt-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              👑 Premium Accounts
            </CardTitle>
            <p className="text-sm text-gray-400 mt-1">Premium users can give up to 3 Respects total.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-gray-700">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold truncate">{u.username || u.full_name || "—"}</span>
                      {u.is_premium && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold">Premium ✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-gray-400 truncate">{u.email}</span>
                      {(u.respect_points || 0) > 0 && (
                        <span className="text-xs text-yellow-400">💎 {u.respect_points} pts</span>
                      )}
                      {(u.show_respects_received || 0) > 0 && (
                        <span className="text-xs text-pink-400">❤️ {u.show_respects_received} received</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {u.is_premium ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={premiumUpdating[u.id]}
                        onClick={() => togglePremium(u.id, true)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        {premiumUpdating[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Revoke"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={premiumUpdating[u.id]}
                        onClick={() => togglePremium(u.id, false)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {premiumUpdating[u.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Grant Premium"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {allUsers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No users found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}