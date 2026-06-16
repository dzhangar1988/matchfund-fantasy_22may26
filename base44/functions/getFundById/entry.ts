import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fund_id } = await req.json();
    if (!fund_id) {
      return Response.json({ error: 'fund_id required' }, { status: 400 });
    }

    const fund = await base44.asServiceRole.entities.MatchFund.get(fund_id);
    if (!fund) {
      return Response.json({ error: 'Fund not found' }, { status: 404 });
    }

    return Response.json({ fund });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});