import type { AnimationClip, AnimationMixer, Box3, Group } from 'three';
import type { MascotFit } from '~/types/mascot';
import type { MascotTheme } from '~/types/mascot.enum';
import type { ObstacleKind, RunnerPhase, RunnerPose } from '~/types/runner.enum';

export type Obstacle = {
  id: number,
  kind: ObstacleKind,
  x: number,
  y: number,
  width: number,
  height: number,
};

export type RunnerState = {
  phase: RunnerPhase,
  distance: number,
  speed: number,
  playerY: number,
  playerVy: number,
  ducking: boolean,
  obstacles: readonly Obstacle[],
  nextId: number,
  sinceSpawn: number,
  nextGap: number,
  rng: number,
};

export type RunnerInput = {
  jump: boolean,
  duck: boolean,
};

export type RunnerFrames = {
  frameW: number,
  frameH: number,
  run: number[],
  jump: number[],
  duck: number[],
};

export type RunnerActor = {
  theme: MascotTheme,
  group: Group,
  mixer: AnimationMixer,
  clips: Map<string, AnimationClip>,
  fit: MascotFit,
  pose: RunnerPose | '',
};

export type PropTemplate = {
  group: Group,
  box: Box3,
};