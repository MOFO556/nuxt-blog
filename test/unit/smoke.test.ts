import { describe, expect, it } from 'vitest'

describe('unit project smoke', () => {
  it('runs in node environment', () => {
    expect(typeof process.versions.node).toBe('string')
  })
})
