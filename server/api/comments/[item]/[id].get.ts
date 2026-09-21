import { eq } from "drizzle-orm";
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
        },
        attachments: {
          columns: { imageId: true },
          with: {
            image: {
              columns: {
                path: true
              },
            },
          },
        },
      },
    });

  if (!commentsArray)
    throw createError({ statusCode: 404, statusMessage: 'Not found' });

  return commentsArray.map(comment => ({
      ...comment,
      attachments: comment.attachments.map(att => ({
        path: att.image?.path,
      })),
    }));
  // return [    
	// 	{ id: 1, text: `Comment for ${item} ${id}` },
	// 	{ id: 2, text: `Comment other text for ${item} ${id}` }
  // ]
})