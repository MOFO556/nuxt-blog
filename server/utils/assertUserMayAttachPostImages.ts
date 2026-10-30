import { and, eq, inArray } from 'drizzle-orm';
import { createError } from 'h3';
import { commentAttachments, images, postAttachments } from '~~/server/database/schema';
import type { useDb } from '~~/server/utils/db';

export function assertUserMayAttachPostImages(
  db: Pick<ReturnType<typeof useDb>, 'select'>,
  args: {
    userId: number;
    imageIds: number[];
    postId?: number;
    commentId?: number;
  },
): void {
  const uniqueIds = [...new Set(args.imageIds)];
  if (!uniqueIds.length)
    return;

  const rows = db
    .select({
      id: images.id,
      uploadedBy: images.uploadedBy,
    })
    .from(images)
    .where(inArray(images.id, uniqueIds))
    .all();

  if (rows.length !== uniqueIds.length)
    throw createError({ statusCode: 422, statusMessage: 'Unknown image' });

  const alreadyAllowed = new Set<number>();
  if (args.postId != null) {
    const attached = db
      .select({ imageId: postAttachments.imageId })
      .from(postAttachments)
      .where(and(
        eq(postAttachments.postId, args.postId),
        inArray(postAttachments.imageId, uniqueIds),
      ))
      .all();
    for (const row of attached)
      alreadyAllowed.add(row.imageId);
  }

  if (args.commentId != null) {
    const attached = db
      .select({ imageId: commentAttachments.imageId })
      .from(commentAttachments)
      .where(and(
        eq(commentAttachments.commentId, args.commentId),
        inArray(commentAttachments.imageId, uniqueIds),
      ))
      .all();
    for (const row of attached)
      alreadyAllowed.add(row.imageId);
  }

  for (const row of rows) {
    if (alreadyAllowed.has(row.id))
      continue;
    if (row.uploadedBy !== args.userId)
      throw createError({ statusCode: 403, statusMessage: 'Not allowed to attach image' });
  }
}
