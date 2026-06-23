import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();

    const safe = allUsers.map(u => ({
      id: u.id,
      username: u.username || null,
      avatar_url: u.avatar_url || null,
      respect_points: u.respect_points || 0,
    }));

    return Response.json({ users: safe });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});