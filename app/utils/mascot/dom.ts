import type { HotspotBox, HotspotId } from '~/types/mascot';
import { isHotspotId } from '~/utils/mascot/ids';

export function headerBottom(): number {
  const header = document.querySelector('header');
  if (!(header instanceof HTMLElement))
    return 0;
  return header.getBoundingClientRect().bottom;
}

export function readHotspotBoxes(): HotspotBox[] {
  const nodes = document.querySelectorAll<HTMLElement>('[data-mascot-hotspot]');
  const byId = new Map<HotspotId, HotspotBox>();
  for (const node of nodes) {
    const raw = node.dataset.mascotHotspot;
    if (!raw || !isHotspotId(raw) || byId.has(raw))
      continue;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0)
      continue;
    byId.set(raw, {
      id: raw,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }
  return [...byId.values()];
}