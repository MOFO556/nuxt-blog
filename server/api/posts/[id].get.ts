import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { posts, publicUserColumns } from '~~/server/database/schema';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const post = await useDb().query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        user: {
          columns: publicUserColumns,
        },
        images: {
          columns: { path: true, postCover: true }
        },
      },
    });
    
  if (!post)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  return post;
})