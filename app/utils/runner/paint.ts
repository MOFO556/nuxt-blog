import type { Obstacle } from '~/types/runner';
import type { MascotTheme } from '~/types/mascot.enum';
import { ObstacleKind } from '~/types/runner.enum';
import { runnerPalette } from '~/utils/dictionary/color';
import { RUNNER_GROUND_RATIO, RUNNER_PLAYER_SCREEN_X } from '~/utils/runner/layout';

type CoursePaint = (typeof runnerPalette)[MascotTheme];

export function paintCourse(input: {
  ctx: CanvasRenderingContext2D,
  dpr: number,
  width: number,
  height: number,
  paint: CoursePaint,
  obstacles: readonly Obstacle[],
  stonesReady: boolean,
  kunaiReady: boolean,
  playerY: number,
  ducking: boolean,
  drawBody: boolean,
}) {
  const { ctx, width, height, paint } = input;
  ctx.setTransform(input.dpr, 0, 0, input.dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = paint.course;
  ctx.fillRect(0, 0, width, height);
  const ground = height * RUNNER_GROUND_RATIO;
  ctx.fillStyle = paint.ground;
  ctx.fillRect(0, ground, width, height - ground);

  for (const obstacle of input.obstacles) {
    const modeled = obstacle.kind === ObstacleKind.air ? input.kunaiReady : input.stonesReady;
    if (modeled)
      continue;
    const screenX = RUNNER_PLAYER_SCREEN_X + (obstacle.x - 40);
    const top = ground - (obstacle.y + obstacle.height);
    if (obstacle.kind === ObstacleKind.air) {
      const midY = top + obstacle.height / 2;
      ctx.fillStyle = paint.kunai;
      ctx.beginPath();
      ctx.moveTo(screenX, midY);
      ctx.lineTo(screenX + obstacle.width * 0.42, top);
      ctx.lineTo(screenX + obstacle.width, midY);
      ctx.lineTo(screenX + obstacle.width * 0.42, top + obstacle.height);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(
        screenX,
        top + obstacle.height * 0.38,
        obstacle.width * 0.42,
        obstacle.height * 0.24,
      );
    }
    else {
      ctx.fillStyle = paint.stone;
      ctx.fillRect(screenX, top, obstacle.width, obstacle.height);
    }
  }

  if (!input.drawBody)
    return;
  const feet = ground - input.playerY;
  const bodyH = input.ducking && input.playerY <= 0 ? 28 : 52;
  const bodyW = 28;
  const bodyTop = feet - bodyH;
  ctx.fillStyle = paint.body;
  ctx.fillRect(RUNNER_PLAYER_SCREEN_X, bodyTop + 14, bodyW, bodyH - 14);
  ctx.fillStyle = paint.head;
  ctx.beginPath();
  ctx.arc(RUNNER_PLAYER_SCREEN_X + bodyW / 2, bodyTop + 12, 11, 0, Math.PI * 2);
  ctx.fill();
}