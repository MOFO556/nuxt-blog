import { desc, eq } from "drizzle-orm";
import z from "zod";
import { comments, publicUserColumns } from "~~/server/database/schema";

const paramsSchema = z.object({ id: z.coerce.number().int().positive() });

export default defineEventHandler(async event => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse);
  
  const item = getRouterParam(event, 'item');
  // const id = getRouterParam(event, 'id');
  
  const commentsArray = await useDb().query.comments.findMany({
      where: eq(comments.postId, id),
      with: {
        user: {
          columns: publicUserColumns,
          with: {
            avatar: {
              columns: {
                path: true, 
              }
            }
          }
        },
        attachments: {
          columns: { imageId: true },
          with: {
            image: {
              columns: {
                path: true,
                description: true
              },
            },
          },
        },
      },
      orderBy: desc(comments.createdAt)
    });

  if (!commentsArray)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  return commentsArray.map(comment => {
    const avatar = comment.user.avatar?.path;
    return {
      ...comment,
      user: {
        id: comment.user.id,
        login: comment.user.login,
        avatar
      },
      attachments: comment.attachments.map(att => ({
        path: att.image?.path,
        description: att.image?.description,
      })),
    }
  });
})