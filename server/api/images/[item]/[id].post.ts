import { blob } from 'hub:blob';
import { eq, inArray, sql } from 'drizzle-orm';
import { commentAttachments, comments, Image, images, InsertImage, postAttachments, posts } from '~~/server/database/schema';

type ManifestEntry = { existing: string, description?: string, newFileName?: string };

export default eventHandler(async (event) => {
  await requireAuth(event);
  const userId = event.context.user.id;
  const item = getRouterParam(event, 'item');
  const id  = getRouterParam(event, 'id');

  const parts = await readMultipartFormData(event);
  if (!parts?.length) 
    throw createError({ statusCode: 422, statusMessage: 'Empty payload' });

  const manifestPart = parts.find(p => p.name === 'manifest');
  const manifest: ManifestEntry[] = manifestPart ? JSON.parse(manifestPart.data.toString()) : [];
  const fileParts = parts.filter(p => p.name === 'files' && p.filename);

  const entityId = id !== "null" ? Number(id) : null;
  
  const existingPaths: string[] = manifest.filter(e => e.existing).map(e => e.existing);
  const resolvedPaths: string[] = [...existingPaths];
  const newImages: InsertImage[] = [];

  for (const entry of fileParts) {
    if (!entry) 
      throw createError({ statusCode: 422, statusMessage: 'File count mismatch' });
    if (entry.data.length > 10 * 1024 * 1024)
      throw createError({ statusCode: 413, statusMessage: 'File too large' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(entry.type ?? ''))
      throw createError({ statusCode: 415, statusMessage: 'Unsupported file type' });
    if (!entry.filename)
      throw createError({ statusCode: 422, statusMessage: 'Invalid file' });

    const uploaded = await blob.put(entry.filename, entry.data, {
      contentType: entry.type,
      addRandomSuffix: true,
      prefix: 'images',
    });
    const description = manifest.find(m => m.newFileName === entry.filename)?.description;
    resolvedPaths.push(uploaded.pathname);
    newImages.push({ name: entry.filename, path: uploaded.pathname, description: description});
  }
  const db = useDb();

  let currentImages: { 
    id: number | null; 
    path: string | null, 
    name: string | null , 
    description?: string | null 
  }[] = [];

  const orphanBlobs: string[] = [];
  let created: Image[] = [];

  db.transaction((tx) => {
    /**
     * Case: There is an actual post to load attahments to
     */
    if (item === 'posts' && entityId !== null) {
      const currPost = tx.select().from(posts).where(eq(posts.id, entityId)).get();
      if (!currPost)
        throw createError({ status: 404, statusMessage: "No post to load attachments!" });
      if (currPost.userId !== userId)
        throw createError({ status: 403, statusMessage: "Not allowed! Foreigner post to load attachments" });

      currentImages = tx.select({ id: images.id, path: images.path, name: images.name, description: images.description })
        .from(postAttachments)
        .where(eq(postAttachments.postId, entityId))
        .leftJoin(images, eq(images.id, postAttachments.imageId)).all();
      }
    /**
     * TODO: Editing comments - now is unavailable path
     * Case: There is an actual comment to load attahments to
     */
    else if (item === 'comments' && entityId !== null) {
      const currComment = tx.select().from(comments).where(eq(comments.id, entityId)).get();
      if (!currComment)
        throw createError({ status: 404, statusMessage: "No comment to load attachments!" });
      if (currComment.userId !== userId)
        throw createError({ status: 403, statusMessage: "Not allowed! Foreigner comment to load attachments" });

      currentImages = tx.select({ id: images.id, path: images.path, name: images.name, description: images.description })
        .from(commentAttachments)
        .where(eq(commentAttachments.commentId, entityId))
        .leftJoin(images, eq(images.id, commentAttachments.imageId)).all(); 
      }       
    /**
     * Case: Images already loaded, but no relation to entity
     * Maby images were loaded but did not pass the entity validation
     */
    else if (!currentImages?.length && existingPaths?.length)
      currentImages = tx.select({ id: images.id, path: images.path, name: images.name, description: images.description })
      .from(images)
      .where(inArray(images.path, resolvedPaths)).all();

    const keptPaths = new Set(resolvedPaths);
    
    const toDelete = currentImages.filter(img => img.path && !keptPaths.has(img.path));    
    if (toDelete.length)  {
      orphanBlobs.push(...toDelete.map(i => i.path).filter(i => i !== null));
      tx.delete(images).where(inArray(images.id, toDelete.map(i => i.id).filter(i => i !== null))).run();
    }
    if (newImages.length)
      created = tx.insert(images).values(newImages).returning().all();    

    if (existingPaths?.length)
      currentImages.forEach(curr => {
          const updated = manifest.find(m => m.existing === curr.path && m.description !== curr.description);
          if (updated && curr.id !== null)
            tx.update(images).set({ description: updated.description, updatedAt: sql`CURRENT_TIMESTAMP`})
              .where(eq(images.id, curr.id)).returning().all();
        });
  });

  await Promise.all(orphanBlobs.map(p => blob.del(p)
    .catch((e) => {
      throw createError({ statusCode: 500, statusMessage: 'Unable to delete file', data: e })
    })
  ));

  setResponseStatus(event, created.length ? 201 : 200);
  return [...currentImages.filter(i => i.path !== null), ...created];
});