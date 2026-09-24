import { blob } from 'hub:blob';
import { and, eq, inArray } from 'drizzle-orm';
import { commentAttachments, Image, images, InsertImage, postAttachments } from '~~/server/database/schema';

type ManifestEntry = { existing: string };

export default eventHandler(async (event) => {
  await requireAuth(event);
  const item = getRouterParam(event, 'item');
  const id  = getRouterParam(event, 'id');

  const parts = await readMultipartFormData(event);
  if (!parts?.length) 
    throw createError({ statusCode: 422, statusMessage: 'Empty payload' });

  const manifestPart = parts.find(p => p.name === 'manifest');
  const manifest: ManifestEntry[] = manifestPart ? JSON.parse(manifestPart.data.toString()) : [];
  const fileParts = parts.filter(p => p.name === 'files' && p.filename);

  const entityId = Number(id);
  
  const existingPaths: string[] = manifest.map(e => e.existing);
  const resolvedPaths: string[] = [...existingPaths];
  const newImages: InsertImage[] = [];

  for (const entry of fileParts) {
    if (!entry) 
      throw createError({ statusCode: 422, statusMessage: 'File count mismatch' });
    if (entry.data.length > 10 * 1024 * 1024)
      throw createError({ statusCode: 422, statusMessage: 'File too large' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(entry.type ?? ''))
      throw createError({ statusCode: 422, statusMessage: 'Unsupported type' });
    if (!entry.filename)
      throw createError({ statusCode: 422, statusMessage: 'Invalid file' });

    const uploaded = await blob.put(entry.filename, entry.data, {
      contentType: entry.type,
      addRandomSuffix: true,
      prefix: 'images',
    });
    resolvedPaths.push(uploaded.pathname);
    newImages.push({ name: entry.filename, path: uploaded.pathname});
  }
  const db = useDb();

  let currentImages: { id: number | null; path: string | null, name: string | null }[] = [];

  if (item === 'posts' && entityId !== null)
    currentImages = await db
      .select({ id: images.id, path: images.path, name: images.name})
      .from(postAttachments)
      .where(eq(postAttachments.postId, entityId))
      .leftJoin(images, eq(images.id, postAttachments.imageId));
  else if (item === 'comments' && entityId !== null)
    currentImages = await db
      .select({ id: images.id, path: images.path, name: images.name})
      .from(commentAttachments)
      .where(eq(commentAttachments.commentId, entityId))
      .leftJoin(images, eq(images.id, commentAttachments.imageId));

  const orphanBlobs: string[] = [];
  let created: Image[] = [];
  const keptPaths = new Set(resolvedPaths);

  db.transaction((tx) => {    
    const toDelete = currentImages.filter(img => img.path && !keptPaths.has(img.path));    
    if (toDelete.length) 
      orphanBlobs.push(...toDelete.map(i => i.path).filter(i => i !== null));{
      tx.delete(images).where(inArray(images.id, toDelete.map(i => i.id).filter(i => i !== null))).run();
    }
    if (newImages.length)
      created = tx.insert(images).values(newImages).returning().all();
  });

  await Promise.all(orphanBlobs.map(p => blob.del(p)
    .catch((e) => {
      throw createError({ statusCode: 500, statusMessage: 'Unable to delete file', data: e })
    })
  ));

  /**
   * Case: Images already loaded, but no relation to entity
   */
  if (!currentImages?.length && existingPaths?.length)
    currentImages = await db
    .select({ id: images.id, path: images.path, name: images.name})
    .from(images)
    .where(inArray(images.path, resolvedPaths));

  setResponseStatus(event, created.length ? 201 : 200);
  return [...currentImages.filter(i => i.path !== null), ...created];
});