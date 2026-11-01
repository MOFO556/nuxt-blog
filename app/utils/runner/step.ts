import type { Obstacle, RunnerInput, RunnerState } from '~/types/runner';
import { ObstacleKind, RunnerPhase } from '~/types/runner.enum';

const PLAYER_X = 40;
const PLAYER_W = 28;
const PLAYER_H = 48;
const DUCK_H = 24;
const HURT_INSET = 4;
const GRAVITY = 2200;
const JUMP_VY = 700;
const START_SPEED = 240;
const ACCEL = 8;
const MAX_SPEED = 640;
const SPAWN_AHEAD = 720;
const GROUND_W = 28;
const GROUND_H = 32;
const AIR_W = 34;
const AIR_H = 108;
const AIR_Y = 22;

type Box = { x: number, y: number, w: number, h: number };

function gapFromUnit(unit: number): number {
  return 240 + Math.floor(unit * 860);
}

function nextUnit(seed: number): { unit: number, seed: number } {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return { unit: next / 4294967296, seed: next };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y;
}

function playerHurtbox(state: RunnerState): Box {
  const height = state.ducking && state.playerY <= 0 ? DUCK_H : PLAYER_H;
  return {
    x: PLAYER_X + HURT_INSET,
    y: state.playerY + HURT_INSET,
    w: PLAYER_W - HURT_INSET * 2,
    h: height - HURT_INSET * 2,
  };
}

export function runnerScore(distance: number): number {
  return Math.floor(distance / 8);
}

export function nextBest(currentBest: number, score: number): number {
  return score > currentBest ? score : currentBest;
}

export function createRunner(seed = 1): RunnerState {
  return {
    phase: RunnerPhase.running,
    distance: 0,
    speed: START_SPEED,
    playerY: 0,
    playerVy: 0,
    ducking: false,
    obstacles: [],
    nextId: 1,
    sinceSpawn: 0,
    nextGap: gapFromUnit(nextUnit(seed >>> 0).unit),
    rng: seed >>> 0,
  };
}

export function stepRunner(
  state: RunnerState,
  input: RunnerInput,
  dt: number,
): RunnerState {
  if (state.phase === 'dead' || dt <= 0)
    return state;

  const speed = Math.min(MAX_SPEED, state.speed + ACCEL * dt);
  const travel = speed * dt;
  const distance = state.distance + travel;

  let playerVy = state.playerVy;
  let playerY = state.playerY;
  const onGround = playerY <= 0 && playerVy <= 0;
  const ducking = input.duck && onGround;
  if (input.jump && onGround && !input.duck)
    playerVy = JUMP_VY;
  playerVy -= GRAVITY * dt;
  playerY += playerVy * dt;
  if (playerY <= 0) {
    playerY = 0;
    playerVy = 0;
  }

  const moved: Obstacle[] = [];
  for (const obstacle of state.obstacles) {
    const x = obstacle.x - travel;
    if (x + obstacle.width >= -40)
      moved.push({ ...obstacle, x });
  }

  let sinceSpawn = state.sinceSpawn + travel;
  let nextGap = state.nextGap;
  let rng = state.rng;
  let nextId = state.nextId;
  let guard = 0;
  while (sinceSpawn >= nextGap && guard < 8) {
    sinceSpawn -= nextGap;
    const kindRoll = nextUnit(rng);
    const gapRoll = nextUnit(kindRoll.seed);
    const placeRoll = nextUnit(gapRoll.seed);
    rng = placeRoll.seed;
    const air = kindRoll.unit >= 0.5;
    moved.push({
      id: nextId,
      kind: air ? ObstacleKind.air : ObstacleKind.ground,
      x: PLAYER_X + SPAWN_AHEAD + Math.floor(placeRoll.unit * 220),
      y: air ? AIR_Y : 0,
      width: air ? AIR_W : GROUND_W,
      height: air ? AIR_H : GROUND_H,
    });
    nextGap = gapFromUnit(gapRoll.unit);
    nextId += 1;
    guard += 1;
  }

  const body = playerHurtbox({ ...state, playerY, ducking });
  let phase = RunnerPhase.running;
  for (const obstacle of moved) {
    if (overlaps(body, {
      x: obstacle.x,
      y: obstacle.y,
      w: obstacle.width,
      h: obstacle.height,
    })) {
      phase = RunnerPhase.dead;
      break;
    }
  }

  return {
    phase,
    distance,
    speed,
    playerY,
    playerVy,
    ducking,
    obstacles: moved,
    nextId,
    sinceSpawn,
    nextGap,
    rng,
  };
}