export function collectContentImageIds(contentJson: string): number[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  }
  catch {
    return [];
  }

  const ids = new Set<number>();

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node === null || typeof node !== 'object')
      return;
    
    const record = node as Record<string, unknown>;
    const attrs = record.attrs;
    if (attrs && typeof attrs === 'object') {
      const attrRecord = attrs as Record<string, unknown>;
      const maybeId = attrRecord.imageId ?? (record.type === 'image' ? attrRecord.id : undefined);
      if (typeof maybeId === 'number')
        ids.add(maybeId);      
      else if (typeof maybeId === 'string' && /^\d+$/.test(maybeId))
        ids.add(Number(maybeId));
      
      if (Array.isArray(attrRecord.imageIds))
        for (const id of attrRecord.imageIds)
          if (typeof id === 'number')
            ids.add(id);
          else if (typeof id === 'string' && /^\d+$/.test(id))
            ids.add(Number(id));        
    }
    if ('content' in record)
      walk(record.content);    
  };

  walk(parsed);
  return [...ids];
}
