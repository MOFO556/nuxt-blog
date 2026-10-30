import { z } from 'zod';
import { requireAuth } from '~~/server/utils/auth';
import { deleteThreadForUser } from '#server-utils/assistant/threads';

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const deleted = deleteThreadForUser(id, user.id);
  if (!deleted)
    throw createError({ statusCode: 404, statusMessage: 'Thread not found' });
  return deleted;
});