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

    // Strip private fields — same privacy rule as getFundParticipants.
    // user_email and device_info must never leak to other players.
    const safeParticipations = participations.map((p) => ({
      id: p.id,
      user_id: p.user_id,
      user_name: p.user_name,
      entry_paid: p.entry_paid,
      potential_payout: p.potential_payout,
      final_payout: p.final_payout,
      creator_bonus: p.creator_bonus,
      credits_used: p.credits_used,
      total_points: p.total_points,
      final_rank: p.final_rank,
      status: p.status,
      is_creator: p.is_creator,
      joined_at: p.joined_at,
      predictions_completed_at: p.predictions_completed_at,
      paid_out_at: p.paid_out_at,
    }));

    return Response.json({
      predictionsMap,
      participations: safeParticipations,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});