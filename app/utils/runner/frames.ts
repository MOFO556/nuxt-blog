import type { RunnerFrames } from '~/types/runner';

function numberList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0)
    return null;
  const nums: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number' || !Number.isFinite(item))
      return null;
    nums.push(item);
  }
  return nums;
}

export function parseRunnerFrames(value: unknown): RunnerFrames | null {
  if (!value || typeof value !== 'object')
    return null;
  const record = value as Record<string, unknown>;
  const { frameW, frameH } = record;
  if (typeof frameW !== 'number' || typeof frameH !== 'number' || frameW <= 0 || frameH <= 0)
    return null;
  const run = numberList(record.run);
  const jump = numberList(record.jump);
  const duck = numberList(record.duck);
  if (!run || !jump || !duck)
    return null;
  return { frameW, frameH, run, jump, duck };
}