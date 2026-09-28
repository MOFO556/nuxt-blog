import { Post, postAttachments, posts } from '~~/server/database/schema';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { postInsertSchema } from '~~/server/database/posts.validators';
import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const input = await useSafeReadValidateBody(event, postInsertSchema);
  const { images }: { images?: { postCover: boolean, id: number }[] } = await readBody(event);
  let created: Post | undefined;

  try {
    [created] = await useDb()
      .insert(posts)
      .values({...input, userId})
      .returning();
  }
  catch (error: any) {
    if (String(error?.code).includes('SQLITE_CONSTRAINT_UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'Already saved' });
    }
    throw error;
  }
  if (images?.length && !!created?.id)
    try {
      const postCoverId = images.findIndex(i => i.postCover === true);
      await useDb()
        .insert(postAttachments)
        .values(images.map((i: { postCover: boolean, id: number }, index: number) => ({          
          postId: created.id,
          imageId: i.id,
          postCover: postCoverId === -1 ? index === 0 : postCoverId === index
        })));
    }
    catch (error: any) {
      throw error;
    }

  setResponseStatus(event, 201);
  return created;
})