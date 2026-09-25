import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { posts, publicUserColumns } from '~~/server/database/schema';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const rawPost = await useDb().query.posts.findFirst({
      where: eq(posts.id, id),
      with: {
        user: {
          columns: publicUserColumns,
        },
        attachments: {
          columns: { imageId: true, postCover: true },
          with: {
            image: {
            columns: { path: true, description: true }
            },
          },
        },
      },
    });
    
  if (!rawPost)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  return {
      ...rawPost,
      attachments: rawPost.attachments.map(att => ({
        path: att.image?.path,
        postCover: att?.postCover,
        description: att.image?.description
      })),
    };
})