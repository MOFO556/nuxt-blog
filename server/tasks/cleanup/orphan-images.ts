import { blob } from 'hub:blob';
import { and, eq, inArray, lt, notExists, sql } from 'drizzle-orm';
import {
  images, postAttachments, commentAttachments, users,
} from '~~/server/database/schema';

const GRACE_MINUTES = 60;
export default defineTask({
  meta: {
    name: 'cleanup:orphan-images',
    description: 'Deletes uploaded images never linked to any entity.',
  },
  async run() {
    const db = useDb();
    const cutoff = sql`datetime('now', '-${sql.raw(String(GRACE_MINUTES))} minutes')`;

    const isOrphan = and(
      lt(images.createdAt, cutoff as any),
      notExists(
        db.select({ _: sql`1` }).from(postAttachments)
          .where(eq(postAttachments.imageId, images.id)),
      ),
      notExists(
        db.select({ _: sql`1` }).from(commentAttachments)
          .where(eq(commentAttachments.imageId, images.id)),
      ),
      notExists(
        db.select({ _: sql`1` }).from(users)
          .where(eq(users.avatar, images.id)),
      ),
    );
    
    const candidates = db.select({ id: images.id, path: images.path })
      .from(images)
      .where(isOrphan)
      .all();

    if (!candidates.length) 
      return { result: { deleted: 0 } };

    const deleted = db.delete(images)
      .where(and(
        inArray(images.id, candidates.map(c => c.id)),
        isOrphan,
      ))
      .returning({ path: images.path })
      .all();

    await Promise.all(
      deleted
        .map(d => d.path)
        .filter(Boolean)
        .map(p => blob.del(p).catch((e) => { 
          console.log("Error deleting images", e )
         })),
    );

    return { result: { deleted: deleted.length } };
  },
});