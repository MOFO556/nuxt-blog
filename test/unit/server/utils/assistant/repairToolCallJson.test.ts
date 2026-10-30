import { describe, expect, it } from 'vitest'
import { repairToolCallJson } from '~~/server/utils/assistant/repairToolCallJson'

describe('repairToolCallJson', () => {
  it('returns valid JSON unchanged', () => {
    expect(repairToolCallJson('{"query":"cars","perPage":6}')).toBe(
      '{"query":"cars","perPage":6}',
    )
  })

  it('strips markdown fences and trailing commas', () => {
    const raw = '```json\n{"query":"f1",}\n```'
    expect(JSON.parse(repairToolCallJson(raw)!)).toEqual({ query: 'f1' })
  })

  it('returns null for irreparable text', () => {
    expect(repairToolCallJson('not json at all')).toBeNull()
  })
})