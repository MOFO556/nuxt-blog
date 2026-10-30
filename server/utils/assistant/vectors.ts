import { eq } from 'drizzle-orm';
import { postChunks } from '~~/server/database/schema';
import { chunkPost } from '#server-utils/assistant/chunkPost';
import { embedTexts } from '#server-utils/assistant/provider';
import { recreatePostChunkVec, useDb, useSqlite } from '#server-utils/db';
import { asVecPrimaryKey } from '#server-utils/assistant/vecPrimaryKey';

function serializeEmbedding(values: number[]): Buffer {
  return Buffer.from(new Float32Array(values).buffer);
}

function insertVecRow(
  sqlite: ReturnType<typeof useSqlite>, 
  chunkId: number | bigint, 
  embedding: number[]) {
  sqlite.prepare(
    'INSERT INTO post_chunk_vec(chunk_id, embedding) VALUES (?, ?)',
  ).run(asVecPrimaryKey(chunkId), serializeEmbedding(embedding));
}

function isDimensionMismatch(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /dimension mismatch/i.test(message);
}

function ensureVecMatchesEmbedding(embedding: number[]) {
  if (!embedding.length)
    return;
  recreatePostChunkVec(embedding.length);
}

export async function deletePostVectors(postId: number) {
  const db = useDb();
  const sqlite = useSqlite();
  const rows = db.select({ id: postChunks.id }).from(postChunks).where(eq(postChunks.postId, postId)).all();
  for (const row of rows) {
    try {
      sqlite.prepare('DELETE FROM post_chunk_vec WHERE chunk_id = ?').run(asVecPrimaryKey(row.id));
    }
    catch {
      // vec table may be missing in degraded mode
    }
  }
  db.delete(postChunks).where(eq(postChunks.postId, postId)).run();
}

export async function indexPost(post: {
  id: number;
  title: string;
  description?: string | null;
  excerpt?: string | null;
  content: string;
  contentHtml?: string | null;
  mode: string;
  tagNames?: string[];
}) {
  
  await deletePostVectors(post.id);

  const chunks = chunkPost({
    title: post.title,
    description: post.description,
    excerpt: post.excerpt,
    content: post.content,
    contentHtml: post.contentHtml,
    mode: post.mode,
    tagNames: post.tagNames,
  });

  if (!chunks.length)
    return;

  let embeddings: number[][] = [];
  try {
    embeddings = await embedTexts(chunks.map(c => c.content));
  }
  catch (err) {
    console.warn('[assistant] embedding failed; storing chunks without vectors', err);
  }

  const first = embeddings.find(e => e.length);
  if (first)
    ensureVecMatchesEmbedding(first);

  const db = useDb();
  const sqlite = useSqlite();
  const metadata = JSON.stringify({
    title: post.title,
    mode: post.mode,
    tags: post.tagNames ?? [],
    route: `/posts/${post.id}`,
  });

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    const row = db.insert(postChunks).values({
      postId: post.id,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      metadataJson: metadata,
    }).returning().get();

    const embedding = embeddings[i];
    if (!row?.id || !embedding?.length)
      continue;

    try {
      insertVecRow(sqlite, row.id, embedding);
    }
    catch (err) {
      if (isDimensionMismatch(err)) {
        ensureVecMatchesEmbedding(embedding);
        try {
          insertVecRow(sqlite, row.id, embedding);
          continue;
        }
        catch (retryErr) {
          console.warn('[assistant] vec insert failed after recreate', retryErr);
          continue;
        }
      }
      console.warn('[assistant] vec insert failed', err);
    }
  }
}

export async function searchPostChunks(query: string, limit = 8): Promise<{
    chunkId: number;
    postId: number;
    content: string;
    distance: number;
    metadata: Record<string, unknown>;
  }[]> {
  const embedding = await embedQuerySafe(query);
  if (!embedding.length)
    return [];

  const sqlite = useSqlite();
  const db = useDb();

  type VecHit = { chunk_id: number; distance: number };

  function runMatch(): VecHit[] {
    return sqlite.prepare(`
      SELECT chunk_id, distance
      FROM post_chunk_vec
      WHERE embedding MATCH ?
      ORDER BY distance
      LIMIT ?
    `).all(serializeEmbedding(embedding), limit) as VecHit[];
  }

  let hits: VecHit[] = [];
  try {
    hits = runMatch();
  }
  catch (err) {
    if (isDimensionMismatch(err)) {
      console.warn(
        `[assistant] vec search dimension mismatch (query=${embedding.length}); recreating table. Run the assistant reindex task to refill vectors.`,
      );
      ensureVecMatchesEmbedding(embedding);
      try {
        hits = runMatch();
      }
      catch (retryErr) {
        console.warn('[assistant] vec search failed after recreate', retryErr);
        return [];
      }
    }
    else {
      console.warn('[assistant] vec search failed', err);
      return [];
    }
  }

  const results: {
    chunkId: number;
    postId: number;
    content: string;
    distance: number;
    metadata: Record<string, unknown>;
  }[] = [];

  for (const hit of hits) {
    const row = db.select().from(postChunks).where(eq(postChunks.id, hit.chunk_id)).get();
    if (!row)
      continue;
    let metadata: Record<string, unknown> = {};
    try {
      metadata = JSON.parse(row.metadataJson) as Record<string, unknown>;
    }
    catch {
      metadata = {};
    }
    results.push({
      chunkId: row.id,
      postId: row.postId,
      content: row.content,
      distance: hit.distance,
      metadata,
    });
  }

  return results;
}

async function embedQuerySafe(text: string): Promise<number[]> {
  try {
    const { embedQuery } = await import('#server-utils/assistant/provider');
    return await embedQuery(text);
  }
  catch (err) {
    console.warn('[assistant] query embed failed', err);
    return [];
  }
}