import { blob } from 'hub:blob';
import { and, eq, inArray } from 'drizzle-orm';
import { commentAttachments, Image, images } from '~~/server/database/schema';

type ManifestEntry = { existing?: string; isCover?: boolean };

export default eventHandler(async (event) => {
  await requireAuth(event);
  const item = getRouterParam(event, 'item');
  const id  = getRouterParam(event, 'id');

  const parts = await readMultipartFormData(event);
  if (!parts?.length) 
    throw createError({ statusCode: 422, statusMessage: 'Empty payload' });

  const manifestPart = parts.find(p => p.name === 'manifest');
  if (!manifestPart) 
    throw createError({ statusCode: 422, statusMessage: 'Missing manifest' });

  const manifest: ManifestEntry[] = JSON.parse(manifestPart.data.toString());

  const fileParts = parts.filter(p => p.name === 'files' && p.filename);
  const isPost = item === 'posts';
  const ownerId = Number(id);
  const postId = isPost ? ownerId : null;
  
  let cursor = 0;
  const resolvedPaths: string[] = [];
  const newPaths: string[] = [];

  for (const entry of manifest) {
    if (entry.existing) {
      resolvedPaths.push(entry.existing);
      continue;
    }

    const part = fileParts[cursor++];
    if (!part) 
      throw createError({ statusCode: 422, statusMessage: 'File count mismatch' });
    if (part.data.length > 10 * 1024 * 1024)
      throw createError({ statusCode: 422, statusMessage: 'File too large' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(part.type ?? ''))
      throw createError({ statusCode: 422, statusMessage: 'Unsupported type' });
    if (!part.filename)
      throw createError({ statusCode: 422, statusMessage: 'Invalid file' });

    const uploaded = await blob.put(part.filename, part.data, {
      contentType: part.type,
      addRandomSuffix: true,
      prefix: 'images',
    });
    resolvedPaths.push(uploaded.pathname);
    newPaths.push(uploaded.pathname);
  }
  
  const coverIdx = manifest.findIndex(m => m.isCover);
  const finalCoverPath = resolvedPaths[coverIdx >= 0 ? coverIdx : 0] ?? null;
  const keptPaths = new Set(resolvedPaths);
  const db = useDb();

  let currentPostImages: { id: number; path: string }[] = [];

  if (item === 'posts' && postId !== null)
    currentPostImages = await db
      .select({ id: images.id, path: images.path })
      .from(images)
      .where(eq(images.postId, postId));

  const orphanBlobs: string[] = [];
  let created: Image[] = [];

  db.transaction((tx) => {
    if (postId !== null) {
      tx.update(images)
        .set({ postCover: false })
        .where(eq(images.postId, postId))
        .run();
        
      const toDelete = currentPostImages.filter(img => !keptPaths.has(img.path));

      if (toDelete.length) {
        orphanBlobs.push(...toDelete.map(i => i.path));
        tx.delete(images).where(inArray(images.id, toDelete.map(i => i.id))).run();
      }
    }
    
    const newRows = newPaths.map((path, i) => ({
      name: new Date().getTime().toString() + i,
      path,
      ...(isPost ? { postId, postCover: false } : {}),
    }));

    if (newRows.length)
      created = tx.insert(images).values(newRows).returning().all();
    
    if (postId !== null && finalCoverPath)
      tx.update(images)
        .set({ postCover: true })
        .where(and(eq(images.postId, postId), eq(images.path, finalCoverPath)))
        .run();
    
    if (item === 'comments' && ownerId) {
      if (created.length)
        tx.insert(commentAttachments)
          .values(created.map(img => ({ imageId: img.id, commentId: ownerId })))
          .run();
    }
  });

  await Promise.all(orphanBlobs.map(p => blob.del(p)
    .catch((e) => {
      throw createError({ statusCode: 500, statusMessage: 'Unable to delete file', data: e })
    })
  ));

  setResponseStatus(event, created.length ? 201 : 200);
  return created;
});