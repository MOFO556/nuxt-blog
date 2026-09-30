import { and, eq } from "drizzle-orm";
import { credentials, sessions, users } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const id = getRouterParam(event, 'id');

  if (!id)
    throw createError({ statusCode: 422, statusMessage: "Unable to delete credentials - unknown id"});

  await useDb().transaction(tx => {
    const user = tx.select().from(users).where(eq(users.id, userId)).get();
    const own = tx.select().from(credentials).where(eq(credentials.userId, userId)).all();
    const target = own.find(c => c.id === id);
    if (!target) 
      throw createError({ statusCode: 404, statusMessage: 'Passkey not found' });

    if (own.length <= 1 && !user?.password)
      throw createError({ statusCode: 422, statusMessage: 'Cannot remove your only sign-in method' });

    tx.delete(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, userId)));
      
    tx.update(sessions)
    .set({ invalidated: true, invalidReason: "passkey removed" })
    .where(eq(sessions.credentialId, id))
    .run();
  })

  broadcast(`user:${userId}`, { type: 'sessions:removed' });
  return { ok: true };
});