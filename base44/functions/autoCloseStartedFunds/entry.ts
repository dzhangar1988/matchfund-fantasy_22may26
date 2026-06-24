import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const now = new Date().toISOString();

        // Get all open funds whose first_match_starts_at is in the past
        const openFunds = await base44.asServiceRole.entities.MatchFund.filter({ status: "open" });

        const toClose = openFunds.filter(f =>
            f.first_match_starts_at && f.first_match_starts_at <= now
        );

        let fundsClosed = 0;
        let fundsCancelled = 0;
        const multipliersFrozen = [];

        for (const fund of toClose) {
            // Count active participants
            const activeParts = await base44.asServiceRole.entities.Participation
                .filter({ fund_id: fund.id, status: "active" });

            const minRequired = fund.min_participants || 2;

            // Below minimum — cancel and refund instead of closing.
            // Uses the same refund logic as cancelFund (inlined to avoid
            // function-to-function auth propagation issues).
            if (activeParts.length < minRequired) {
                await cancelAndRefund(base44, fund.id, fund.entry_fee);
                fundsCancelled++;
                continue;
            }

            // Meets minimum — close normally and proceed to scoring
            const updateData = { status: "closed" };

            // For multiplier-mode funds: compute crowd-weighted multiplier snapshot before closing
            if (fund.scoring_mode === "multiplier") {
                const totalActive = activeParts.length;
                const multipliers = {};

                if (totalActive > 0) {
                    // Gather all predictions for these participations
                    const partIds = activeParts.map(p => p.id);
                    const partUserMap = {};
                    for (const p of activeParts) partUserMap[p.id] = p.user_id;

                    const allPreds = await Promise.all(
                        partIds.map(pid =>
                            base44.asServiceRole.entities.Prediction.filter({ participation_id: pid })
                        )
                    );
                    const preds = allPreds.flat();

                    // Tally distinct user_ids per ${match_id}_${option} key
                    const pickerSets = {};
                    for (const pred of preds) {
                        const userId = partUserMap[pred.participation_id];
                        if (!userId) continue;
                        for (const opt of (pred.selected_options || [])) {
                            const key = `${pred.match_id}_${opt}`;
                            if (!pickerSets[key]) pickerSets[key] = new Set();
                            pickerSets[key].add(userId);
                        }
                    }

                    // Compute multiplier for each key with ≥1 picker
                    for (const [key, userSet] of Object.entries(pickerSets)) {
                        const pickerCount = userSet.size;
                        multipliers[key] = Math.round((totalActive / pickerCount) * 100) / 100;
                    }
                }

                updateData.multipliers = multipliers;
                updateData.multipliers_frozen_at = now;
                multipliersFrozen.push({ fund_id: fund.id, keys: Object.keys(multipliers).length, totalActive });
            }

            await base44.asServiceRole.entities.MatchFund.update(fund.id, updateData);
            fundsClosed++;
        }

        return Response.json({ fundsClosed, fundsCancelled, multipliersFrozen, checked: openFunds.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});

/**
 * Inlined cancel+refund logic — identical behavior to cancelFund.
 * Cancels share listings, refunds entry fees & share purchases, marks fund cancelled.
 * Idempotent: only acts on funds still "open".
 */
async function cancelAndRefund(base44, fundId, entryFee) {
    const fund = await base44.asServiceRole.entities.MatchFund.get(fundId);
    if (!fund) return;
    if (fund.status !== 'open') return; // idempotency guard

    // 1. Cancel active share listings
    const activeListings = await base44.asServiceRole.entities.ShareListing.filter({ fund_id: fundId, status: 'active' });
    await Promise.all(activeListings.map(l =>
        base44.asServiceRole.entities.ShareListing.update(l.id, { status: 'cancelled', shares_available: 0 })
    ));

    // 2. Refund share buyers & clawback from sellers
    const purchases = await base44.asServiceRole.entities.SharePurchase.filter({ fund_id: fundId });
    const balanceDeltas = {};
    for (const purchase of purchases) {
        balanceDeltas[purchase.buyer_id] = (balanceDeltas[purchase.buyer_id] || 0) + purchase.total_cost;
        balanceDeltas[purchase.seller_id] = (balanceDeltas[purchase.seller_id] || 0) - purchase.total_cost;
    }

    // 3. Refund entry fees
    const allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id: fundId });
    for (const p of allParticipations) {
        balanceDeltas[p.user_id] = (balanceDeltas[p.user_id] || 0) + entryFee;
    }

    // Apply all balance updates
    const userIds = Object.keys(balanceDeltas);
    const users = await Promise.all(userIds.map(id => base44.asServiceRole.entities.User.get(id)));
    await Promise.all(users.map(u => {
        const delta = balanceDeltas[u.id] || 0;
        return base44.asServiceRole.entities.User.update(u.id, {
            total_balance: Math.max(0, (u.total_balance || 0) + delta)
        });
    }));

    // 4. Mark fund cancelled
    await base44.asServiceRole.entities.MatchFund.update(fundId, { status: 'cancelled' });
}