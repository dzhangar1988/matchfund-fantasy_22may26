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
        const multipliersFrozen = [];

        for (const fund of toClose) {
            const updateData = { status: "closed" };

            // For multiplier-mode funds: compute crowd-weighted multiplier snapshot before closing
            if (fund.scoring_mode === "multiplier") {
                // 1. Get all active participations
                const activeParts = await base44.asServiceRole.entities.Participation
                    .filter({ fund_id: fund.id, status: "active" });

                const totalActive = activeParts.length;
                const multipliers = {};

                if (totalActive > 0) {
                    // 2. Gather all predictions for these participations
                    const partIds = activeParts.map(p => p.id);
                    const partUserMap = {};
                    for (const p of activeParts) partUserMap[p.id] = p.user_id;

                    // Prediction.filter doesn't support IN, so fetch all for this fund's participations
                    // by loading predictions via participation_id one-by-one (batched)
                    const allPreds = await Promise.all(
                        partIds.map(pid =>
                            base44.asServiceRole.entities.Prediction.filter({ participation_id: pid })
                        )
                    );
                    const preds = allPreds.flat();

                    // 3. Tally distinct user_ids per ${match_id}_${option} key
                    //    Use a Set of user_ids per key so one player counts once per key
                    const pickerSets = {}; // key -> Set<user_id>
                    for (const pred of preds) {
                        const userId = partUserMap[pred.participation_id];
                        if (!userId) continue;
                        for (const opt of (pred.selected_options || [])) {
                            const key = `${pred.match_id}_${opt}`;
                            if (!pickerSets[key]) pickerSets[key] = new Set();
                            pickerSets[key].add(userId);
                        }
                    }

                    // 4. Compute multiplier for each key with ≥1 picker
                    for (const [key, userSet] of Object.entries(pickerSets)) {
                        const pickerCount = userSet.size; // always ≥1 by construction
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

        return Response.json({ fundsClosed, multipliersFrozen, checked: openFunds.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});