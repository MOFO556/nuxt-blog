import { describe, expect, it } from 'vitest'
import { ObstacleKind, RunnerPhase, RunnerPose } from '#app-types/runner.enum'
import { parseRunnerFrames } from '#app-utils/runner/frames'
import { runnerPose } from '#app-utils/runner/pose'
import {
  createRunner,
  nextBest,
  runnerScore,
  stepRunner,
} from '#app-utils/runner/step'

const idle = { jump: false, duck: false }

describe('stepRunner', () => {
  it('leaves the previous state untouched', () => {
    const start = createRunner(1)
    const next = stepRunner(start, idle, 0.5)

    expect(start.distance).toBe(0)
    expect(start.phase).toBe(RunnerPhase.running)
    expect(next.distance).toBeGreaterThan(0)
  })

  it('jumps with a fixed impulse', () => {
    const next = stepRunner(createRunner(1), { jump: true, duck: false }, 0.1)

    expect(next.playerY).toBeCloseTo(48)
    expect(next.playerVy).toBeCloseTo(480)
    expect(next.phase).toBe(RunnerPhase.running)
  })

  it('ducks on the ground and does not jump while duck is held', () => {
    const next = stepRunner(createRunner(1), { jump: true, duck: true }, 0.1)

    expect(next.ducking).toBe(true)
    expect(next.playerY).toBe(0)
  })

  it('speeds up and does not keep a fixed gap between obstacles', () => {
    const first = createRunner(1)
    const next = stepRunner(first, idle, 4)
    const other = stepRunner(createRunner(9), idle, 4)

    expect(next.speed).toBeGreaterThan(first.speed)
    expect(next.distance).toBeGreaterThan(500)
    expect(next.obstacles.length).toBeGreaterThan(0)
    expect(next.nextGap).not.toBe(first.nextGap)
    expect(next.nextGap).not.toBe(other.nextGap)
  })

  it('ends the run when a ground obstacle overlaps the body', () => {
    const next = stepRunner({
      ...createRunner(1),
      obstacles: [{ id: 9, kind: ObstacleKind.ground, x: 50, y: 0, width: 28, height: 32 }],
    }, idle, 0.001)

    expect(next.phase).toBe(RunnerPhase.dead)
  })

  it('lets only a duck pass a kunai', () => {
    const kunai = { id: 3, kind: ObstacleKind.air, x: 50, y: 22, width: 34, height: 108 }
    const state = { ...createRunner(1), obstacles: [kunai] }

    expect(stepRunner(state, { jump: false, duck: true }, 0.001).phase).toBe(RunnerPhase.running)
    expect(stepRunner(state, idle, 0.001).phase).toBe(RunnerPhase.dead)
    expect(stepRunner({ ...state, playerY: 100, playerVy: 0 }, idle, 0.001).phase).toBe(RunnerPhase.dead)
  })

  it('clears a ground obstacle while in the air', () => {
    const next = stepRunner({
      ...createRunner(1),
      playerY: 100,
      obstacles: [{ id: 4, kind: ObstacleKind.ground, x: 50, y: 0, width: 28, height: 32 }],
    }, idle, 0.001)

    expect(next.phase).toBe(RunnerPhase.running)
  })

  it('freezes a finished run', () => {
    const dead = { ...createRunner(1), phase: RunnerPhase.dead, distance: 40 }

    expect(stepRunner(dead, { jump: true, duck: false }, 1)).toBe(dead)
  })

  it('caps speed', () => {
    const next = stepRunner({ ...createRunner(1), speed: 640 }, idle, 1)

    expect(next.speed).toBe(640)
    expect(next.distance).toBeCloseTo(640)
  })
})

describe('runnerScore', () => {
  it('turns distance into a whole score and keeps the better best', () => {
    expect(runnerScore(0)).toBe(0)
    expect(runnerScore(8)).toBe(1)
    expect(runnerScore(15)).toBe(1)
    expect(nextBest(3, 2)).toBe(3)
    expect(nextBest(3, 5)).toBe(5)
  })
})

describe('runnerPose', () => {
  const both = new Set(['Run', 'Walk', 'Jump', 'Duck', 'Idle'])

  it('jumps in the air and ducks on the ground', () => {
    expect(runnerPose(true, true, both)).toBe(RunnerPose.Jump)
    expect(runnerPose(false, true, both)).toBe(RunnerPose.Duck)
    expect(runnerPose(false, false, both)).toBe(RunnerPose.Run)
  })

  it('uses Walk when the model has no Run clip', () => {
    expect(runnerPose(false, false, new Set(['Walk', 'Jump', 'Duck']))).toBe(RunnerPose.Walk)
    expect(runnerPose(false, false, new Set(['Idle']))).toBe(RunnerPose.Idle)
  })
})

describe('parseRunnerFrames', () => {
  it('accepts a strip map and rejects a broken one', () => {
    expect(parseRunnerFrames({
      frameW: 64,
      frameH: 64,
      run: [0, 1],
      jump: [2],
      duck: [3],
    })).toEqual({
      frameW: 64,
      frameH: 64,
      run: [0, 1],
      jump: [2],
      duck: [3],
    })
    expect(parseRunnerFrames({ frameW: 64, run: [] })).toBeNull()
    expect(parseRunnerFrames(null)).toBeNull()
  })
})