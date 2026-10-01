import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { postAttachments, posts, postTags, tags } from '~~/server/database/schema';
import { postPatchSchema } from '~~/server/database/posts.validators';
import { slugify } from '~~/server/utils/slugify';

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async (event) => {  
  await requireAuth(event);
  const userId = event.context.user.id;
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  const { tags: tagInput, ...patch } = await useSafeReadValidateBody(event, postPatchSchema);
  const { images }: { images?: { postCover: boolean, id: number }[] } = await readBody(event);

  if (Object.keys(patch).length === 0 && tagInput === undefined && !images?.length)
    throw createError({ statusCode: 400, statusMessage: 'Empty patch' });

  const updated = await useDb().transaction(tx => {
    const post = tx.select().from(posts).where(eq(posts.id, id)).get();
      
    if (!post)
      throw createError({ statusCode: 404, statusMessage: 'Not found' });

    if (post.userId !== userId)
      throw createError({ statusCode: 403, statusMessage: "Not allowed! Foreigner post" });

    const updated =  tx.update(posts)
      .set({...patch, updatedAt: sql`CURRENT_TIMESTAMP`})
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
    return updated;
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