import type { PlanarMotion } from '~/types/mascot';
import { Gait, HoverBeat } from '~/types/mascot.enum';

export function stepPlanar(
  motion: PlanarMotion,
  desired: { x: number, y: number },
  snap: boolean,
  moveSpeed: number,
  dt: number,
) {
  if (!motion.ready || snap) {
    motion.velocityX = 0;
    motion.velocityY = 0;
    motion.x = desired.x;
    motion.y = desired.y;
    motion.ready = true;
    return;
  }
  const dx = desired.x - motion.x;
  const dy = desired.y - motion.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(dist, moveSpeed * dt);
  if (dist > 0.001) {
    const scale = step / dist;
    motion.velocityX = (dx / dist) * (step / Math.max(dt, 0.001));
    motion.velocityY = (dy / dist) * (step / Math.max(dt, 0.001));
    motion.x += dx * scale;
    motion.y += dy * scale;
    return;
  }
  motion.velocityX = 0;
  motion.velocityY = 0;
}

export function nextGait(input: {
  gait: Gait,
  hoverBeat: HoverBeat | null,
  poseLock: boolean,
  patrolling: boolean,
  speed: number,
}): Gait {
  if (input.hoverBeat === HoverBeat.walk)
    return Gait.walk;
  if (input.poseLock || input.hoverBeat === HoverBeat.notice || input.hoverBeat === HoverBeat.stand)
    return Gait.idle;
  if (input.patrolling)
    return Gait.walk;
  if (input.gait === Gait.walk)
    return input.speed < 24 ? Gait.idle : Gait.walk;
  return input.speed > 70 ? Gait.walk : input.gait;
}

export function yawForGait(gait: Gait, velocityX: number, current: number): number {
  if (gait === Gait.idle)
    return 0;
  if (gait === Gait.walk && Math.abs(velocityX) > 8)
    return velocityX < 0 ? -Math.PI / 2 : Math.PI / 2;
  return current;
}