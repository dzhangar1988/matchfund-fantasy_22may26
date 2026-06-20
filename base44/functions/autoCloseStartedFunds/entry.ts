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
        for (const fund of toClose) {
            await base44.asServiceRole.entities.MatchFund.update(fund.id, { status: "closed" });
            fundsClosed++;
        }

        return Response.json({ fundsClosed, checked: openFunds.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});