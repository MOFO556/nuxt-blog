import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { postAttachments, posts } from '~~/server/database/schema';
import { postPatch, postPatchSchema } from '~~/server/database/posts.validators';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {  
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const patch = await useSafeReadValidateBody<postPatch>(event, postPatchSchema);
  const { images }: { images?: { postCover: boolean, id: number }[] } = await readBody(event);

  if (Object.keys(patch).length === 0)
    throw createError({ statusCode: 400, statusMessage: 'Empty patch' });

  const updated = await useDb().transaction(tx => {
    const post = tx.select().from(posts).where(eq(posts.id, id)).get();
      
    if (!post)
      throw createError({ statusCode: 404, statusMessage: 'Not found' });

    if (post.userId !== userId)
      throw createError({ statusCode: 401, statusMessage: "Not allowed! Foreigner post" });

    return tx.update(posts)
      .set({...patch, updatedAt: sql`CURRENT_TIMESTAMP`})
      .where(eq(posts.id, id)).returning().get();
  });


  if (images?.length)
    try {
      const postCoverId = images.findIndex(i => i.postCover === true);
      await useDb()
        .insert(postAttachments)
        .values(images.map((i: { postCover: boolean, id: number }, index: number) => ({          
          postId: id,
          imageId: i.id,
          postCover: postCoverId === -1 ? index === 0 : postCoverId === index
        })));
    }
    catch (error: any) {
      throw error;
    }

  return updated;
})