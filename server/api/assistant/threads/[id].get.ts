import { z } from 'zod';
import { requireAuth } from '~~/server/utils/auth';
import { parseStoredUiMessages } from '#server-utils/assistant/parseMessages';
import { getThreadForUser, listMessages } from '#server-utils/assistant/threads';

const paramsSchema = z.object({ id: z.string().uuid() });

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const thread = getThreadForUser(id, user.id);
  if (!thread)
    throw createError({ statusCode: 404, statusMessage: 'Thread not found' });

  const stored = listMessages(id);
  const uiMessages = await parseStoredUiMessages(stored);
  const byId = new Map(stored.map(m => [m.id, m]));

  const messages = uiMessages.map(m => ({
    id: m.id,
    role: m.role,
    parts: m.parts,
    createdAt: byId.get(m.id)?.createdAt ?? '',
  }));

  return { thread, messages };
});