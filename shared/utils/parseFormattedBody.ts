type FormattedBodyAttachment = {
  id: number | string;
  path: string;
  name?: string;
  postCover?: boolean;
  description?: string | undefined;
};

type FormattedBodyPart =
  | { type: 'html'; html: string }
  | { type: 'carousel'; items: FormattedBodyAttachment[] };

const CAROUSEL_OPEN_RE
  = /<div\b(?=[^>]*\bdata-carousel\b)(?=[^>]*\bdata-image-ids=["']([^"']*)["'])[^>]*>/gi;

function matchingDivEnd(html: string, from: number): number {
  let depth = 1;
  const tagRe = /<\/?div\b[^>]*>/gi;
  tagRe.lastIndex = from;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null) {
    if (/^<\/div/i.test(match[0]))
      depth -= 1;
    else
      depth += 1;
    if (depth === 0)
      return match.index + match[0].length;
  }
  return from;
}

function parseImageIdToken(raw: string): number | string | null {
  const trimmed = raw.trim();
  if (!trimmed)
    return null;
  if (/^\d+$/.test(trimmed))
    return Number(trimmed);
  return trimmed;
}

export function parseFormattedBody(
  html: string,
  attachments: FormattedBodyAttachment[],
): FormattedBodyPart[] {
  const byId = new Map<number | string, FormattedBodyAttachment>();
  for (const attachment of attachments) {
    byId.set(attachment.id, attachment);
    byId.set(String(attachment.id), attachment);
  }
  const parts: FormattedBodyPart[] = [];
  let lastIndex = 0;

  for (const match of html.matchAll(CAROUSEL_OPEN_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex)
      parts.push({ type: 'html', html: html.slice(lastIndex, index) });

    const ids = match[1]!
      .split(',')
      .map(parseImageIdToken)
      .filter((id): id is number | string => id !== null);
    const items = ids
      .map(id => byId.get(id))
      .filter((a): a is FormattedBodyAttachment => a !== undefined);
    parts.push({ type: 'carousel', items });
    lastIndex = matchingDivEnd(html, index + match[0].length);
  }

  if (lastIndex < html.length)
    parts.push({ type: 'html', html: html.slice(lastIndex) });

  return parts;
}