import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Users, Clock, Target, Loader2, AlertCircle, CheckCircle, RefreshCw, Lock, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import OrderBook from "@/components/OrderBook";
import PlayersPredictions from "@/components/PlayersPredictions";
import { formatOption, badgeClass } from "@/lib/predictionUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Mutual exclusivity groups
const MUTEX_GROUPS = [
  ['both_score_yes', 'both_score_no'],
  ['goals_over', 'goals_under'],
  ['blowout_yes', 'blowout_no'],
];

// Conflict rules: if A is selected, B cannot be selected
const CONFLICTS = [
  ['both_score_yes', 'clean_sheet_home'],
  ['both_score_yes', 'clean_sheet_away'],
  ['draw', 'clean_sheet_home'],
  ['draw', 'clean_sheet_away'],
];

export default function FundDetails() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const fundId = urlParams.get("id");

  const [fund, setFund] = useState(null);
  const [matches, setMatches] = useState([]);
  const [user, setUser] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [myPredictions, setMyPredictions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [hasJoined, setHasJoined] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showExactScore, setShowExactScore] = useState({});
  const [exactScores, setExactScores] = useState({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [orderBookParticipant, setOrderBookParticipant] = useState(null);
  const [shareListings, setShareListings] = useState([]);
  const [otherPredictionsMap, setOtherPredictionsMap] = useState({});
  const [myParticipation, setMyParticipation] = useState(null);
  const [editingMatchId, setEditingMatchId] = useState(null);
  const [editPicks, setEditPicks] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!fundId) {
      setError("No fund ID provided");
      setIsLoading(false);
      return;
    }
    loadData();
  }, [fundId]);

  useEffect(() => {
    if (!fund || fund.status !== 'in_progress') return;
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [fund?.status]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const fundResults = await base44.entities.MatchFund.filter({ id: fundId });
      const selectedFund = fundResults[0];
      
      if (!selectedFund) {
        setError(`Fund not found`);
        setIsLoading(false);
        return;
      }
      
      setFund(selectedFund);

      const fundMatches = await base44.entities.FundMatch.filter({ fund_id: fundId }, "position");
      const matchIds = fundMatches.map(fm => fm.match_id);
      
      const matchesData = [];
      await Promise.all(matchIds.map(async (matchId) => {
        const results = await base44.entities.Match.filter({ id: matchId });
        if (results[0]) matchesData.push(results[0]);
      }));
      // Restore original order
      matchesData.sort((a, b) => matchIds.indexOf(a.id) - matchIds.indexOf(b.id));
      
      setMatches(matchesData);

      const allParticipations = await base44.entities.Participation.filter({ fund_id: fundId }, "-total_points");
      setParticipants(allParticipations);

      // Load share listings only (no User.list() — display names come from participation fields)
      const listings = await base44.entities.ShareListing.filter({ fund_id: fundId });
      setShareListings(listings.filter(l => l.status === "active"));

      const foundMyParticipation = allParticipations.find(p => p.user_id === currentUser.id);
      setMyParticipation(foundMyParticipation || null);
      setHasJoined(!!foundMyParticipation);
      
      // Auto-verify password for creator or already joined
      if (foundMyParticipation || selectedFund.visibility !== "private") {
        setPasswordVerified(true);
      }
      // Show password modal immediately for private funds the user hasn't joined
      if (selectedFund.visibility === "private" && !foundMyParticipation) {
        setShowPasswordModal(true);
      }

      if (foundMyParticipation) {
        const allPredictions = await base44.entities.Prediction.filter({ participation_id: foundMyParticipation.id });
        setMyPredictions(allPredictions);

        // Load other participants' predictions only if current user has submitted
        if (foundMyParticipation.predictions_completed_at) {
          const others = allParticipations.filter(p => p.user_id !== currentUser.id);
          const map = {};
          await Promise.all(others.map(async (p) => {
            if (p.predictions_completed_at) {
              const preds = await base44.entities.Prediction.filter({ participation_id: p.id });
              map[p.id] = preds;
            } else {
              map[p.id] = null;
            }
          }));
          setOtherPredictionsMap(map);
        }
      } else {
        const initialPredictions = {};
        matchesData.forEach((match) => {
          initialPredictions[match.id] = [];
        });
        setPredictions(initialPredictions);
      }
    } catch (error) {
      setError(error.message || "Failed to load fund details");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePredictionChange = (matchId, option) => {
    setPredictions(prev => {
      const current = prev[matchId] || [];
      const isSelected = current.includes(option);

      if (isSelected) {
        // Deselect
        return { ...prev, [matchId]: current.filter(o => o !== option) };
      }

      // Remove mutex partners
      let updated = [...current];
      for (const group of MUTEX_GROUPS) {
        if (group.includes(option)) {
          updated = updated.filter(o => !group.includes(o));
        }
      }

      // Remove conflicting options
      for (const [a, b] of CONFLICTS) {
        if (option === a) updated = updated.filter(o => o !== b);
        if (option === b) updated = updated.filter(o => o !== a);
      }

      // Enforce max 2 per match
      if (updated.length >= 2) return prev;

      // Enforce global maxPredictions cap
      const currentTotal = Object.values(prev).reduce((s, o) => s + o.length, 0);
      // updated may have fewer than current (mutex removal), so net change = updated.length + 1 - current[matchId].length
      const currentMatchCount = (prev[matchId] || []).length;
      const netChange = updated.length + 1 - currentMatchCount;
      if (currentTotal + netChange > maxPredictions) return prev;

      return { ...prev, [matchId]: [...updated, option] };
    });
  };

  const handleExactScore = (matchId, home, away) => {
    if (home === "" || home === null || home === undefined || 
        away === "" || away === null || away === undefined) {
      setPredictions(prev => {
        const current = prev[matchId] || [];
        const withoutExact = current.filter(o => !o.startsWith('exact_'));
        return { ...prev, [matchId]: withoutExact };
      });
      return;
    }

    const exactOption = `exact_${home}-${away}`;
    setPredictions(prev => {
      const current = prev[matchId] || [];
      const withoutExact = current.filter(o => !o.startsWith('exact_'));
      // Enforce max 2 per match: if non-exact picks already = 2, don't add exact on top
      if (withoutExact.length >= 2) return prev;
      // Enforce global cap: current total minus existing exact for this match + 1
      const currentExactCount = current.filter(o => o.startsWith('exact_')).length;
      const currentTotal = Object.values(prev).reduce((s, o) => s + o.length, 0);
      if (currentTotal - currentExactCount + 1 > maxPredictions) return prev;
      return { ...prev, [matchId]: [...withoutExact, exactOption] };
    });
  };

  const toggleExactScore = (matchId) => {
    setShowExactScore(prev => {
      const newState = { ...prev, [matchId]: !prev[matchId] };
      
      if (!newState[matchId]) { // If it's now hidden (was true, now false)
        setPredictions(current => { // Remove exact prediction
          const opts = current[matchId] || [];
          const withoutExact = opts.filter(o => !o.startsWith('exact_'));
          return { ...current, [matchId]: withoutExact };
        });
        setExactScores(current => { // Clear exact scores input
          const newScores = { ...current };
          delete newScores[matchId];
          return newScores;
        });
      }
      
      return newState;
    });
  };

  const handleExactScoreInput = (matchId, field, value) => {
    setExactScores(prev => {
      const updated = { ...prev, [matchId]: { ...prev[matchId], [field]: value } };
      const home = field === 'home' ? value : updated[matchId]?.home;
      const away = field === 'away' ? value : updated[matchId]?.away;
      
      // Call handleExactScore only if both fields have values
      if (home !== undefined && home !== "" && away !== undefined && away !== "") {
        handleExactScore(matchId, home, away);
      } else {
        // If one of the fields is cleared, also clear the prediction
        handleExactScore(matchId, "", ""); // Pass empty to trigger removal
      }
      
      return updated;
    });
  };

  const getTotalCredits = () => {
    return Object.values(predictions).reduce((sum, opts) => sum + opts.length, 0);
  };

  const getMatchCredits = (matchId) => {
    return (predictions[matchId] || []).length;
  };

  const allPredictionsValid = () => {
    if (matches.length === 0) return false;
    const total = getTotalCredits();
    return total >= 1 && total <= maxPredictions;
  };

  const submitPredictions = async () => {
    if (isSubmitting) return;
    
    // 🔒 Check password for private funds
    if (fund.visibility === "private" && fund.password && !passwordVerified) {
      setShowPasswordModal(true);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!user || user.total_balance === null || user.total_balance === undefined) {
        throw new Error("Unable to verify your balance. Please refresh and try again.");
      }

      if (user.total_balance < fund.entry_fee) {
        throw new Error(`Insufficient balance! You need $${fund.entry_fee} but have $${user.total_balance}`);
      }

      if (!allPredictionsValid()) {
        throw new Error(`Invalid predictions. Use between ${matches.length} and ${maxPredictions} picks total, max 2 per match.`);
      }

      const totalCredits = getTotalCredits();
      
      // Collect device fingerprint
      const deviceInfo = {
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
      };
      
      const participation = await base44.entities.Participation.create({
        fund_id: fundId,
        user_id: user.id,
        user_name: user.username || user.full_name || user.email,
        user_email: user.email,
        entry_paid: fund.entry_fee,
        is_creator: false,
        status: "active",
        credits_used: totalCredits,
        total_points: 0,
        joined_at: new Date().toISOString(),
        predictions_completed_at: new Date().toISOString(),
        device_info: deviceInfo
      });

      for (const match of matches) {
        const opts = predictions[match.id] || [];
        await base44.entities.Prediction.create({
          participation_id: participation.id,
          match_id: match.id,
          selected_options: opts,
          credits_spent: opts.length
        });
      }

      const newBalance = Math.max(0, user.total_balance - fund.entry_fee);
      await base44.entities.User.update(user.id, {
        total_balance: newBalance,
        total_predictions: (user.total_predictions || 0) + matches.length
      });

      const currentFund = await base44.entities.MatchFund.get(fundId);
      await base44.entities.MatchFund.update(fundId, {
        total_pool: (currentFund.total_pool || 0) + fund.entry_fee
      });

      await loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setError(error.message || "Failed to submit predictions");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMatch = (match) => {
    const prediction = myPredictions.find(p => p.match_id === match.id);
    setEditPicks(prediction?.selected_options ? [...prediction.selected_options] : []);
    setEditingMatchId(match.id);
  };

  const handleEditPickToggle = (option) => {
    setEditPicks(prev => {
      if (prev.includes(option)) return prev.filter(o => o !== option);
      // Remove mutex partners
      let updated = [...prev];
      for (const group of MUTEX_GROUPS) {
        if (group.includes(option)) updated = updated.filter(o => !group.includes(o));
      }
      // Remove conflicts
      for (const [a, b] of CONFLICTS) {
        if (option === a) updated = updated.filter(o => o !== b);
        if (option === b) updated = updated.filter(o => o !== a);
      }
      if (updated.length >= 2) return prev;
      return [...updated, option];
    });
  };

  const handleSaveEdit = async (matchId) => {
    if (editPicks.length < 1 || editPicks.length > 2) return;
    setIsSavingEdit(true);
    try {
      const prediction = myPredictions.find(p => p.match_id === matchId);
      if (prediction) {
        await base44.entities.Prediction.update(prediction.id, {
          selected_options: editPicks,
          credits_spent: editPicks.length,
        });
      }
      setEditingMatchId(null);
      setEditPicks([]);
      await loadData();
      toast({ description: "Picks updated!" });
    } catch (err) {
      toast({ description: "Failed to save: " + err.message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCancelFund = async () => {
    if (!window.confirm("Cancel this fund? All entry fees and share purchases will be refunded.")) return;

    setIsSubmitting(true);
    try {
      // STEP 1 — Cancel active share listings
      const activeListings = await base44.entities.ShareListing.filter({ fund_id: fund.id, status: "active" });
      await Promise.all(activeListings.map(l =>
        base44.entities.ShareListing.update(l.id, { status: "cancelled", shares_available: 0 })
      ));

      // STEP 2 — Refund share buyers & clawback from sellers
      const purchases = await base44.entities.SharePurchase.filter({ fund_id: fund.id });
      const usersToUpdate = {};
      for (const purchase of purchases) {
        if (!usersToUpdate[purchase.buyer_id]) {
          const u = await base44.entities.User.get(purchase.buyer_id);
          usersToUpdate[purchase.buyer_id] = u.total_balance ?? 0;
        }
        usersToUpdate[purchase.buyer_id] += purchase.total_cost;

        if (!usersToUpdate[purchase.seller_id]) {
          const u = await base44.entities.User.get(purchase.seller_id);
          usersToUpdate[purchase.seller_id] = u.total_balance ?? 0;
        }
        usersToUpdate[purchase.seller_id] = Math.max(0, usersToUpdate[purchase.seller_id] - purchase.total_cost);
      }
      await Promise.all(Object.entries(usersToUpdate).map(([uid, bal]) =>
        base44.entities.User.update(uid, { total_balance: bal })
      ));

      // STEP 3 — Refund entry fees
      const allParticipations = await base44.entities.Participation.filter({ fund_id: fund.id });
      await Promise.all(allParticipations.map(async (p) => {
        const u = await base44.entities.User.get(p.user_id);
        const currentBal = u.total_balance ?? 0;
        await base44.entities.User.update(p.user_id, { total_balance: currentBal + fund.entry_fee });
      }));

      // STEP 4 — Mark fund cancelled
      await base44.entities.MatchFund.update(fund.id, { status: "cancelled" });

      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to cancel fund");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinPrivateFund = () => {
    if (fund?.visibility === "private" && !passwordVerified) {
      setShowPasswordModal(true);
      return;
    }
    submitPredictions();
  };

  const grossPrizePool = participants.length * (fund?.entry_fee || 0);
  const prizePool = Math.floor(grossPrizePool * 0.93);

  const totalCredits = getTotalCredits();

  const maxPredictions = matches.length >= 1 && matches.length <= 3
    ? matches.length + 1
    : matches.length >= 4
    ? matches.length + 2
    : matches.length + 1;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Loading fund details...</p>
        </div>
      </div>
    );
  }

  if (error || !fund) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628] max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Fund Not Found</h2>
          <p className="text-gray-400 mb-6 text-center">{error || "The requested fund could not be found."}</p>
          <Button
            onClick={() => navigate(createPageUrl("Home"))}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 🔒 PASSWORD MODAL - cannot be dismissed without entering password or going back */}
        {showPasswordModal && !passwordVerified && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0F1E35] border border-gray-800 rounded-2xl p-8 max-w-sm w-full">
              <h2 className="text-2xl font-bold text-white mb-2 text-center">🔒 Private Fund</h2>
              <p className="text-gray-400 text-center mb-6">Enter the password to access this fund</p>
              <Input
                type="text"
                maxLength={6}
                placeholder="••••"
                value={passwordInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setPasswordInput(digits);
                  setPasswordError("");
                }}
                className="bg-white/5 border-gray-700 text-white text-center text-3xl font-bold tracking-widest mb-3"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordInput.length >= 1) {
                    if (passwordInput !== fund?.password) {
                      setPasswordError("Incorrect password");
                    } else {
                      setPasswordVerified(true);
                      setShowPasswordModal(false);
                    }
                  }
                }}
              />
              {passwordError && (
                <p className="text-red-400 text-sm text-center mb-3">{passwordError}</p>
              )}
              <Button
                onClick={() => {
                  if (passwordInput !== fund?.password) {
                    setPasswordError("Incorrect password");
                    return;
                  }
                  setPasswordVerified(true);
                  setShowPasswordModal(false);
                }}
                disabled={!passwordInput}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 mb-3"
              >
                Confirm Password
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate(createPageUrl("Home"))}
                className="w-full text-gray-400 hover:text-white"
              >
                ← Go Back
              </Button>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Home"))}
          className="mb-6 text-gray-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {fund.status === "cancelled" && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 font-semibold flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            This fund has been cancelled. Entry fees and share purchases have been refunded.
          </div>
        )}

        <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-3xl font-bold text-white mb-3 flex items-center gap-2">
                  {fund.visibility === "private" && <span>🔒</span>}
                  {fund.title}
                </h1>
                {fund.creator_id === user?.id && (fund.status === "open" || fund.status === "draft") && (
                  <div className="flex gap-2 shrink-0">
                    {fund.status === "draft" && (
                      <Button
                        size="sm"
                        disabled={isSubmitting}
                        onClick={async () => {
                          setIsSubmitting(true);
                          await base44.entities.MatchFund.update(fund.id, { status: "open" });
                          await loadData();
                          setIsSubmitting(false);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                      >
                        Open Fund
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={handleCancelFund}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      Cancel Fund
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  {maxPredictions} Predictions
                </Badge>
                <Badge className={`${
                  fund.status === "open" 
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : fund.status === "closed"
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    : fund.status === "in_progress"
                    ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                }`}>
                  {fund.status === "open" ? "Open" : 
                   fund.status === "closed" ? "Closed" :
                   fund.status === "in_progress" ? "In Progress" :
                   fund.status === "finished" ? "Finished" : fund.status}
                </Badge>
                {fund.visibility === "private" && (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                    Private
                  </Badge>
                )}
              </div>
              {fund.visibility === "private" && fund.password && fund.creator_id === user?.id && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500">🔒 Fund password: <span className="font-mono text-gray-400">{fund.password}</span></span>
                  <button
                    onClick={() => navigator.clipboard.writeText(fund.password)}
                    className="text-xs text-gray-600 hover:text-gray-400 border border-gray-700 rounded px-1.5 py-0.5 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400 mb-1">Net Prize Pool</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                ${prizePool}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                after 7% platform fee
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Entry Fee</span>
              </div>
              <div className="text-2xl font-bold text-white">${fund.entry_fee}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Max Players</span>
              </div>
              <div className="text-2xl font-bold text-white">{fund.max_participants}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400">Matches</span>
              </div>
              <div className="text-2xl font-bold text-white">{matches.length}</div>
            </div>
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-gray-400">Starts</span>
              </div>
              <div className="text-sm font-bold text-white">
                {fund.first_match_starts_at ? format(new Date(fund.first_match_starts_at), "MMM d, HH:mm") : "—"}
              </div>
            </div>
          </div>

          {/* Prize Distribution */}
          {(() => {
            const tiersByType = {
              winner_takes_all: [{ emoji: "🥇", label: "1st place", pct: 100 }],
              top2: [{ emoji: "🥇", label: "1st", pct: 60 }, { emoji: "🥈", label: "2nd", pct: 40 }],
              top3: [{ emoji: "🥇", label: "1st", pct: 50 }, { emoji: "🥈", label: "2nd", pct: 30 }, { emoji: "🥉", label: "3rd", pct: 20 }],
            };
            const tiers = tiersByType[fund.prize_split] || [{ emoji: "🥇", label: "1st place", pct: 100 }];
            return (
              <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Prize Distribution</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tiers.map((tier, i) => (
                    <React.Fragment key={tier.label}>
                      {i > 0 && <span className="text-gray-600">·</span>}
                      <span className="text-white font-semibold">
                        {tier.emoji} {tier.label}: {tier.pct}%{" "}
                        <span className="text-yellow-400">(${Math.round(prizePool * tier.pct / 100)})</span>
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </Card>

        {fund.status === "cancelled" ? null : hasJoined ? (
          <>
            {/* YOUR_PREDICTIONS_CARD_START */}
            {(() => {
              const liveMatchExists = matches.some(m => m.status === "live");
              const tradingOpen = (fund.status === "open" || fund.status === "in_progress") && !liveMatchExists;
              const tradingClosed = fund.status === "finished";
              return (
            <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  Participants
                  {tradingOpen && (
                    <span className="text-xs text-gray-400 font-normal ml-2">· tap a row to trade shares</span>
                  )}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadData}
                  className="text-gray-400 hover:text-white hover:bg-white/5 gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>
              {liveMatchExists && (fund.status === "open" || fund.status === "in_progress") && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center gap-2">
                  🔴 Trading locked — match in progress
                </div>
              )}

              {(() => {
                const tierPcts = {
                  winner_takes_all: [100],
                  top2: [60, 40],
                  top3: [50, 30, 20],
                };
                const pcts = tierPcts[fund.prize_split] || [100];

                const sorted = [...participants].sort((a, b) => {
                  const aPayout = a.final_payout || 0;
                  const bPayout = b.final_payout || 0;
                  if (aPayout > 0 && bPayout === 0) return -1;
                  if (aPayout === 0 && bPayout > 0) return 1;
                  if (aPayout > 0 && bPayout > 0) return bPayout - aPayout;
                  if ((b.total_points || 0) !== (a.total_points || 0)) return (b.total_points || 0) - (a.total_points || 0);
                  if ((a.credits_used || 0) !== (b.credits_used || 0)) return (a.credits_used || 0) - (b.credits_used || 0);
                  return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
                });

                return participants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No participants yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sorted.map((participant, index) => {
                      const rank = index + 1;
                      const pct = pcts[rank - 1] ?? 0;
                      const potentialPrize = Math.round(prizePool * pct / 100);
                      const theoreticalPerShare = Math.round(potentialPrize / 100);
                      const activeListing = shareListings.find(l => l.seller_id === participant.user_id && l.participation_id === participant.id);
                      const displayName = participant.user_id === user?.id ? "You" : (participant.user_name || participant.user_email || `Player ${participant.user_id.slice(0, 8)}`);

                      return (
                        <div
                          key={participant.id}
                          onClick={() => tradingOpen && setOrderBookParticipant({ participant, rank, displayName, liveMatchExists })}
                          className={`p-4 rounded-lg bg-white/5 border border-gray-700 ${tradingOpen ? "cursor-pointer hover:border-orange-500/40 hover:bg-orange-500/5 transition-colors" : ""}`}
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                #{rank}
                              </div>
                              <div>
                                <p className="text-white font-semibold flex items-center gap-1 flex-wrap">
                                  {displayName}
                                  {participant.is_creator && (
                                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Creator</Badge>
                                  )}
                                </p>
                                <p className="text-xs text-gray-400">Predictions: {participant.credits_used || 0}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-right flex-wrap justify-end">
                              <div>
                                <div className="text-lg font-bold text-white">{participant.total_points || 0} pts</div>
                                {potentialPrize > 0 && (
                                  <div className="text-xs text-yellow-400">Prize: ${potentialPrize}</div>
                                )}
                              </div>
                              {(fund.status === "open" || fund.status === "in_progress") && !tradingClosed && (
                                <div className="text-right">
                                  <div className="text-xs text-gray-400">Theoretical</div>
                                  <div className="text-sm font-semibold text-orange-400">{theoreticalPerShare} pts/share</div>
                                  {activeListing && (
                                    <div className="text-xs text-green-400 mt-0.5">
                                      Listed: {activeListing.price_per_share} pts · {activeListing.shares_available} shares
                                    </div>
                                  )}
                                </div>
                              )}
                              {participant.final_payout > 0 && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Won: ${participant.final_payout}</Badge>
                              )}
                              {participant.status === 'refunded' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Refunded</Badge>
                              )}
                              {participant.status === 'loser' && (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">No prize</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
              );
            })()}

            {fund.status === 'finished' && (
              <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Winners
                </h2>
                
                {participants.filter(p => p.status === 'winner').length > 0 ? (
                  <div className="space-y-3">
                    {participants
                      .filter(p => p.status === 'winner')
                      .sort((a, b) => (b.final_payout || 0) - (a.final_payout || 0))
                      .map((winner, index) => (
                        <div
                          key={winner.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center font-bold text-white text-xl">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">
                                 {winner.user_id === user?.id ? "You" : (winner.user_name || winner.user_email || `Player ${winner.user_id.slice(0, 8)}`)}
                                  {winner.is_creator && (
                                    <Badge className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                      Creator
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {winner.total_points || 0} pts • {winner.credits_used || 0} picks
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                              ${winner.final_payout || 0}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400">No winners yet or fund refunded</p>
                  </div>
                )}
              </Card>
            )}

            <Card className="p-8 mb-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-400" />
                Your Predictions
              </h2>

              {/* Edit notice — only if at least one match is still unlocked */}
              {matches.some(m => new Date(m.match_date) > new Date() && m.status !== 'live' && m.status !== 'finished') && (
                <div className="mb-4 text-sm text-gray-400 flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-gray-500" />
                  You can update picks on upcoming matches until kickoff.
                </div>
              )}

              {myPredictions.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((match) => {
                    const prediction = myPredictions.find(p => p.match_id === match.id);
                    const isFinished = match.status === 'finished';
                    const points = prediction?.points_earned || 0;
                    const opts = prediction?.selected_options || [];
                    const now = new Date();
                    const kickoffPassed = new Date(match.match_date) <= now;
                    const isLocked = kickoffPassed || match.status === 'live' || match.status === 'finished';
                    const isEditing = editingMatchId === match.id;

                    const OPTION_GROUPS = [
                      {
                        label: "Result (3 pts)", options: [
                          { value: 'home_win', label: `${match.home_team} Win` },
                          { value: 'draw', label: 'Draw' },
                          { value: 'away_win', label: `${match.away_team} Win` },
                        ], color: "bg-orange-500 border-orange-500"
                      },
                      {
                        label: "Both Teams to Score (2 pts)", options: [
                          { value: 'both_score_yes', label: 'Yes' },
                          { value: 'both_score_no', label: 'No' },
                        ], color: "bg-blue-500 border-blue-500"
                      },
                      {
                        label: "Total Goals (2.5 pts)", options: [
                          { value: 'goals_over', label: 'Over 2.5' },
                          { value: 'goals_under', label: 'Under 2.5' },
                        ], color: "bg-blue-500 border-blue-500"
                      },
                      {
                        label: "Margin (1.5 pts)", options: [
                          { value: 'blowout_yes', label: 'Blowout (3+ goals)' },
                          { value: 'blowout_no', label: 'No Blowout' },
                        ], color: "bg-blue-500 border-blue-500"
                      },
                      {
                        label: "Win to Nil (4 pts)", options: [
                          { value: 'clean_sheet_home', label: `${match.home_team} Win to Nil` },
                          { value: 'clean_sheet_away', label: `${match.away_team} Win to Nil` },
                        ], color: "bg-purple-500 border-purple-500"
                      },
                    ];

                    return (
                      <div key={match.id} className={`p-4 rounded-xl border border-gray-700 ${isLocked ? "bg-white/3 opacity-90" : "bg-white/5"}`}>
                        {/* Match header */}
                        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            {isLocked
                              ? <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                              : !isEditing && (
                                <button
                                  onClick={() => handleEditMatch(match)}
                                  className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                                >
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                              )
                            }
                            <span className={`text-xs ${isLocked ? "text-gray-600" : "text-gray-400"}`}>
                              {match.home_team} vs {match.away_team}
                            </span>
                          </div>
                          {isFinished && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono">{match.home_goals} - {match.away_goals}</span>
                              <span className={`text-xs font-bold ${points > 0 ? "text-green-400" : "text-red-400"}`}>
                                {points > 0 ? `+${points} pts` : "0 pts"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* View mode — current picks as badges */}
                        {!isEditing && (
                          <div className={`flex flex-wrap gap-1 ${isLocked ? "opacity-60" : ""}`}>
                            {opts.length > 0 ? opts.map((opt, i) => (
                              <Badge key={i} className={`text-xs ${badgeClass(opt, match)}`}>
                                {formatOption(opt, match.home_team, match.away_team)}
                              </Badge>
                            )) : (
                              <span className="text-xs text-gray-600 italic">No pick for this match</span>
                            )}
                          </div>
                        )}

                        {/* Edit mode — option buttons */}
                        {isEditing && (
                          <div className="mt-3 space-y-3">
                            {OPTION_GROUPS.map((group) => (
                              <div key={group.label}>
                                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{group.label}</p>
                                <div className="flex gap-2 flex-wrap">
                                  {group.options.map((option) => {
                                    const isSelected = editPicks.includes(option.value);
                                    const isDisabled = !isSelected && editPicks.length >= 2;
                                    return (
                                      <Button
                                        key={option.value}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        disabled={isDisabled}
                                        className={`flex items-center gap-1 ${
                                          isSelected
                                            ? `${group.color} text-white font-bold`
                                            : "border-gray-600 text-gray-300 hover:bg-white/5"
                                        }`}
                                        onClick={() => handleEditPickToggle(option.value)}
                                      >
                                        {isSelected && <span>✓</span>}
                                        <span>{option.label}</span>
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}

                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                disabled={editPicks.length < 1 || isSavingEdit}
                                onClick={() => handleSaveEdit(match.id)}
                                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                              >
                                {isSavingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingMatchId(null); setEditPicks([]); }}
                                className="text-gray-400 hover:text-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading your predictions...</p>
                </div>
              )}
            </Card>

            {/* Players' Predictions — only visible after user has submitted */}
            {myParticipation?.predictions_completed_at && (
              <PlayersPredictions
                participants={participants}
                predictionsMap={otherPredictionsMap}
                matches={matches}
                currentUserId={user?.id}
              />
            )}

            {/* Order Book bottom sheet */}
            {orderBookParticipant && (
              <OrderBook
                isOpen={!!orderBookParticipant}
                onClose={() => setOrderBookParticipant(null)}
                participant={orderBookParticipant.participant}
                participantName={orderBookParticipant.displayName}
                rank={orderBookParticipant.rank}
                prizePool={prizePool}
                prizeSplit={fund.prize_split}
                fundId={fundId}
                fundStatus={fund.status}
                liveMatchExists={orderBookParticipant.liveMatchExists}
                currentUser={user}
                onRefresh={loadData}
              />
            )}
          </>
        ) : fund.status !== "cancelled" ? (
          <div>
            <div className="sticky top-0 z-10 bg-[#0C1523] pb-4 mb-6">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Target className="w-6 h-6 text-orange-400" />
                      Make Your Predictions
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${totalCredits >= maxPredictions ? "text-orange-400" : "text-white"}`}>
                      {totalCredits} <span className="text-lg text-gray-400">/ {maxPredictions}</span>
                    </div>
                    <div className="text-sm text-gray-400">predictions used</div>
                  </div>
                </div>

                {user && user.total_balance < fund.entry_fee && (
                  <Alert className="mb-4 bg-red-500/10 border-red-500/30">
                    <AlertDescription className="text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Insufficient balance</p>
                        <p className="text-sm">
                          You need ${fund.entry_fee} to join but have ${user.total_balance}.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert className={totalCredits === 0 ? "bg-blue-500/10 border-blue-500/30" : "bg-green-500/10 border-green-500/30"}>
                <AlertDescription className={totalCredits === 0 ? "text-blue-300" : "text-green-400"}>
                  {totalCredits === 0
                    ? "Select at least 1 prediction to proceed."
                    : `✅ ${totalCredits} prediction${totalCredits !== 1 ? "s" : ""} selected — ready to join!`
                  }
                </AlertDescription>
                </Alert>
              </Card>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-semibold">Error</p>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            <TooltipProvider>
              <div className="space-y-4 mb-6">
                {matches.map((match) => {
                  const opts = predictions[match.id] || [];
                  const matchCredits = getMatchCredits(match.id);
                  const showExact = showExactScore[match.id];
                  const globalCapReached = totalCredits >= maxPredictions;
                  
                  return (
                    <Card
                      key={match.id}
                      className={`p-6 border transition-all ${
                        matchCredits > 0 ? "bg-green-500/5 border-green-500/30" : "bg-white/5 border-gray-700"
                      }`}
                    >
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-lg font-bold text-white">
                            {match.home_team} vs {match.away_team}
                          </p>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-sm text-gray-400 cursor-help flex items-center gap-1">
                                    {matchCredits} / 2 picks <span className="text-gray-500 text-xs">(optional 2nd)</span>
                                    <span className="text-gray-500">ⓘ</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>1st pick required, 2nd is optional. Global max: {maxPredictions} total.</p>
                                </TooltipContent>
                          </Tooltip>
                        </div>
                        <p className="text-sm text-gray-400">
                          {new Date(match.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}, {new Date(match.match_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {/* Result — 1 pt */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Result <span className="normal-case text-gray-600">(3 pts)</span></p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'home_win', label: `${match.home_team} Win` },
                              { value: 'draw', label: 'Draw' },
                              { value: 'away_win', label: `${match.away_team} Win` }
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (globalCapReached || matchCredits >= 2);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={isDisabled}
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-orange-500 hover:bg-orange-600 text-white font-bold border-orange-500"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handlePredictionChange(match.id, option.value)}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Both Teams to Score — 2 pts */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Both Teams to Score <span className="normal-case text-gray-600">(2 pts)</span></p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'both_score_yes', label: 'Yes' },
                              { value: 'both_score_no', label: 'No' },
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (globalCapReached || matchCredits >= 2);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={isDisabled}
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white font-bold border-blue-500"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handlePredictionChange(match.id, option.value)}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Goals Over/Under — 2.5 pts */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Goals <span className="normal-case text-gray-600">(2.5 pts)</span></p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'goals_over', label: 'Over 2.5 Goals' },
                              { value: 'goals_under', label: 'Under 2.5 Goals' },
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (globalCapReached || matchCredits >= 2);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={isDisabled}
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white font-bold border-blue-500"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handlePredictionChange(match.id, option.value)}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Blowout — 1.5 pts */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Margin <span className="normal-case text-gray-600">(1.5 pts)</span></p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'blowout_yes', label: 'Blowout (3+ goal diff)' },
                              { value: 'blowout_no', label: 'No Blowout' },
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (globalCapReached || matchCredits >= 2);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={isDisabled}
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-blue-500 hover:bg-blue-600 text-white font-bold border-blue-500"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handlePredictionChange(match.id, option.value)}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Win to Nil — 4 pts */}
                        <div>
                          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Win to Nil <span className="normal-case text-gray-600">(4 pts)</span></p>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { value: 'clean_sheet_home', label: `${match.home_team} Win to Nil` },
                              { value: 'clean_sheet_away', label: `${match.away_team} Win to Nil` },
                            ].map((option) => {
                              const isSelected = opts.includes(option.value);
                              const isDisabled = !isSelected && (globalCapReached || matchCredits >= 2);
                              return (
                                <Button
                                  key={option.value}
                                  type="button"
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={isDisabled}
                                  className={`flex items-center gap-1 ${
                                    isSelected
                                      ? "bg-purple-500 hover:bg-purple-600 text-white font-bold border-purple-500"
                                      : "border-gray-600 text-gray-300 hover:bg-white/5"
                                  }`}
                                  onClick={() => handlePredictionChange(match.id, option.value)}
                                >
                                  {isSelected && <span>✓</span>}
                                  <span>{option.label}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        {!showExact ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={!showExact && (globalCapReached || matchCredits >= 2)}
                            onClick={() => toggleExactScore(match.id)}
                            className="w-full border-gray-600 text-gray-300 hover:bg-white/5 flex items-center justify-center gap-2"
                          >
                            <span className="text-lg">🎯</span>
                            <span>Add Exact Score Prediction</span>
                          </Button>
                        ) : (
                          <div className="p-4 rounded-lg bg-white/5 border border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span className="text-white font-semibold">Exact Score (9 pts if correct)</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExactScore(match.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                ❌ Remove
                              </Button>
                            </div>
                            <div className="flex items-center justify-center gap-3 mb-3">
                              <span className="text-gray-300 text-sm">{match.home_team}</span>
                              <Input
                                type="number"
                                min="0"
                                max="9"
                                placeholder=""
                                value={exactScores[match.id]?.home ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'home', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${
                                  exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                                  exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== ""
                                    ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30"
                                    : "bg-white/10"
                                }`}
                              />
                              <span className="text-gray-500 font-bold text-xl">-</span>
                              <Input
                                type="number"
                                min="0"
                                max="9"
                                placeholder=""
                                value={exactScores[match.id]?.away ?? ""}
                                onChange={(e) => handleExactScoreInput(match.id, 'away', e.target.value)}
                                className={`w-16 text-center border-gray-600 text-white font-bold text-lg ${
                                  exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                                  exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== ""
                                    ? "bg-green-500/20 border-green-500 ring-2 ring-green-500/30"
                                    : "bg-white/10"
                                }`}
                              />
                              <span className="text-gray-300 text-sm">{match.away_team}</span>
                            </div>
                            {exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "" &&
                             exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "" ? (
                              <div className="text-center p-2 rounded bg-green-500/20 border border-green-500/30">
                                <span className="text-green-400 font-semibold">
                                  ✅ Your prediction: {exactScores[match.id].home}-{exactScores[match.id].away} (9 pts if correct)
                                </span>
                              </div>
                            ) : (
                              (exactScores[match.id]?.home !== undefined && exactScores[match.id]?.home !== "") ||
                              (exactScores[match.id]?.away !== undefined && exactScores[match.id]?.away !== "") ? (
                                <div className="text-center p-2 rounded bg-yellow-500/20 border border-yellow-500/30">
                                  <span className="text-yellow-400 text-sm">
                                    ⚠️ Enter both scores to complete this prediction
                                  </span>
                                </div>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TooltipProvider>

            <div className="sticky bottom-0 bg-[#0C1523] pt-4">
              <Card className="p-6 border-gray-800 bg-gradient-to-br from-[#0F1E35] to-[#0A1628]">
                <Button
                  onClick={handleJoinPrivateFund}
                  disabled={!allPredictionsValid() || isSubmitting || !user || user.total_balance < fund.entry_fee}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-6 text-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </span>
                  ) : user && user.total_balance < fund.entry_fee ? (
                    `Insufficient balance`
                  ) : (
                    `Join Fund & Submit Predictions (${totalCredits} predictions)`
                  )}
                </Button>

                {totalCredits === 0 && (
                  <p className="text-center text-sm text-gray-400 mt-3">
                    ⚠️ Make at least 1 prediction to submit
                  </p>
                )}
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}