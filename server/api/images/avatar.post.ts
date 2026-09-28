import { blob } from 'hub:blob'
import { images } from '~~/server/database/schema';

export default eventHandler(async (event) => {
  const form = await readMultipartFormData(event);

  if (!form)
    throw createError({ statusCode: 422, statusMessage: 'No form data' });

  const avatar = form.find((p) => p.name === 'file');
  if (!avatar)
    throw createError({ statusCode: 422, statusMessage: "Missing 'file' field" });
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(avatar.type || ''))
    throw createError({ statusCode: 415, statusMessage: 'Unsupported file type' });
  if (avatar.data.length > 10 * 1024 * 1024)
    throw createError({ statusCode: 413, statusMessage: 'File too large' });  
  if (!avatar.filename)
    throw createError({ statusCode: 422, statusMessage: 'Invalid file' });

  const uploaded = await blob.put(avatar.filename, avatar.data, {
    contentType: avatar.type,
    addRandomSuffix: true,
    prefix: 'images',
  });

  if (!uploaded)
    throw createError({ statusCode: 400, statusMessage: "Unable to load avatar"});
  else {
    const [image] = await useDb().insert(images).values({
      name: avatar.filename,
      path: uploaded.pathname
    }).returning();
    
    return image;
  };
})
