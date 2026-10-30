import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { posts } from '~~/server/database/schema';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const existing = await useDb().query.posts.findFirst({
    where: eq(posts.id, id),
    columns: { id: true, userId: true },
  });

  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  if (existing.userId !== userId)
    throw createError({ statusCode: 403, statusMessage: 'Not allowed! Foreigner post' });

  const [row] = await useDb()
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.userId, userId)))
    .returning();

  if (!row)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  deletePostVectors(id)
    .catch((err) => console.warn('[assistant] vector cleanup after delete failed', err));

  return row;
})
