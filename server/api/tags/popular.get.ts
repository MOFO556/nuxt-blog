import { desc, eq, sql } from 'drizzle-orm';
import { tags, postTags } from '~~/server/database/schema';

export default defineEventHandler(async (event) => {
  const limit = Math.min(Number(getQuery(event).limit) || 10, 50);
  return useDb()
      .select({
        slug: tags.slug,
        name: tags.name,
        count: sql<number>`count(${postTags.postId})`.as('count'),
      })
      .from(tags)
      .innerJoin(postTags, eq(postTags.tagId, tags.id))
      .groupBy(tags.id)
      .orderBy(desc(sql`count(${postTags.postId})`), tags.name)
      .limit(limit);
});