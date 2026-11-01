import type { HotspotId } from '~/types/mascot';

export const HOTSPOT_IDS = [
  'home',
  'posts',
  'runner',
  'profile',
  'sign-in',
  'sign-up',
  'menu',
  'color-mode',
  'assistant',
] as const;

export function isHotspotId(value: string): value is HotspotId {
  return (HOTSPOT_IDS as readonly string[]).includes(value);
}