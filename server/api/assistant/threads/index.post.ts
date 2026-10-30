import { z } from 'zod';
import { requireAuth } from '~~/server/utils/auth';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { createThread } from '#server-utils/assistant/threads';

const bodySchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
});

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  const body = await useSafeReadValidateBody(event, bodySchema);
  const thread = createThread(user.id, body.title ?? 'New chat');
  setResponseStatus(event, 201);
  return thread;
});