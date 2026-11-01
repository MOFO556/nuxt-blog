import type { AmbientCue, GuideAction, MascotTheme } from '~/types/mascot.enum';

export type HotspotId =
  | 'home'
  | 'posts'
  | 'runner'
  | 'profile'
  | 'sign-in'
  | 'sign-up'
  | 'menu'
  | 'color-mode'
  | 'assistant';

export type CueId = HotspotId | AmbientCue;

export type HotspotBox = {
  id: HotspotId,
  left: number,
  top: number,
  width: number,
  height: number,
};

export type GuideCue = {
  id: CueId,
  text: string,
  action?: GuideAction,
};

export type MascotFit = {
  unit: number,
  foot: number,
};

export type StageBounds = {
  left: number,
  top: number,
  width: number,
  height: number,
};

export type CuePickInput = {
  theme: MascotTheme,
  boxes: readonly HotspotBox[],
  pointer: { x: number, y: number } | null,
  tappedId: HotspotId | null,
  proximity: number,
  directOnly: boolean,
};

export type StageClipChoice = {
  name: MascotClip,
  loop: boolean,
};

export type PlanarMotion = {
  x: number,
  y: number,
  ready: boolean,
  velocityX: number,
  velocityY: number,
};