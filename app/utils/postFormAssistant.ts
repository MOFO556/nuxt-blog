import type { AssistantRemoteImageInput } from '~/types/assistant';
import type { Tag } from '~/types/posts';
import { DEFAULT_CAROUSEL_SLOT } from '~~/shared/assistant/carouselSlots';

export function inlineImageHtmlSnippet(src: string, imageId: string | number): string {
  return `<img src="${src}" alt="${String(imageId)}" data-image-id="${String(imageId)}" />`;
}

export function prependInlineImageInHtml(
  html: string,
  src: string,
  imageId: string | number,
): string {
  const snippet = `<p>${inlineImageHtmlSnippet(src, imageId)}</p>`;
  const rest = html.replace(/^\s*<p><\/p>\s*/i, '');
  return `${snippet}${rest || '<p></p>'}`;
}

export function appendInlineImageInHtml(
  html: string,
  src: string,
  imageId: string | number,
): string {
  const snippet = inlineImageHtmlSnippet(src, imageId);
  const base = html.replace(/\s*<p><\/p>\s*$/i, '');
  return `${base}${snippet}<p></p>`;
}

export function resolvePatchTags(names: string[], allTags: Tag[]): Tag[] {
  return names.map((name) => {
    const existing = allTags.find(t => t.name === name || t.slug === name);
    return existing ?? {
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    };
  });
}

export function groupCarouselSlotEntries(
  slotted: { slot: string; id: string }[],
): { slot: string; imageIds: string[] }[] {
  const bySlot = new Map<string, string[]>();
  for (const entry of slotted) {
    const list = bySlot.get(entry.slot) ?? [];
    list.push(entry.id);
    bySlot.set(entry.slot, list);
  }
  return [...bySlot.entries()].map(([slot, imageIds]) => ({ slot, imageIds }));
}

export function carouselSlotOrDefault(slot?: string | null): string {
  return slot?.trim() || DEFAULT_CAROUSEL_SLOT;
}

export function remoteImageCaption(
  image: Pick<AssistantRemoteImageInput, 'alt' | 'includeImageDescriptions'>,
): string | undefined {
  if (!image.includeImageDescriptions)
    return undefined;
  const caption = image.alt?.trim();
  return caption || undefined;
}

export function shouldPlaceRemoteImageInBody(
  image: Pick<AssistantRemoteImageInput, 'asCover' | 'alsoInContent' | 'forCarousel'>,
): boolean {
  return Boolean(image.alsoInContent || image.forCarousel || !image.asCover);
}

export async function fetchRemoteImageAsFile(
  regularUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<File> {
  const res = await fetchImpl(regularUrl);
  if (!res.ok)
    throw new Error('Failed to download image');
  const blob = await res.blob();
  return new File(
    [blob],
    `unsplash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`,
    { type: blob.type || 'image/jpeg' },
  );
}