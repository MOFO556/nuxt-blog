import { createError, eventHandler, getRouterParam } from 'h3';
import { eq } from 'drizzle-orm';
import { commentAttachments, images, postAttachments } from '~~/server/database/schema';

export default eventHandler(async (event) => {
  const item = getRouterParam(event, 'item');
  const id = getRouterParam(event, 'id');
  let imagePath: string[] | undefined;
  if (item === "posts")
    imagePath = await useDb()
      .select()
      .from(postAttachments)
      .where(eq(postAttachments.postId, Number(id)))
      .leftJoin(images, eq(images.id, postAttachments.imageId))
        .then(imgs => {
            return imgs.map(i => i.Image?.path).filter(i => typeof i === "string");
          })
        .catch(e => {        
          throw createError({ 
            statusCode: 400, 
            statusMessage: 'Could not handle the comment images request', 
            data: e 
          });
        });
  else if (item === "comments")
    imagePath = await useDb()
      .select()
      .from(commentAttachments)
      .where(eq(commentAttachments.commentId, Number(id)))
      .leftJoin(images, eq(images.id, commentAttachments.imageId))
        .then(imgs => {
            return imgs.map(i => i.Image?.path).filter(i => typeof i === "string");
          })
        .catch(e => {        
          throw createError({ 
            statusCode: 400, 
            statusMessage: 'Could not handle the comment images request', 
            data: e 
          });
        });
  else
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  
  if (!imagePath?.length) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' });
  }

  return imagePath;
})
