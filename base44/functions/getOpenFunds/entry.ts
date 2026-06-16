import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [openFunds, inProgressFunds] = await Promise.all([
      base44.asServiceRole.entities.MatchFund.filter({ status: "open" }, "-created_date", 100),
      base44.asServiceRole.entities.MatchFund.filter({ status: "in_progress" }, "-created_date", 50),
    ]);

    return Response.json({ funds: [...openFunds, ...inProgressFunds] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});