import { Post, postAttachments, posts, postTags, tags } from '~~/server/database/schema';
import { useSafeReadValidateBody } from '~~/server/composable/useSafeReadValidateBody';
import { postInsertSchema } from '~~/server/database/posts.validators';
import { requireAuth } from '~~/server/utils/auth';
import { inArray } from 'drizzle-orm';
import { slugify } from '~~/shared/utils/slugify';

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const input = await useSafeReadValidateBody(event, postInsertSchema);
  const { images }: { images?: { postCover: boolean, id: number }[] } = await readBody(event);
  let created: Post | undefined;
  
  useDb().transaction(tx => {
    try {
      created = tx.insert(posts).values({...input, userId}).returning().get();
    }
    catch (error: any) {
      if (String(error?.code).includes('SQLITE_CONSTRAINT_UNIQUE')) {
        throw createError({ statusCode: 409, statusMessage: 'Already saved' });
      }
      throw error;
    }
    try {
      if (images?.length && !!created?.id) {
        const postCoverId = images.findIndex(i => i.postCover === true);
        tx.insert(postAttachments)
          .values(images.map((i: { postCover: boolean, id: number }, index: number) => ({          
            postId: created!.id,
            imageId: i.id,
            postCover: postCoverId === -1 ? index === 0 : postCoverId === index
          }))).run();
        }
    }
    catch (error: any) {
      throw error;
    }
    const tagNames = input.tags ?? [];
    if (tagNames.length && created?.id) {
      const pairs = tagNames.map(t => ({
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
  setResponseStatus(event, 201);
  return created;
})