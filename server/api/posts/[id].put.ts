import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  useSafeReadValidateBody,
  validateBodyWithSchema,
} from '~~/server/composable/useSafeReadValidateBody';
import { postAttachments, posts, postTags, tags } from '~~/server/database/schema';
import { postPatchSchema } from '~~/server/database/posts.validators';
import { assertUserMayAttachPostImages } from '~~/server/utils/assertUserMayAttachPostImages';
import { slugify } from '~~/shared/utils/slugify';
import { sanitizePostHtml } from '~~/shared/utils/sanitizePostHtml';
import { buildPostExcerpt } from '~~/shared/utils/buildPostExcerpt';
import { PostMode } from '~~/shared/types/posts';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });
const imagesBodySchema = z.object({
  images: z.array(z.object({
    id: z.number().int().positive(),
    postCover: z.boolean(),
  })).optional(),
});

export default defineEventHandler(async (event) => {  
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const { tags: tagInput, ...patch } = await useSafeReadValidateBody(event, postPatchSchema);
  const { images } = imagesBodySchema.parse(await readBody(event));

  if (Object.keys(patch).length === 0 && tagInput === undefined && !images?.length)
    throw createError({ statusCode: 400, statusMessage: 'Empty patch' });

  const updated = await useDb().transaction(tx => {
    const post = tx.select().from(posts).where(eq(posts.id, id)).get();
      
    if (!post)
      throw createError({ statusCode: 404, statusMessage: 'Not found' });

    if (post.userId !== userId)
      throw createError({ statusCode: 403, statusMessage: "Not allowed! Foreigner post" });

    if (patch.content !== undefined || patch.contentHtml !== undefined) {
      validateBodyWithSchema(
        {
          content: patch.content,
          contentHtml: patch.contentHtml,
          mode: post.mode,
        },
        postPatchSchema,
      );
    }

    const nextContent = patch.content ?? post.content;
    const nextDescription = patch.description !== undefined
      ? patch.description
      : post.description;

    let nextContentHtml = post.contentHtml;
    if (post.mode === PostMode.Formatted) {
      if (patch.contentHtml !== undefined)
        nextContentHtml = sanitizePostHtml(patch.contentHtml);
    }
    else
      nextContentHtml = null;

    const excerpt = buildPostExcerpt({
      mode: post.mode,
      description: nextDescription,
      content: nextContent,
      contentHtml: nextContentHtml,
    });

    const {
      contentHtml: _ignoredHtml,
      description: _ignoredDesc,
      mode: _ignoredMode,
      ...restPatch
    } = patch;

    const updated = tx.update(posts)
      .set({
        ...restPatch,
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(post.mode === PostMode.Formatted && patch.contentHtml !== undefined
          ? { contentHtml: nextContentHtml }
          : {}),
        excerpt,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(posts.id, id)).returning().get();

    if (tagInput !== undefined) {
      const incoming = tagInput.map(t => ({
        name: t.name.trim(),
        slug: (t.slug ?? slugify(t.name)).toLowerCase(),
      }));

      const current = tx.select().from(postTags).where(eq(postTags.postId, id)).all();
      const currentIds = new Set(current.map(c => c.tagId));

      if (!incoming.length) {
        if (currentIds.size)
          tx.delete(postTags).where(eq(postTags.postId, id)).run();
      } else {
        tx.insert(tags).values(incoming).onConflictDoNothing().run();

        const tagRows = tx.select().from(tags)
          .where(inArray(tags.slug, incoming.map(p => p.slug)))
          .all();

        const incomingIds = new Set(tagRows.map(t => t.id));
        const toRemove = [...currentIds].filter(tid => !incomingIds.has(tid));
        const toAdd    = tagRows.filter(t => !currentIds.has(t.id));

        if (toRemove.length)
          tx.delete(postTags)
            .where(and(eq(postTags.postId, id), inArray(postTags.tagId, toRemove)))
            .run();

        if (toAdd.length)
          tx.insert(postTags)
            .values(toAdd.map(t => ({ postId: id, tagId: t.id })))
            .onConflictDoNothing()
            .run();
      }
    }

    if (images) {
      if (images.length)
        assertUserMayAttachPostImages(tx, {
          userId,
          imageIds: images.map(i => i.id),
          postId: id,
        });
      tx.delete(postAttachments).where(eq(postAttachments.postId, id)).run();
      if (images.length) {
        const postCoverId = images.findIndex(i => i.postCover === true);
        tx.insert(postAttachments)
          .values(images.map((i: { postCover: boolean, id: number }, index: number) => ({
            postId: id,
            imageId: i.id,
            postCover: postCoverId === -1
              ? (post.mode === PostMode.Legacy && index === 0)
              : postCoverId === index,
          })))
          .run();
      }
    }

    return updated;
  });

  if (updated?.id) {
    void import('#server-utils/assistant/indexPostById')
      .then(({ indexPostById }) => indexPostById(updated.id))
      .catch((err) => console.warn('[assistant] index after update failed', err));
  }

  return updated;
})
