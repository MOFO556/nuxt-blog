import { describe, expect, it } from 'vitest'
import { Gait, HoverBeat, MascotClip } from '#app-types/mascot.enum'
import { dampAngle } from '#app-utils/mascot/angle'
import { stageClip } from '#app-utils/mascot/clip'
import { nextGait, stepPlanar } from '#app-utils/mascot/motion'

describe('stepPlanar', () => {
  it('snaps into place before the body is ready', () => {
    const motion = { x: 0, y: 0, ready: false, velocityX: 4, velocityY: 4 }
    stepPlanar(motion, { x: 10, y: -3 }, false, 100, 0.016)
    expect(motion).toEqual({ x: 10, y: -3, ready: true, velocityX: 0, velocityY: 0 })
  })

  it('steps toward a point and does not pass it', () => {
    const motion = { x: 0, y: 0, ready: true, velocityX: 0, velocityY: 0 }
    stepPlanar(motion, { x: 100, y: 0 }, false, 50, 1)
    expect(motion.x).toBe(50)
    expect(motion.y).toBe(0)
    expect(motion.velocityX).toBe(50)
  })
})

describe('nextGait', () => {
  it('walks on patrol and settles when the body nearly stops', () => {
    expect(nextGait({
      gait: Gait.idle,
      hoverBeat: null,
      poseLock: false,
      patrolling: true,
      speed: 0,
    })).toBe(Gait.walk)
    expect(nextGait({
      gait: Gait.walk,
      hoverBeat: null,
      poseLock: false,
      patrolling: false,
      speed: 10,
    })).toBe(Gait.idle)
    expect(nextGait({
      gait: Gait.walk,
      hoverBeat: HoverBeat.stand,
      poseLock: true,
      patrolling: true,
      speed: 100,
    })).toBe(Gait.idle)
  })
})

describe('stageClip', () => {
  it('holds a notice and loops locomotion', () => {
    expect(stageClip({
      arriving: false,
      posing: true,
      direct: false,
      walking: true,
      hasNotice: true,
      hasWalk: true,
    })).toEqual({ name: MascotClip.Notice, loop: false })
    expect(stageClip({
      arriving: false,
      posing: false,
      direct: false,
      walking: true,
      hasNotice: false,
      hasWalk: false,
    })).toEqual({ name: MascotClip.Run, loop: true })
    expect(stageClip({
      arriving: true,
      posing: false,
      direct: false,
      walking: false,
      hasNotice: false,
      hasWalk: true,
    })).toEqual({ name: MascotClip.Arrive, loop: false })
  })
})

describe('dampAngle', () => {
  it('turns the short way around the circle', () => {
    const next = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 1)
    expect(next).toBeGreaterThan(Math.PI - 0.1)
  })
})