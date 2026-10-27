type RewriteContentImageIdsInput = {
  content: string;
  contentHtml: string;
  idMap: Record<string, number>;
  pathMap?: Record<string, string>;
  blobSrcMap?: Record<string, string>;
};

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

function rewriteHtml(
  html: string,
  idMap: Record<string, number>,
  blobSrcMap: Record<string, string>,
): string {
  let next = html;
  for (const [blobSrc, path] of Object.entries(blobSrcMap))
    next = next.split(blobSrc).join(path);

  for (const [tempId, realId] of Object.entries(idMap))
    next = next.split(tempId).join(String(realId));

  return next;
}

export function rewriteContentImageIds(
  input: RewriteContentImageIdsInput,
): { content: string; contentHtml: string } {
  const pathMap = input.pathMap ?? {};
  const blobSrcMap = input.blobSrcMap ?? {};
  const parsed: unknown = JSON.parse(input.content);
  const rewritten = rewriteNode(parsed, input.idMap, pathMap, blobSrcMap);
  return {
    content: JSON.stringify(rewritten),
    contentHtml: rewriteHtml(input.contentHtml, input.idMap, blobSrcMap),
  };
}
