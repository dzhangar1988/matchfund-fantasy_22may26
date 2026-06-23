import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiver_id, fund_id } = await req.json();
    if (!receiver_id || !fund_id) return Response.json({ error: 'receiver_id and fund_id required' }, { status: 400 });

    // Check not already respected this fund
    const existing = await base44.entities.ShowRespect.filter({ giver_id: user.id, receiver_id, fund_id });
    if (existing.length > 0) return Response.json({ error: 'Already respected' }, { status: 400 });

    // Create respect record
    await base44.entities.ShowRespect.create({
      giver_id: user.id,
      receiver_id,
      fund_id,
      created_at: new Date().toISOString(),
    });

    // Increment receiver's show_respects_received (service role — can read/update any user)
    const receiver = await base44.asServiceRole.entities.User.get(receiver_id);
    const newCount = (receiver.show_respects_received || 0) + 1;
    const updates = { show_respects_received: newCount };
    if (newCount % 10 === 0) {
      updates.respect_points = (receiver.respect_points || 0) + 1;
    }
    await base44.asServiceRole.entities.User.update(receiver_id, updates);

    return Response.json({ ok: true, show_respects_received: newCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});