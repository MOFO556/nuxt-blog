import type { HotspotId } from '~/types/mascot';
import { isHotspotId } from '~/utils/mascot/ids';

export const MASCOT_ARRIVED_KEY = 'mascot-arrived';
export const MASCOT_SPOKEN_KEY = 'mascot-spoken';

export function parseSpoken(raw: string | null): HotspotId[] {
  if (!raw)
    return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  }
  catch {
    return [];
  }
  if (!Array.isArray(parsed))
    return [];
  const ids: HotspotId[] = [];
  for (const item of parsed) {
    if (typeof item === 'string' && isHotspotId(item) && !ids.includes(item))
      ids.push(item);
  }
  return ids;
}

export function serializeSpoken(ids: readonly HotspotId[]): string {
  return JSON.stringify(ids);
}