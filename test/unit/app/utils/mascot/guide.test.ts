import { describe, expect, it } from 'vitest'
import { catchphrase, nextCatchphraseIndex } from '#app-utils/mascot/cues'
import { cueStillVisible, hoverChanged, pickGuideCue } from '#app-utils/mascot/pick'
import { GuideAction, MascotTheme } from '#app-types/mascot.enum'
import { clampCueAnchor, clampFeet, isNarrowViewport, mascotPixelHeight, patrolPoint, patrolSpan, pointerHeadsToward, restPoint, standPoint } from '#app-utils/mascot/place'
import { parseSpoken } from '#app-utils/mascot/session'
import type { HotspotBox } from '~/types/mascot'

const posts: HotspotBox = { id: 'posts', left: 10, top: 10, width: 40, height: 20 }
const assistant: HotspotBox = { id: 'assistant', left: 200, top: 400, width: 40, height: 40 }

describe('pickGuideCue', () => {
  it('speaks for the hotspot under the pointer', () => {
    const cue = pickGuideCue({
      theme: MascotTheme.light,
      boxes: [posts, assistant],
      pointer: { x: 20, y: 16 },
      tappedId: null,
      proximity: 36,
      directOnly: false,
    })

    expect(cue).toEqual({
      id: 'posts',
      text: "Let's look through the posts.",
    })
  })

  it('picks the closer control and attaches the chat action', () => {
    const cue = pickGuideCue({
      theme: MascotTheme.dark,
      boxes: [posts, assistant],
      pointer: { x: 210, y: 410 },
      tappedId: null,
      proximity: 36,
      directOnly: false,
    })

    expect(cue).toEqual({
      id: 'assistant',
      text: 'Talk, then.',
      action: GuideAction.openAssistant,
    })
  })

  it('speaks again when the pointer enters a different control', () => {
    expect(hoverChanged('posts', null)).toBe(true)
    expect(hoverChanged('runner', 'posts')).toBe(true)
    expect(hoverChanged('posts', 'posts')).toBe(false)
    expect(hoverChanged(null, 'posts')).toBe(false)
  })

  it('ignores a pointer that is outside proximity', () => {
    const cue = pickGuideCue({
      theme: MascotTheme.light,
      boxes: [posts],
      pointer: { x: 400, y: 400 },
      tappedId: null,
      proximity: 36,
      directOnly: false,
    })

    expect(cue).toBeNull()
  })

  it('on a coarse pointer uses the tap and ignores hover', () => {
    const tapped = pickGuideCue({
      theme: MascotTheme.light,
      boxes: [assistant],
      pointer: { x: 20, y: 16 },
      tappedId: 'assistant',
      proximity: 36,
      directOnly: true,
    })
    const hover = pickGuideCue({
      theme: MascotTheme.light,
      boxes: [assistant],
      pointer: { x: 210, y: 410 },
      tappedId: null,
      proximity: 36,
      directOnly: true,
    })

    expect(tapped?.id).toBe('assistant')
    expect(hover).toBeNull()
  })

  it('ignores a tap on a control that is not on screen', () => {
    const cue = pickGuideCue({
      theme: MascotTheme.light,
      boxes: [posts],
      pointer: null,
      tappedId: 'runner',
      proximity: 36,
      directOnly: true,
    })

    expect(cue).toBeNull()
  })
})

describe('cueStillVisible', () => {
  it('holds the line for a minimum time, then follows the pointer', () => {
    expect(cueStillVisible({
      shownFor: 1,
      minSeconds: 2.5,
      pointerNear: false,
      directOnly: false,
    })).toBe(true)
    expect(cueStillVisible({
      shownFor: 3,
      minSeconds: 2.5,
      pointerNear: true,
      directOnly: false,
    })).toBe(true)
    expect(cueStillVisible({
      shownFor: 3,
      minSeconds: 2.5,
      pointerNear: false,
      directOnly: false,
    })).toBe(false)
  })

  it('hides a tap cue once the minimum time has passed', () => {
    expect(cueStillVisible({
      shownFor: 5,
      minSeconds: 4,
      pointerNear: true,
      directOnly: true,
    })).toBe(false)
  })
})

