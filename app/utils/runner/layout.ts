export const RUNNER_PLAYER_SCREEN_X = 64;
export const RUNNER_GROUND_RATIO = 0.78;
export const RUNNER_ACTOR_HEIGHT = 112;
export const RUNNER_KUNAI_DROP = 24;

export function runnerPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 1.5);
}