type RewriteContentImageIdsInput = {
  content: string;
  contentHtml: string;
  idMap: Record<string, number>;
  pathMap?: Record<string, string>;
  blobSrcMap?: Record<string, string>;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mapId(value: unknown, idMap: Record<string, number>): unknown {
  if (typeof value === 'string' && idMap[value] !== undefined)
    return idMap[value];
  return value;
}

function rewriteAttrs(
  attrs: Record<string, unknown>,
  idMap: Record<string, number>,
  pathMap: Record<string, string>,
  blobSrcMap: Record<string, string>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...attrs };

  if ('imageId' in next)
    next.imageId = mapId(next.imageId, idMap);

  if (Array.isArray(next.imageIds))
    next.imageIds = next.imageIds.map(id => mapId(id, idMap));

  if (typeof next.alt === 'string' && idMap[next.alt] !== undefined)
    next.alt = String(idMap[next.alt]);

  if (typeof next.src === 'string') {
    if (blobSrcMap[next.src])
      next.src = blobSrcMap[next.src];
    else if (typeof next.imageId === 'number') {
      const byTemp = Object.entries(idMap).find(([, id]) => id === next.imageId)?.[0];
      if (byTemp && pathMap[byTemp])
        next.src = pathMap[byTemp];
    }
    else if (typeof next.imageId === 'string' && pathMap[next.imageId])
      next.src = pathMap[next.imageId];
  }

  return next;
}

function rewriteNode(
  value: unknown,
  idMap: Record<string, number>,
  pathMap: Record<string, string>,
  blobSrcMap: Record<string, string>,
): unknown {
  if (Array.isArray(value))
    return value.map(item => rewriteNode(item, idMap, pathMap, blobSrcMap));

  if (value === null || typeof value !== 'object')
    return value;

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = { ...record };

  if (record.attrs && typeof record.attrs === 'object' && !Array.isArray(record.attrs))
    next.attrs = rewriteAttrs(
      record.attrs as Record<string, unknown>,
      idMap,
      pathMap,
      blobSrcMap,
    );

  if ('content' in record)
    next.content = rewriteNode(record.content, idMap, pathMap, blobSrcMap);

  return next;
}

function rewriteImageIdsAttr(
  raw: string,
  idMap: Record<string, number>,
): string {
  return raw
    .split(',')
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed && idMap[trimmed] !== undefined)
        return String(idMap[trimmed]);
      return part;
    })
    .join(',');
}

function rewriteHtml(
  html: string,
  idMap: Record<string, number>,
  blobSrcMap: Record<string, string>,
): string {
  let next = html;
  for (const [blobSrc, path] of Object.entries(blobSrcMap))
    next = next.split(blobSrc).join(path);

  next = next.replace(
    /\bdata-image-ids=(["'])([^"']*)\1/gi,
    (_full, quote: string, raw: string) =>
      `data-image-ids=${quote}${rewriteImageIdsAttr(raw, idMap)}${quote}`,
  );

  for (const [tempId, realId] of Object.entries(idMap)) {
    const escaped = escapeRegExp(tempId);
    const real = String(realId);
    next = next.replace(
      new RegExp(`(\\b(?:data-image-id|alt)=["'])${escaped}(["'])`, 'gi'),
      `$1${real}$2`,
    );
  }

  return next;
}

export function rewriteContentImageIds(
  input: RewriteContentImageIdsInput,
): { content: string; contentHtml: string } {
  const pathMap = input.pathMap ?? {};
  const blobSrcMap = input.blobSrcMap ?? {};
  let content = input.content;
  try {
    const parsed: unknown = JSON.parse(input.content);
    content = JSON.stringify(rewriteNode(parsed, input.idMap, pathMap, blobSrcMap));
  }
  catch {
    // Corrupt / non-JSON TipTap content: keep original so upload+submit can finish.
  }
  return {
    content,
    contentHtml: rewriteHtml(input.contentHtml, input.idMap, blobSrcMap),
  };
}