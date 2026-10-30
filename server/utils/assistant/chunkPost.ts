type PostChunkInput = {
  title: string;
  description?: string | null;
  excerpt?: string | null;
  content: string;
  contentHtml?: string | null;
  mode: string;
  tagNames?: string[];
};

type TextChunk = {
  chunkIndex: number;
  content: string;
};

const DEFAULT_MAX_CHARS = 1200;

function stripHtml(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bodyText(input: PostChunkInput): string {
  if (input.mode === 'formatted' && input.contentHtml)
    return stripHtml(input.contentHtml);
  try {
    const parsed: unknown = JSON.parse(input.content);
    if (parsed && typeof parsed === 'object')
      return input.contentHtml ? stripHtml(input.contentHtml) : input.content;
  }
  catch {
    // plain text
  }
  return input.content;
}

export function chunkPost(
  input: PostChunkInput,
  maxChars = DEFAULT_MAX_CHARS,
): TextChunk[] {
  const headerParts = [
    `Title: ${input.title}`,
    input.description ? `Description: ${input.description}` : null,
    input.excerpt ? `Excerpt: ${input.excerpt}` : null,
    input.tagNames?.length ? `Tags: ${input.tagNames.join(', ')}` : null,
  ].filter((p): p is string => Boolean(p));

  const header = headerParts.join('\n');
  const body = bodyText(input);
  const full = body ? `${header}\n\n${body}` : header;

  if (full.length <= maxChars)
    return [{ chunkIndex: 0, content: full }];

  const paragraphs = full.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks: TextChunk[] = [];
  let current = '';

  const flush = () => {
    const trimmed = current.trim();
    if (!trimmed)
      return;
    chunks.push({ chunkIndex: chunks.length, content: trimmed });
    current = '';
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      flush();
      for (let i = 0; i < para.length; i += maxChars) {
        chunks.push({
          chunkIndex: chunks.length,
          content: para.slice(i, i + maxChars),
        });
      }
      continue;
    }
    if (!current) {
      current = para;
      continue;
    }
    if (`${current}\n\n${para}`.length <= maxChars) {
      current = `${current}\n\n${para}`;
      continue;
    }
    flush();
    current = para;
  }
  flush();

  return chunks.length ? chunks : [{ chunkIndex: 0, content: full.slice(0, maxChars) }];
}