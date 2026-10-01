import { and, eq, gte, lte, like, or, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { posts, tags, postTags, users, publicUserColumns } from '~~/server/database/schema';

const querySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().min(1).max(255).optional(),
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  author: z.string().trim().min(1).max(50).optional(),
  tags: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export default defineEventHandler(async (event) => {
  const { q, from, to, author, url, tags: tagsParam, page, limit } =
    await getValidatedQuery(event, querySchema.parse);

  const db = useDb();
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (q) {
    const needle = `%${q.toLowerCase()}%`;
    conditions.push(or(like(posts.title, `%${needle}%`), like(posts.content, `%${needle}%`)));
  }
  if (from)
    conditions.push(gte(posts.createdAt, `${from} 00:00:00`));
  if (to)
    conditions.push(lte(posts.createdAt, `${to} 23:59:59`));

  if (url)
    conditions.push(sql`lower(${posts.url}) like ${`%${url.toLowerCase()}%`}`);

  const { rows, total } = await db.transaction(tx => {
    if (author) {
      const u = tx.select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.login}) = ${author.toLowerCase()}`)
        .get();
      conditions.push(u ? eq(posts.userId, u.id) : sql`0`);
    }
    if (tagsParam) {
      const slugs = tagsParam.split(',').map(s => s.trim()).filter(Boolean);
      if (slugs.length) {
        const ids = tx.select({ id: tags.id }).from(tags).where(inArray(tags.slug, slugs)).all();
        if (ids?.length) {
          const postIds = tx.select({ id: postTags.postId }).from(postTags)
            .where(inArray(postTags.tagId, ids.map(t => t.id))).all();
          conditions.push(postIds.length ? inArray(posts.id, postIds.map(p => p.id)) : sql`0`);
        } else 
          conditions.push(sql`0`);
      }
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const rows = tx.query.posts.findMany({
        where,
        with: {
          user: { columns: publicUserColumns },
          attachments: {
            columns: { imageId: true, postCover: true },
            with: { image: { columns: { path: true, description: true } } },
          },
          postTags: { with: { tag: { columns: { id: true, name: true, slug: true } } } },
        },
        orderBy: (p, { desc }) => [desc(p.createdAt)],
        limit, offset,
      }).sync()

      const total = tx.select({ total: sql<number>`count(*)` }).from(posts).where(where).get();

      return { rows, total };
  });

  const data = rows.map(p => ({
    ...p,
    tags: p.postTags.map(pt => pt.tag),
    postTags: undefined,
    attachments: p.attachments.map(a => ({
      path: a.image?.path, postCover: a.postCover, description: a.image?.description,
    })),
  }));

  return { data, pagination: { page, limit, ...total } };
});