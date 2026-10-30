import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { commentAttachments, comments, images } from '~~/server/database/schema';
import { commentInsertSchema } from '~~/server/database/comments.validators';
import { assertUserMayAttachPostImages } from '~~/server/utils/assertUserMayAttachPostImages';
import { requireAuth } from '~~/server/utils/auth';
import { broadcast } from '~~/server/utils/broadcast';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const { id: postId } = await getValidatedRouterParams(event, paramsSchema.parse);
  const userId = event.context.user.id;
  const item = getRouterParam(event, 'item');
  const { text, images: imageInputs, parentId } = await useSafeReadValidateBody(event, commentInsertSchema);

  if (item !== 'post')
    throw createError({ statusCode: 400, statusMessage: 'Unsupported comment target' });

  if (parentId != null) {
    const parent = await useDb().select().from(comments).where(eq(comments.id, parentId)).get();
    if (!parent)
      throw createError({ statusCode: 404, statusMessage: 'Parent comment not found' });
    if (parent.postId !== postId)
      throw createError({ statusCode: 400, statusMessage: 'Parent comment belongs to another post' });
  }

  const imageIds = imageInputs?.map(i => i.id) ?? [];

  if (imageIds.length) {
    assertUserMayAttachPostImages(useDb(), {
      userId,
      imageIds,
    });
  }

  let created;
  let attachments: {
      path: string;
      description: string | null;
      name: string;
  }[] = [];
  try {
    created = await useDb().transaction((tx) => {
      const row = tx
        .insert(comments)
        .values({
          text: text ?? '',
          postId,
          userId,
          parentId: parentId ?? null,
        })
        .returning()
        .get();

      if (imageIds.length && row?.id) {
        tx.insert(commentAttachments)
          .values(imageIds.map(imageId => ({
            commentId: row.id,
            imageId,
          })))
          .run();

        const rows = tx
          .select({
            id: images.id,
            path: images.path,
            description: images.description,
            name: images.name,
          })
          .from(images)
          .where(inArray(images.id, imageIds))
          .all();

        const byId = new Map(rows.map(r => [r.id, r]));
        attachments = imageIds.flatMap((imageId) => {
          const image = byId.get(imageId);
          if (!image)
            return [];
          return [{
            path: image.path,
            description: image.description,
            name: image.name,
          }];
        });
      }

      return row;
    });
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

  const comment = {
    ...created,
    user: event.context.user,
    attachments,
    deletedAt: null,
  };

  broadcast(`post:${postId}`, { type: 'comment:created', comment });

  setResponseStatus(event, 201);
  return created;
});