import { and, eq } from "drizzle-orm";
import { sessions } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const { session: current, user } = await requireAuth(event);
  const id = getRouterParam(event, 'id');
  const targetId = id === 'current' ? current.id : id;

  if(!current.userId)
    throw createError({ statusCode: 422, statusMessage: 'Invalid session data'});

  if (targetId)
    await useDb().update(sessions)
      .set({ revoked: true })
      .where(and(
        eq(sessions.id, targetId), 
        eq(sessions.userId, current.userId)
      ));
  else
    throw createError({ statusCode: 422, statusMessage: 'Invalid session data'});

  broadcast(`user:${user.id}`, { type: 'sessions:revoke', session: { id: targetId} });
  return { ok: true };
});