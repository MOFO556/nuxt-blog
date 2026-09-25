import { like, or } from 'drizzle-orm';
import { z } from 'zod';
import { posts, publicUserColumns } from '~~/server/database/schema';

const querySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  const { q, limit, offset } = await getValidatedQuery(event, querySchema.parse);
  const db = useDb();

  const where = q
    ? or(
        like(posts.title, `%${q}%`),
        like(posts.url, `%${q}%`),
      )
    : undefined;
  
  const rawPosts = await db.query.posts.findMany({
    where,
    with: {
      user: {
        columns: publicUserColumns,
      },
      attachments: {
        columns: { imageId: true, postCover: true },
        with: {
          image: {
            columns: { path: true, description: true }
          }
        }
      }
    },
    orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    limit,
    offset,
  });

  return rawPosts.map(rawPost => ({
      ...rawPost,
      attachments: rawPost.attachments.map(att => ({
        path: att.image?.path,
        postCover: att?.postCover,
        description: att.image?.description
      })),
    }));

  // return db
  //   .select()
  //   .from(posts)
  //   .where(filters.length ? and(...filters) : undefined)
  //   .orderBy(desc(posts.createdAt))
  //   .limit(limit)
  //   .offset(offset);
})