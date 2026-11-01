import type { HotspotBox, StageBounds } from '~/types/mascot';

export function isNarrowViewport(width: number): boolean {
  return width < 768;
}

export function mascotPixelHeight(viewportHeight: number, narrow: boolean): number {
  return viewportHeight * (narrow ? 0.2866 : 0.1965);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function standPoint(box: HotspotBox, bounds: StageBounds): { x: number, y: number } {
  const margin = 48;
  const minX = bounds.left + margin;
  const maxX = bounds.left + bounds.width - margin;
  const minY = bounds.top + margin;
  const maxY = bounds.top + bounds.height - margin;
  const centerX = box.left + box.width / 2;
  const onRight = centerX > bounds.left + bounds.width * 0.65;
  const rawX = onRight ? box.left - 88 : centerX;
  const rawY = onRight
    ? box.top + box.height / 2
    : box.top + box.height + 120;
  return {
    x: clamp(rawX, minX, maxX),
    y: clamp(rawY, minY, maxY),
  };
}

export function patrolPoint(
  bounds: StageBounds,
  timeSeconds: number,
  narrow: boolean,
): { x: number, y: number } {
  const y = bounds.top + bounds.height * (narrow ? 0.72 : 0.78);
  const center = bounds.left + bounds.width / 2;
  const reach = Math.min(bounds.width * 0.18, 240);
  return {
    x: center + Math.sin(timeSeconds * 0.55) * reach,
    y,
  };
}

export function patrolSpan(
  bounds: StageBounds,
  narrow: boolean,
  bodyHeight: number,
  headCeiling: number,
  halfWidth: number,
): { left: number, right: number, y: number } {
  const y = restPoint(bounds, narrow).y;
  const leftEdge = clampFeet(
    { x: bounds.left, y },
    bounds,
    bodyHeight,
    headCeiling,
    halfWidth,
  );
  const rightEdge = clampFeet(
    { x: bounds.left + bounds.width, y },
    bounds,
    bodyHeight,
    headCeiling,
    halfWidth,
  );
  const room = Math.max(0, rightEdge.x - leftEdge.x);
  const inset = Math.min(120, room * 0.12);
  const left = leftEdge.x + inset;
  return {
    left,
    right: Math.max(left, rightEdge.x - inset),
    y: leftEdge.y,
  };
}

export function restPoint(bounds: StageBounds, narrow: boolean): { x: number, y: number } {
  return {
    x: bounds.left + bounds.width * 0.5,
    y: bounds.top + bounds.height * (narrow ? 0.72 : 0.78),
  };
}

export function clampFeet(
  point: { x: number, y: number },
  bounds: StageBounds,
  bodyHeight: number,
  headCeiling: number,
  halfWidth: number,
): { x: number, y: number } {
  const pad = 12;
  const minX = bounds.left + halfWidth + pad;
  const maxX = Math.max(minX, bounds.left + bounds.width - halfWidth - pad);
  const ceiling = Math.max(bounds.top, headCeiling);
  const minY = ceiling + bodyHeight + 12;
  const maxY = bounds.top + bounds.height - 16;
  return {
    x: Math.min(Math.max(point.x, minX), maxX),
    y: Math.max(minY, Math.min(maxY, point.y)),
  };
}

export function pointerHeadsToward(
  from: { x: number, y: number },
  to: { x: number, y: number },
  box: StageBounds,
): boolean {
  const inside = to.x >= box.left
    && to.x <= box.left + box.width
    && to.y >= box.top
    && to.y <= box.top + box.height;
  if (inside)
    return true;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const move = Math.hypot(dx, dy);
  if (move < 0.5)
    return false;
  const tx = box.left + box.width / 2 - to.x;
  const ty = box.top + box.height / 2 - to.y;
  const dist = Math.hypot(tx, ty);
  if (dist < 1)
    return true;
  return (dx * tx + dy * ty) / (move * dist) >= 0.35;
}

export function clampCueAnchor(anchorX: number, stageWidth: number, bubbleWidth: number): number {
  const half = bubbleWidth / 2;
  const min = half + 12;
  const max = Math.max(min, stageWidth - half - 12);
  return Math.min(Math.max(anchorX, min), max);
}

export function viewportToWorld(
  x: number,
  y: number,
  origin: { left: number, top: number },
  size: { width: number, height: number },
): { x: number, y: number } {
  const localX = x - origin.left;
  const localY = y - origin.top;
  return {
    x: localX - size.width / 2,
    y: size.height / 2 - localY,
  };
}