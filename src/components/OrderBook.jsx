import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, TrendingUp, ShoppingCart } from "lucide-react";

// Helper: calculate potential prize for a participant given rank, prizePool, and split
function calcPotentialPrize(rank, prizePool, prizeSplit) {
  const tierPcts = {
    winner_takes_all: [100],
    top2: [60, 40],
    top3: [50, 30, 20],
  };
  const pcts = tierPcts[prizeSplit] || [100];
  const pct = pcts[rank - 1] ?? 0;
  return Math.round(prizePool * pct / 100);
}

export default function OrderBook({
  isOpen,
  onClose,
  participant,       // the participation record we're viewing
  participantName,   // display name
  rank,
  prizePool,
  prizeSplit,
  fundId,
  fundStatus,        // fund.status
  liveMatchExists,   // boolean: any match in this fund is currently "live"
  currentUser,
  onRefresh,
}) {
  const [tab, setTab] = useState("buy");
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [buyQty, setBuyQty] = useState({});        // listing_id -> qty string
  const [buyingId, setBuyingId] = useState(null);
  const [sellQty, setSellQty] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [isSelling, setIsSelling] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const isOwn = currentUser?.id === participant?.user_id;
  const tradingLocked = liveMatchExists;
  const tradingClosed = fundStatus === "finished";
  const tradingOpen = (fundStatus === "open" || fundStatus === "in_progress") && !tradingLocked;

  const potentialPrize = calcPotentialPrize(rank, prizePool, prizeSplit);
  const theoreticalPerShare = Math.round(potentialPrize / 100);

  useEffect(() => {
    if (isOpen && participant) {
      loadListings();
      setActionError("");
      setActionSuccess("");
    }
  }, [isOpen, participant]);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const all = await base44.entities.ShareListing.filter({ fund_id: fundId, seller_id: participant.user_id });
      const active = all.filter(l => l.status === "active");
      setListings(active);
      setMyListings(active.filter(l => l.participation_id === participant.id));
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  // How many shares the seller still has available to list
  const totalListedByOwner = myListings.reduce((s, l) => s + (l.shares_available || 0), 0);
  const sharesAvailableToSell = 100 - totalListedByOwner;

  const handleBuy = async (listing) => {
    const qty = parseInt(buyQty[listing.id] || "0", 10);
    if (!qty || qty < 1 || qty > listing.shares_available) {
      setActionError("Enter a valid quantity");
      return;
    }
    const cost = qty * listing.price_per_share;
    if ((currentUser.total_balance || 0) < cost) {
      setActionError("Insufficient balance");
      return;
    }
    setBuyingId(listing.id);
    setActionError("");

    // ── Optimistic UI: update listing count immediately ──
    const remaining = listing.shares_available - qty;
    setListings(prev => prev
      .map(l => l.id === listing.id ? { ...l, shares_available: remaining } : l)
      .filter(l => l.shares_available > 0)
    );
    setBuyQty(prev => ({ ...prev, [listing.id]: "" }));
    setActionSuccess(`Bought ${qty} share(s) for ${cost} pts!`);

    try {
      await base44.entities.User.update(currentUser.id, {
        total_balance: (currentUser.total_balance || 0) - cost,
      });
      await base44.entities.SharePurchase.create({
        listing_id: listing.id,
        fund_id: fundId,
        buyer_id: currentUser.id,
        seller_id: listing.seller_id,
        shares_bought: qty,
        price_per_share: listing.price_per_share,
        total_cost: cost,
        purchased_at: new Date().toISOString(),
      });
      await base44.entities.ShareListing.update(listing.id, {
        shares_available: remaining,
        status: remaining <= 0 ? "cancelled" : "active",
      });
      await loadListings();
      onRefresh && onRefresh();
    } catch (e) {
      // Rollback optimistic update
      setListings(prev => [...prev, listing]);
      setActionSuccess("");
      setActionError(e.message || "Purchase failed");
    }
    setBuyingId(null);
  };

  const handleList = async () => {
    const qty = parseInt(sellQty, 10);
    const price = parseInt(sellPrice, 10);
    if (!qty || qty < 1 || qty > sharesAvailableToSell) {
      setActionError(`Quantity must be 1–${sharesAvailableToSell}`);
      return;
    }
    if (!price || price < 1) {
      setActionError("Price must be at least 1 pt");
      return;
    }
    setIsSelling(true);
    setActionError("");

    // ── Optimistic UI: add listing immediately ──
    const optimisticListing = {
      id: "__opt__",
      fund_id: fundId,
      seller_id: participant.user_id,
      participation_id: participant.id,
      shares_available: qty,
      price_per_share: price,
      status: "active",
    };
    setMyListings(prev => [...prev, optimisticListing]);
    setSellQty("");
    setSellPrice("");
    setActionSuccess(`Listed ${qty} share(s) at ${price} pts/share`);

    try {
      await base44.entities.ShareListing.create({
        fund_id: fundId,
        seller_id: participant.user_id,
        participation_id: participant.id,
        shares_available: qty,
        price_per_share: price,
        status: "active",
      });
      await loadListings();
      onRefresh && onRefresh();
    } catch (e) {
      // Rollback
      setMyListings(prev => prev.filter(l => l.id !== "__opt__"));
      setActionSuccess("");
      setActionError(e.message || "Failed to list");
    }
    setIsSelling(false);
  };

  const handleCancelListing = async (listingId) => {
    try {
      await base44.entities.ShareListing.update(listingId, { status: "cancelled" });
      setActionSuccess("Listing cancelled");
      await loadListings();
      onRefresh && onRefresh();
    } catch (e) {
      setActionError(e.message || "Failed to cancel");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative w-full max-w-lg bg-[#0F1E35] border border-gray-700 rounded-t-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-600" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 border-b border-gray-700 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{participantName}</h2>
            <div className="flex flex-wrap gap-3 mt-1 text-sm">
              <span className="text-gray-400">
                Points: <span className="text-white font-semibold">{participant?.total_points || 0}</span>
              </span>
              <span className="text-gray-400">
                Prize est.: <span className="text-yellow-400 font-semibold">${potentialPrize}</span>
              </span>
              <span className="text-gray-400">
                Theoretical: <span className="text-orange-400 font-semibold">{theoreticalPerShare} pts/share</span>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trading status banner */}
        {tradingClosed && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-lg bg-gray-700/40 border border-gray-600 text-gray-400 text-sm text-center">
            Trading is closed — fund has finished
          </div>
        )}
        {tradingLocked && !tradingClosed && (
          <div className="mx-5 mt-3 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm text-center">
            🔴 Trading locked — match in progress
          </div>
        )}


        {/* Tabs */}
        <div className="flex border-b border-gray-700 mx-5 mt-3">
          <button
            onClick={() => { setTab("buy"); setActionError(""); setActionSuccess(""); }}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "buy" ? "text-orange-400 border-b-2 border-orange-400" : "text-gray-400 hover:text-white"}`}
          >
            <ShoppingCart className="w-4 h-4 inline mr-1" /> Buy
          </button>
          {isOwn && (
            <button
              onClick={() => { setTab("sell"); setActionError(""); setActionSuccess(""); }}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${tab === "sell" ? "text-orange-400 border-b-2 border-orange-400" : "text-gray-400 hover:text-white"}`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" /> Sell
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {actionError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              {actionError}
            </div>
          )}
          {actionSuccess && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
              ✅ {actionSuccess}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : tab === "buy" ? (
            listings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No active listings for this player</div>
            ) : (
              <div className="space-y-3">
                {listings.map(listing => (
                  <div key={listing.id} className="p-4 rounded-xl border border-gray-700 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                       <div>
                         <span className="text-white font-bold text-base">{listing.price_per_share} pts/share</span>
                         <span className="text-gray-400 text-sm ml-2">· {listing.shares_available} available</span>
                       </div>
                       <span className="text-gray-500 text-sm">
                         Total if all: <span className="text-white">{listing.shares_available * listing.price_per_share} pts</span>
                       </span>
                     </div>
                     {(() => {
                       const profit = theoreticalPerShare - listing.price_per_share;
                       return profit >= 0 ? (
                         <p className="text-green-400 text-xs font-semibold mb-2">+{profit} pts profit per share</p>
                       ) : (
                         <p className="text-red-400 text-xs font-semibold mb-2">{profit} pts below value per share</p>
                       );
                     })()}
                    {tradingOpen && currentUser?.id !== listing.seller_id && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={listing.shares_available}
                          placeholder={`1–${listing.shares_available}`}
                          value={buyQty[listing.id] || ""}
                          onChange={e => setBuyQty(prev => ({ ...prev, [listing.id]: e.target.value }))}
                          className="w-24 bg-white/10 border-gray-600 text-white text-center"
                        />
                        <span className="text-gray-400 text-sm">
                          = {(parseInt(buyQty[listing.id] || 0, 10) * listing.price_per_share)} pts
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleBuy(listing)}
                          disabled={buyingId === listing.id}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold ml-auto"
                        >
                          {buyingId === listing.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buy"}
                        </Button>
                      </div>
                    )}
                    {currentUser?.id === listing.seller_id && (
                      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Your listing</Badge>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            // SELL tab
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/5 border border-gray-700 text-sm text-gray-300">
                Your shares available to sell: <span className="text-white font-bold">{sharesAvailableToSell}</span> / 100
              </div>

              {/* Existing active listings */}
              {myListings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Your active listings</p>
                  {myListings.map(l => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border border-orange-500/30 bg-orange-500/10">
                      <span className="text-white text-sm">{l.shares_available} shares @ {l.price_per_share} pts/share</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelListing(l.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {tradingOpen && sharesAvailableToSell > 0 && (
                <div className="space-y-3 p-4 rounded-xl border border-gray-700 bg-white/5">
                  <p className="text-sm font-semibold text-white">List shares for sale</p>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                      <Input
                        type="number"
                        min={1}
                        max={sharesAvailableToSell}
                        placeholder={`1–${sharesAvailableToSell}`}
                        value={sellQty}
                        onChange={e => setSellQty(e.target.value)}
                        className="bg-white/10 border-gray-600 text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Price/share (pts)</label>
                      <Input
                        type="number"
                        min={1}
                        placeholder={`≥1 (val: ~${theoreticalPerShare})`}
                        value={sellPrice}
                        onChange={e => setSellPrice(e.target.value)}
                        className="bg-white/10 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  {sellQty && sellPrice && (
                    <p className="text-sm text-gray-400">
                      Total if sold: <span className="text-yellow-400 font-bold">{parseInt(sellQty || 0) * parseInt(sellPrice || 0)} pts</span>
                    </p>
                  )}
                  <Button
                    onClick={handleList}
                    disabled={isSelling}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold"
                  >
                    {isSelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "List for Sale"}
                  </Button>
                </div>
              )}


              {sharesAvailableToSell <= 0 && (
                <p className="text-center text-gray-500 text-sm py-2">All 100 shares are currently listed</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}