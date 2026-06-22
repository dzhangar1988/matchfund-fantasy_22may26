import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const now = new Date().toISOString();

        // 1. Flip upcoming matches to "live" when match_date has passed
        const upcomingMatches = await base44.asServiceRole.entities.Match.filter({ status: "upcoming" });
        let matchesFlipped = 0;
        for (const match of upcomingMatches) {
            if (match.match_date && match.match_date <= now) {
                await base44.asServiceRole.entities.Match.update(match.id, { status: "live" });
                matchesFlipped++;
            }
        }

        // 2. Close open funds whose first match has started
        const openFunds = await base44.asServiceRole.entities.MatchFund.filter({ status: "open" });
        let fundsClosed = 0;
        for (const fund of openFunds) {
            if (fund.first_match_starts_at && fund.first_match_starts_at <= now) {
                await base44.asServiceRole.entities.MatchFund.update(fund.id, { status: "closed" });
                fundsClosed++;
            }
        }

        return Response.json({
            matches_flipped: matchesFlipped,
            funds_closed: fundsClosed,
            checked_matches: upcomingMatches.length,
            checked_funds: openFunds.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});