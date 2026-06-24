import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fund_id } = await req.json();
    if (!fund_id) return Response.json({ error: 'fund_id required' }, { status: 400 });

    const fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    if (!fund) return Response.json({ error: 'Fund not found' }, { status: 404 });
    if (fund.creator_id !== user.id) return Response.json({ error: 'Only the creator can cancel' }, { status: 403 });

    // Reuse shared refund logic
    await base44.functions.invoke('refundFundParticipants', { fund_id });

    // Mark fund cancelled
    await base44.asServiceRole.entities.MatchFund.update(fund_id, { status: 'cancelled' });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});