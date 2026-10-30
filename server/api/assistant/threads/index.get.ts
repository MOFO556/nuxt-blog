import { requireAuth } from '~~/server/utils/auth';
import { listThreadsForUser } from '#server-utils/assistant/threads';

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  return listThreadsForUser(user.id);
});