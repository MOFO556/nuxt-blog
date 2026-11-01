import type { StageClipChoice } from '~/types/mascot';
import { MascotClip } from '~/types/mascot.enum';

export function stageClip(input: {
  arriving: boolean,
  posing: boolean,
  direct: boolean,
  walking: boolean,
  hasNotice: boolean,
  hasWalk: boolean,
}): StageClipChoice {
  if (input.arriving)
    return { name: MascotClip.Arrive, loop: false };
  if (input.posing && input.hasNotice)
    return { name: MascotClip.Notice, loop: false };
  if (input.posing)
    return { name: MascotClip.Idle, loop: false };
  if (!input.direct && input.walking) {
    return {
      name: input.hasWalk ? MascotClip.Walk : MascotClip.Run,
      loop: true,
    };
  }
  return { name: MascotClip.Idle, loop: true };
}