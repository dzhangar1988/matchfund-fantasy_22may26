import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const { fund_id } = await req.json();
    if (!fund_id) return Response.json({ error: 'fund_id required' }, { status: 400 });

    const fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    if (!fund) return Response.json({ error: 'Fund not found' }, { status: 404 });

    // 1. Cancel active share listings
    const activeListings = await base44.asServiceRole.entities.ShareListing.filter({ fund_id, status: 'active' });
    await Promise.all(activeListings.map(l =>
      base44.asServiceRole.entities.ShareListing.update(l.id, { status: 'cancelled', shares_available: 0 })
    ));

    // 2. Refund share buyers & clawback from sellers
    const purchases = await base44.asServiceRole.entities.SharePurchase.filter({ fund_id });
    const balanceDeltas = {};
    for (const purchase of purchases) {
      balanceDeltas[purchase.buyer_id] = (balanceDeltas[purchase.buyer_id] || 0) + purchase.total_cost;
      balanceDeltas[purchase.seller_id] = (balanceDeltas[purchase.seller_id] || 0) - purchase.total_cost;
    }

    // 3. Refund entry fees
    const allParticipations = await base44.asServiceRole.entities.Participation.filter({ fund_id });
    for (const p of allParticipations) {
      balanceDeltas[p.user_id] = (balanceDeltas[p.user_id] || 0) + fund.entry_fee;
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

    return Response.json({ ok: true, refunds: userIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});