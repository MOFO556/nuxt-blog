import type { CuePickInput, GuideCue, HotspotBox, HotspotId } from '~/types/mascot';
import { guideCue } from '~/utils/mascot/cues';

export const HOTSPOT_PROXIMITY = 36;

export function distanceToBox(
  pointer: { x: number, y: number },
  box: HotspotBox,
): number {
  const nearestX = Math.min(Math.max(pointer.x, box.left), box.left + box.width);
  const nearestY = Math.min(Math.max(pointer.y, box.top), box.top + box.height);
  return Math.hypot(pointer.x - nearestX, pointer.y - nearestY);
}

export function nearestHotspot(
  pointer: { x: number, y: number },
  boxes: readonly HotspotBox[],
  proximity: number,
): HotspotId | null {
  let best: { id: HotspotId, distance: number } | null = null;
  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0)
      continue;
    const distance = distanceToBox(pointer, box);
    if (distance > proximity)
      continue;
    if (!best || distance < best.distance)
      best = { id: box.id, distance };
  }
  return best?.id ?? null;
}

function visibleBox(boxes: readonly HotspotBox[], id: HotspotId): boolean {
  return boxes.some(box => box.id === id && box.width > 0 && box.height > 0);
}

export function hoveredHotspot(input: CuePickInput): HotspotId | null {
  if (input.directOnly)
    return input.tappedId && visibleBox(input.boxes, input.tappedId) ? input.tappedId : null;
  if (!input.pointer)
    return null;
  return nearestHotspot(input.pointer, input.boxes, input.proximity);
}

export function pickGuideCue(input: CuePickInput): GuideCue | null {
  const id = hoveredHotspot(input);
  if (!id)
    return null;
  return guideCue(id, input.theme);
}

export function hoverChanged(current: HotspotId | null, previous: HotspotId | null): boolean {
  return current !== null && current !== previous;
}

export function cueStillVisible(input: {
  shownFor: number,
  minSeconds: number,
  pointerNear: boolean,
  directOnly: boolean,
}): boolean {
  if (input.shownFor < input.minSeconds)
    return true;
  if (input.directOnly)
    return false;
  return input.pointerNear;
}