describe('mascot placement', () => {
  const bounds = { left: 0, top: 100, width: 800, height: 500 }

  it('stands just below a header control', () => {
    expect(standPoint(
      { id: 'posts', left: 100, top: 10, width: 80, height: 30 },
      bounds,
    )).toEqual({ x: 140, y: 160 })
  })

  it('stands to the left of a control on the right edge', () => {
    expect(standPoint(
      { id: 'assistant', left: 740, top: 520, width: 44, height: 44 },
      bounds,
    )).toEqual({ x: 652, y: 542 })
  })

  it('rests on the ground line without drifting sideways', () => {
    expect(restPoint({ left: 0, top: 0, width: 800, height: 500 }, false))
      .toEqual({ x: 400, y: 390 })
    expect(restPoint({ left: 0, top: 0, width: 800, height: 500 }, true).y)
      .toBe(360)
  })

  it('patrols left and right on one height', () => {
    const area = { left: 0, top: 0, width: 800, height: 500 }
    const start = patrolPoint(area, 0, false)
    const later = patrolPoint(area, 2, false)
    expect(start).toEqual({ x: 400, y: 390 })
    expect(later.y).toBe(start.y)
    expect(later.x).not.toBe(start.x)
  })

  it('walks most of the stage and turns before either edge', () => {
    const wide = { left: 0, top: 0, width: 1600, height: 900 }
    const span = patrolSpan(wide, false, 180, 64, 70)
    expect(span.y).toBe(702)
    expect(span.left).toBe(202)
    expect(span.right).toBe(1398)
    expect(span.right - span.left).toBeGreaterThan(900)
  })

  it('keeps the head on or below the header bottom', () => {
    expect(clampFeet({ x: 140, y: 160 }, bounds, 300, 180, 40)).toEqual({ x: 140, y: 492 })
  })

  it('does not use a header that sits above the stage', () => {
    expect(clampFeet({ x: 140, y: 160 }, bounds, 300, 40, 40)).toEqual({ x: 140, y: 412 })
  })

  it('keeps the body inside the stage', () => {
    expect(clampFeet({ x: 0, y: 600 }, bounds, 100, 40, 70).x).toBe(82)
    expect(clampFeet({ x: 900, y: 600 }, bounds, 100, 40, 70).x).toBe(718)
  })

  it('knows when the pointer is heading into a dialog', () => {
    const dialog = { left: 200, top: 80, width: 120, height: 64 }
    expect(pointerHeadsToward({ x: 40, y: 112 }, { x: 90, y: 112 }, dialog)).toBe(true)
    expect(pointerHeadsToward({ x: 90, y: 112 }, { x: 40, y: 112 }, dialog)).toBe(false)
    expect(pointerHeadsToward({ x: 220, y: 100 }, { x: 240, y: 110 }, dialog)).toBe(true)
  })

  it('keeps a speech bubble inside the stage', () => {
    expect(clampCueAnchor(10, 800, 224)).toBe(124)
    expect(clampCueAnchor(790, 800, 224)).toBe(676)
  })

  it('uses a larger body on a narrow viewport', () => {
    expect(isNarrowViewport(767)).toBe(true)
    expect(isNarrowViewport(768)).toBe(false)
    expect(mascotPixelHeight(800, false)).toBeCloseTo(157.2)
    expect(mascotPixelHeight(800, true)).toBeCloseTo(229.28)
  })
})

describe('nextCatchphraseIndex', () => {
  it('picks inside the list and never repeats the previous line', () => {
    expect(nextCatchphraseIndex(null, 0)).toBe(0)
    expect(nextCatchphraseIndex(null, 0.99)).toBe(9)
    expect(nextCatchphraseIndex(0, 0)).toBe(1)
    expect(nextCatchphraseIndex(4, 0.5)).not.toBe(4)
    expect(catchphrase(MascotTheme.light, 0)).toBe('Want me to help?')
    expect(catchphrase(MascotTheme.dark, 2)).toBe('We can talk in chat.')
  })
})

describe('parseSpoken', () => {
  it('drops junk and duplicate ids', () => {
    expect(parseSpoken(null)).toEqual([])
    expect(parseSpoken('nope')).toEqual([])
    expect(parseSpoken('["posts","nope","posts","runner"]')).toEqual(['posts', 'runner'])
  })
})