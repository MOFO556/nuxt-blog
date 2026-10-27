type FormattedBodyAttachment = {
  id: number;
  path: string;
  name?: string;
  postCover?: boolean;
  description?: string | undefined;
};

type FormattedBodyPart =
  | { type: 'html'; html: string }
  | { type: 'carousel'; items: FormattedBodyAttachment[] };

const CAROUSEL_RE
  = /<div\b(?=[^>]*\bdata-carousel\b)(?=[^>]*\bdata-image-ids="([^"]*)")[^>]*>[\s\S]*?<\/div>/gi;

export function parseFormattedBody(
  html: string,
  attachments: FormattedBodyAttachment[],
): FormattedBodyPart[] {
  const byId = new Map(attachments.map(a => [a.id, a]));
  const parts: FormattedBodyPart[] = [];
  let lastIndex = 0;

  for (const match of html.matchAll(CAROUSEL_RE)) {
    const index = match.index ?? 0;
    if (index > lastIndex)
      parts.push({ type: 'html', html: html.slice(lastIndex, index) });
    
    const ids = match[1]!
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map((raw) => {
        const asNum = Number(raw);
        return Number.isFinite(asNum) ? asNum : null;
      })
      .filter((n): n is number => n !== null);
    const items = ids
      .map(id => byId.get(id))
      .filter((a): a is FormattedBodyAttachment => a !== undefined);
    parts.push({ type: 'carousel', items });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < html.length)
    parts.push({ type: 'html', html: html.slice(lastIndex) });  

  return parts;
}
