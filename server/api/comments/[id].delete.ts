import { eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { blob } from 'hub:blob';
import { commentAttachments, comments, images } from '~~/server/database/schema';
import { requireAuth } from '~~/server/utils/auth';
import { broadcast } from '~~/server/utils/broadcast';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);

  const existing = await useDb().select().from(comments).where(eq(comments.id, id)).get();
  if (!existing)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  if (existing.userId !== userId)
    throw createError({ statusCode: 403, statusMessage: 'Not allowed! Foreigner comment' });
  if (existing.deletedAt)
    throw createError({ statusCode: 400, statusMessage: 'Comment is already deleted' });

  const orphanBlobs: string[] = [];

  const updated = await useDb().transaction((tx) => {
    const attached = tx.select({
      id: images.id,
      path: images.path,
    })
      .from(commentAttachments)
      .where(eq(commentAttachments.commentId, id))
      .leftJoin(images, eq(images.id, commentAttachments.imageId))
      .all();

    const imageIds = attached.map(a => a.id).filter((v): v is number => v !== null);
    orphanBlobs.push(...attached.map(a => a.path).filter((v): v is string => !!v));

    if (imageIds.length)
      tx.delete(images).where(inArray(images.id, imageIds)).run();

    return tx.update(comments)
      .set({
        text: '',
        deletedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(comments.id, id))
      .returning()
      .get();
  });

  await Promise.all(orphanBlobs.map(p => blob.del(p).catch(() => undefined)));

  if (updated?.postId)
    broadcast(`post:${updated.postId}`, {
      type: 'comment:deleted',
      comment: {
        ...updated,
        user: event.context.user,
        attachments: [],
      },
    });

  return updated;
});