import { Post, postAttachments, posts, postTags, tags } from '~~/server/database/schema';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { postInsertSchema } from '~~/server/database/posts.validators';
import { requireAuth } from '~~/server/utils/auth';
import { assertUserMayAttachPostImages } from '~~/server/utils/assertUserMayAttachPostImages';
import { inArray } from 'drizzle-orm';
import { slugify } from '~~/shared/utils/slugify';
import { sanitizePostHtml } from '~~/shared/utils/sanitizePostHtml';
import { buildPostExcerpt } from '~~/shared/utils/buildPostExcerpt';
import { PostMode } from '~~/shared/types/posts';
import { z } from 'zod';

const imagesBodySchema = z.object({
  images: z.array(z.object({
    id: z.number().int().positive(),
    postCover: z.boolean(),
  })).optional(),
});

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const input = await useSafeReadValidateBody(event, postInsertSchema);
  const { images } = imagesBodySchema.parse(await readBody(event));
  let created: Post | undefined;

  const { tags: tagNames, contentHtml, description, mode, ...postFields } = input;
  const sanitizedHtml = mode === PostMode.Formatted && contentHtml
    ? sanitizePostHtml(contentHtml)
    : null;
  const excerpt = buildPostExcerpt({
    mode,
    description,
    content: postFields.content,
    contentHtml: sanitizedHtml,
  });
  
  useDb().transaction(tx => {
    try {
      created = tx.insert(posts).values({
        ...postFields,
        mode,
        description: description || null,
        contentHtml: sanitizedHtml,
        excerpt,
        userId,
      }).returning().get();
    }
    catch (error: unknown) {
      if (
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && String(error.code).includes('SQLITE_CONSTRAINT_UNIQUE')
      ) {
        throw createError({ statusCode: 409, statusMessage: 'Already saved' });
      }
      throw error;
    }
    if (images?.length && !!created?.id) {
      assertUserMayAttachPostImages(tx, {
        userId,
        imageIds: images.map(i => i.id),
      });
      const postCoverId = images.findIndex(i => i.postCover === true);
      tx.insert(postAttachments)
        .values(images.map((i: { postCover: boolean, id: number }, index: number) => ({
          postId: created!.id,
          imageId: i.id,
          postCover: postCoverId === -1
            ? (mode === PostMode.Legacy && index === 0)
            : postCoverId === index,
        }))).run();
    }
    const incomingTags = tagNames ?? [];
    if (incomingTags.length && created?.id) {
      const pairs = incomingTags.map(t => ({
        name: t.name.trim(),
        slug: (t.slug ?? slugify(t.name)).toLowerCase(),
      }));

      tx.insert(tags).values(pairs).onConflictDoNothing().run();
      
      const slugs = pairs.map(p => p.slug);
      const tagRows = tx.select().from(tags)
        .where(inArray(tags.slug, slugs)).all();
      if (tagRows?.length)
        tx.insert(postTags).values(tagRows.map(t => ({ postId: created!.id, tagId: t.id })))
          .onConflictDoNothing().run();
    }
  });
  if (!!created?.id)
    indexPostById(created!.id)
      .catch((err) => console.warn('[assistant] index after create failed', err));
    
  setResponseStatus(event, 201);
  return created;
})