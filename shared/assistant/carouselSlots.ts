export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const DEFAULT_CAROUSEL_SLOT = 'gallery-1';

export function sanitizeCarouselSlot(slot: string): string {
  const cleaned = slot
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || DEFAULT_CAROUSEL_SLOT;
}

export function carouselSlotMarker(slot: string): string {
  const safe = sanitizeCarouselSlot(slot);
  return (
    `<div data-carousel="true" data-carousel-slot="${safe}" data-image-ids="" class="post-carousel-marker">&nbsp;</div>`
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setImageIdsOnAttrs(attrs: string, ids: string): string {
  if (/\bdata-image-ids=["'][^"']*["']/i.test(attrs))
    return attrs.replace(/\bdata-image-ids=["'][^"']*["']/i, `data-image-ids="${ids}"`);
  return `${attrs} data-image-ids="${ids}"`;
}

export function mergeImageIds(
  existing: (string | number)[],
  incoming: (string | number)[],
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...existing, ...incoming]) {
    const key = String(id).trim();
    if (!key || seen.has(key))
      continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function readImageIdsFromAttrs(attrs: string): string[] {
  const raw = attrs.match(/\bdata-image-ids=["']([^"']*)["']/i)?.[1] ?? '';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function fillCarouselSlotInHtml(
  html: string,
  slot: string,
  imageIds: (string | number)[],
): string | null {
  const safeSlot = sanitizeCarouselSlot(slot);
  if (!slot.trim() || imageIds.length === 0)
    return null;

  const re = new RegExp(
    `<div\\b([^>]*\\bdata-carousel-slot=["']${escapeRegExp(safeSlot)}["'][^>]*)>`,
    'i',
  );
  const match = re.exec(html);
  if (!match || match.index === undefined)
    return null;

  let attrs = match[1] ?? '';
  const merged = mergeImageIds(readImageIdsFromAttrs(attrs), imageIds);
  attrs = setImageIdsOnAttrs(attrs, merged.join(','));
  if (!/\bdata-carousel\b/i.test(attrs))
    attrs = ` data-carousel="true"${attrs}`;

  const openTag = `<div${attrs}>`;
  return `${html.slice(0, match.index)}${openTag}${html.slice(match.index + match[0].length)}`;
}

export function fillEmptyCarouselsInOrder(
  html: string,
  imageIdGroups: Array<(string | number)[]>,
): string {
  if (!imageIdGroups.length)
    return html;

  let groupIndex = 0;
  return html.replace(/<div\b([^>]*\bdata-carousel\b[^>]*)>/gi, (full, rawAttrs: string) => {
    if (groupIndex >= imageIdGroups.length)
      return full;
    if (readImageIdsFromAttrs(rawAttrs).length)
      return full;
    const ids = mergeImageIds([], imageIdGroups[groupIndex]!).join(',');
    groupIndex += 1;
    return `<div${setImageIdsOnAttrs(rawAttrs, ids)}>`;
  });
}

export function appendToCarouselsInOrder(
  html: string,
  imageIdGroups: Array<(string | number)[]>,
): string {
  if (!imageIdGroups.length)
    return html;

  let groupIndex = 0;
  return html.replace(/<div\b([^>]*\bdata-carousel\b[^>]*)>/gi, (full, rawAttrs: string) => {
    if (groupIndex >= imageIdGroups.length)
      return full;
    const merged = mergeImageIds(
      readImageIdsFromAttrs(rawAttrs),
      imageIdGroups[groupIndex]!,
    );
    groupIndex += 1;
    return `<div${setImageIdsOnAttrs(rawAttrs, merged.join(','))}>`;
  });
}

export function groupIdsByCarouselSlot(
  items: { carouselSlot?: string | null; id: string }[],
): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const raw = item.carouselSlot?.trim();
    if (!raw)
      continue;
    const slot = sanitizeCarouselSlot(raw);
    const list = groups.get(slot) ?? [];
    list.push(item.id);
    groups.set(slot, list);
  }
  return groups;
}

export function fillAllCarouselSlotsInHtml(
  html: string,
  slots: { slot: string; imageIds: (string | number)[] }[],
): string {
  let next = html;
  for (const entry of slots) {
    const filled = fillCarouselSlotInHtml(next, entry.slot, entry.imageIds);
    if (filled)
      next = filled;
  }
  return next;
}

function slotExistsInHtml(html: string, slot: string): boolean {
  const safe = sanitizeCarouselSlot(slot);
  return new RegExp(
    `<div\\b[^>]*\\bdata-carousel-slot=["']${escapeRegExp(safe)}["']`,
    'i',
  ).test(html);
}

function appendFilledSlotMarker(
  html: string,
  entry: { slot: string; imageIds: (string | number)[] },
): string {
  const marker = carouselSlotMarker(entry.slot);
  const filled = fillCarouselSlotInHtml(marker, entry.slot, entry.imageIds);
  if (filled)
    return `${html}${filled}`;

  const ids = escapeHtmlAttr(mergeImageIds([], entry.imageIds).join(','));
  return `${html}${marker.replace(
    /\bdata-image-ids=["'][^"']*["']/i,
    `data-image-ids="${ids}"`,
  )}`;
}

export function placeCarouselImagesInHtml(
  html: string,
  slots: { slot: string; imageIds: (string | number)[] }[],
): string {
  let next = fillAllCarouselSlotsInHtml(html, slots);
  const leftover = slots.filter(entry => !slotExistsInHtml(html, entry.slot));
  for (const entry of leftover)
    next = appendFilledSlotMarker(next, entry);
  return next;
}