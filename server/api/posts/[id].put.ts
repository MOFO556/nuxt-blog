import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { posts } from '~~/server/database/schema';
import { postPatchSchema } from '~~/server/database/posts.validators';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const patch = await readValidatedBody(event, postPatchSchema.parse);

  if (Object.keys(patch).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Empty patch' });

  const [updated] = await useDb()
    .update(posts)
    .set(patch)
    .where(eq(posts.id, id))
    .returning();

  if (!updated)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  return updated;
})