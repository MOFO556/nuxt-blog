import { Comment, commentAttachments, comments } from '~~/server/database/schema';
import { requireAuth } from '~~/server/utils/auth';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const item = getRouterParam(event, 'item');
  const id = getRouterParam(event, 'id');
  const userId = event.context.user.id;
  // const input = await readValidatedBody(event, postInsertSchema.parse);
  // const input = await useSafeReadValidateBody(event, postInsertSchema);
  const body = await readBody(event);
    const { images }: { images?: { id: number }[] } = body;
    let created: Comment | undefined;

  try {
    [created] = await useDb()
      .insert(comments)
      .values({
        text: body.text,
        postId: Number(id),
        userId
      })
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
        await useDb()
          .insert(commentAttachments)
          .values(images.map(i => ({          
            commentId: created.id,
            imageId: i.id
          })));
      }
      catch (error: any) {
        throw error;
      }

  broadcast(`post:${id}`, { type: 'comment:created', comment: { ...created, user: event.context.user } });
  
  setResponseStatus(event, 201)
  return created;
})