import { describe, expect, it } from 'vitest'
import { formatDate } from '#app-utils/formatRelative'

describe('formatDate', () => {
  it('formats an ISO date in en-US long form', () => {
    const formatted = formatDate('2026-03-15T14:30:00.000Z')
    expect(formatted).toMatch(/March/)
    expect(formatted).toMatch(/15/)
    expect(formatted).toMatch(/2026/)
  })
})
