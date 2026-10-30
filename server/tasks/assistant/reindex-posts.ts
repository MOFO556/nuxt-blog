import { posts } from '~~/server/database/schema';
import { indexPostById } from '#server-utils/assistant/indexPostById';
import { useDb } from '#server-utils/db';

export default defineTask({
  meta: {
    name: 'assistant:reindex-posts',
    description: 'Backfill PostChunk + sqlite-vec embeddings for all posts',
  },
  async run() {
    const rows = useDb().select({ id: posts.id }).from(posts).all();
    let ok = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await indexPostById(row.id);
        ok += 1;
      }
      catch (err) {
        failed += 1;
        console.warn(`[assistant:reindex-posts] failed for post ${row.id}`, err);
      }
    }
    return { result: 'ok' as const, indexed: ok, failed, total: rows.length };
  },
});