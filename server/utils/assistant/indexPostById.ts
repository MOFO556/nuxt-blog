import { eq } from 'drizzle-orm';
import { posts } from '~~/server/database/schema';
import { deletePostVectors, indexPost } from '#server-utils/assistant/vectors';
import { useDb } from '#server-utils/db';

export async function indexPostById(postId: number) {
  const row = useDb().query.posts.findFirst({
    where: eq(posts.id, postId),
    with: {
      postTags: { with: { tag: { columns: { name: true, slug: true } } } },
    },
  }).sync();

  if (!row) {
    await deletePostVectors(postId);
    return;
  }

  await indexPost({
    id: row.id,
    title: row.title,
    description: row.description,
    excerpt: row.excerpt,
    content: row.content,
    contentHtml: row.contentHtml,
    mode: row.mode,
    tagNames: row.postTags.map(pt => pt.tag.name),
  });
}