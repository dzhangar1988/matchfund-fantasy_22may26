import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Get all participations for this fund (service role — bypasses RLS)
    const participations = await base44.asServiceRole.entities.Participation.filter({ fund_id });

    // Batch-load predictions for every participation (service role)
    const predictionsMap = {};
    await Promise.all(
      participations.map(async (p) => {
        const preds = await base44.asServiceRole.entities.Prediction.filter({ participation_id: p.id });
        predictionsMap[p.id] = preds;
      })
    );

    return Response.json({
      predictionsMap,
      participations,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});