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

    const participations = await base44.asServiceRole.entities.Participation.filter({ fund_id });

    const userIds = [...new Set(participations.map(p => p.user_id).filter(Boolean))];

    const safeUsers = await Promise.all(
      userIds.map(async (uid) => {
        try {
          const u = await base44.asServiceRole.entities.User.get(uid);
          return {
            user_id: u.id,
            username: u.username || null,
            avatar_url: u.avatar_url || null,
          };
        } catch {
          return { user_id: uid, username: null, avatar_url: null };
        }
      })
    );

    const usersMap = {};
    for (const u of safeUsers) usersMap[u.user_id] = u;

    return Response.json({ users: usersMap });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});