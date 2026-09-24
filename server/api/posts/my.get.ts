import { and, eq, like, or } from 'drizzle-orm';
import { z } from 'zod';
import { posts, publicUserColumns } from '~~/server/database/schema';
import { requireAuth } from '~~/server/utils/auth';

const querySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export default defineEventHandler(async (event) => {
  await requireAuth(event);
  const { q, limit, offset } = await getValidatedQuery(event, querySchema.parse);
  const db = useDb();

  const where = q
    ? or(
        like(posts.title, `%${q}%`),
        like(posts.url, `%${q}%`),
      )
    : undefined;
  const userFilter = eq(posts.userId, event.context.user.id);
  
   const rawPosts = await db.query.posts.findMany({
    where: where ? and(where, userFilter) : userFilter,
    with: {
      user: {
        columns: publicUserColumns,
      },
      attachments: {
        columns: { imageId: true, postCover: true },
        with: {
          image: {
            columns: { path: true }
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
        postCover: att?.postCover
      })),
    }));
})