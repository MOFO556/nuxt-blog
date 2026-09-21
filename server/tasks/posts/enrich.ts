import { eq, isNull, sql } from 'drizzle-orm';
import { posts } from '~~/server/database/schema';

const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;

async function fetchTitle(url: string): Promise<string | null> {
  const res = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(8000),
    headers: { 'user-agent': 'stash-bot/1.0' },
  });

  if (!res.ok) 
    return null;

  const html = (await res.text()).slice(0, 100_000);
  const raw = TITLE_RE.exec(html)?.[1];
  return raw ? raw.replace(/\s+/g, ' ').trim().slice(0, 200) || null : null;
}

export default defineTask({
  meta: {
    name: 'posts:enrich',
    description: 'Fetch real page titles for un-enriched posts',
  },

  async run({ payload }) {
    const db = useDb();
    const batch = Number(payload?.limit ?? 10);

    const pending = await db
      .select({ id: posts.id, url: posts.url })
      .from(posts)
      .where(isNull(posts.updatedAt))
      .limit(batch);

    let updated = 0;

    for (const row of pending) {
      const title = await fetchTitle(row.url).catch(() => null);

      await db
        .update(posts)
        .set({ updatedAt:  sql`CURRENT_TIMESTAMP`, ...(title ? { title } : {}) })
        .where(eq(posts.id, row.id));

      if (title) 
        updated++;
    }

    return { result: { scanned: pending.length, updated } };
  },
});