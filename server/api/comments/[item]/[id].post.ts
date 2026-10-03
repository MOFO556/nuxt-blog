import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { commentAttachments, comments } from '~~/server/database/schema';
import { commentInsertSchema } from '~~/server/database/comments.validators';
import { requireAuth } from '~~/server/utils/auth';
import { broadcast } from '~~/server/utils/broadcast';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const { id: postId } = await getValidatedRouterParams(event, paramsSchema.parse);
  const userId = event.context.user.id;
  const item = getRouterParam(event, 'item');
  const { text, images, parentId } = await useSafeReadValidateBody(event, commentInsertSchema);

  if (item !== 'post')
    throw createError({ statusCode: 400, statusMessage: 'Unsupported comment target' });

  if (parentId != null) {
    const parent = await useDb().select().from(comments).where(eq(comments.id, parentId)).get();
    if (!parent)
      throw createError({ statusCode: 404, statusMessage: 'Parent comment not found' });
    if (parent.postId !== postId)
      throw createError({ statusCode: 400, statusMessage: 'Parent comment belongs to another post' });
  }

  let created;
  try {
    [created] = await useDb()
      .insert(comments)
      .values({
        text: text ?? '',
        postId,
        userId,
        parentId: parentId ?? null,
      })
      .returning();
  }
  catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
    if (code.includes('SQLITE_CONSTRAINT_UNIQUE')) {
      throw createError({ statusCode: 409, statusMessage: 'Already saved' });
    }
    throw error;
  }

  if (images?.length && created?.id) {
    await useDb()
      .insert(commentAttachments)
      .values(images.map(i => ({
        commentId: created.id,
        imageId: i.id,
      })));
  }

  const comment = {
    ...created,
    user: event.context.user,
    attachments: [],
    deletedAt: null,
  };

  broadcast(`post:${postId}`, { type: 'comment:created', comment });

  setResponseStatus(event, 201);
  return created;
});