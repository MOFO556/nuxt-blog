import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { commentAttachments, comments } from '~~/server/database/schema';
import { commentPatchSchema } from '~~/server/database/comments.validators';
import { requireAuth } from '~~/server/utils/auth';
import { broadcast } from '~~/server/utils/broadcast';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const { text, images } = await useSafeReadValidateBody(event, commentPatchSchema);

  const existing = await useDb().select().from(comments).where(eq(comments.id, id)).get();
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (existing.userId !== userId)
    throw createError({ statusCode: 403, statusMessage: 'Not allowed! Foreigner comment' });
  if (existing.deletedAt)
    throw createError({ statusCode: 400, statusMessage: 'Comment is deleted' });

  const updated = await useDb().transaction((tx) => {
    const row = tx.update(comments)
      .set({
        text: text ?? '',
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(comments.id, id))
      .returning()
      .get();

    if (images !== undefined) {
      tx.delete(commentAttachments).where(eq(commentAttachments.commentId, id)).run();
      if (images.length) {
        tx.insert(commentAttachments)
          .values(images.map(i => ({ commentId: id, imageId: i.id })))
          .onConflictDoNothing()
          .run();
      }
    }

    return row;
  });

  if (updated?.postId)
    broadcast(`post:${updated.postId}`, {
      type: 'comment:updated',
      comment: {
        ...updated,
        user: event.context.user,
      },
    });

  return updated;
});