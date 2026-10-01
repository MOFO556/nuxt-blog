import { and, lt, notInArray, sql } from 'drizzle-orm';
import { tags, postTags } from '~~/server/database/schema';

export default defineTask({
  meta: {
    name: 'cleanup:tags',
    description: 'Remove tags unused for 30+ days and not attached to any post',
  },
  async run() {
    const cutoff = sql`datetime('now', '-30 days')`;
    const deleted = useDb().transaction(tx => {
      const usedIds = tx.select({ id: postTags.tagId }).from(postTags).all().map(t => t.id);
      return tx.delete(tags)
          .where(and(
            lt(tags.createdAt, cutoff),
            notInArray(tags.id, usedIds),
          )).returning({ id: tags.id }).all();      
    });
    return { result: { deleted: deleted.length } };
  },
});