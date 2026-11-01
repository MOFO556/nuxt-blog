export enum ObstacleKind {
  ground = 'ground',
  air = 'air',
}

export enum RunnerPhase {
  running = 'running',
  dead = 'dead',
}

export enum RunnerPose {
  Jump = 'Jump',
  Duck = 'Duck',
  Run = 'Run',
  Walk = 'Walk',
  Idle = 'Idle',
}

export enum KeyboardCode {
  pause = 'KeyP',
  escape = 'Escape',
  jump = 'Space',
  jumpAlt = 'ArrowUp',
  duck = 'ArrowDown',
}