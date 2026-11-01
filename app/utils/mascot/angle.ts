export function dampAngle(current: number, target: number, delta: number): number {
  let diff = target - current;
  while (diff > Math.PI)
    diff -= Math.PI * 2;
  while (diff < -Math.PI)
    diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-8 * delta));
}