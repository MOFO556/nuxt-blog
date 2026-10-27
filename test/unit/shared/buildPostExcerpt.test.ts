import { describe, expect, it } from 'vitest'
import { buildPostExcerpt } from '#shared/utils/buildPostExcerpt'

describe('buildPostExcerpt', () => {
  it('prefers description when provided', () => {
    expect(buildPostExcerpt({
      description: 'Custom blurb',
      contentHtml: '<p>Long body that should be ignored</p>',
      content: 'legacy body ignored',
      mode: 'formatted',
    })).toBe('Custom blurb')
  })

  it('strips HTML for formatted posts when description is empty', () => {
    expect(buildPostExcerpt({
      description: '',
      contentHtml: '<p>Hello <strong>world</strong></p>',
      content: '{}',
      mode: 'formatted',
    })).toBe('Hello world')
  })

  it('truncates plain legacy content to 200 characters', () => {
    const content = 'a'.repeat(250)
    expect(buildPostExcerpt({
      content,
      mode: 'legacy',
    })).toBe('a'.repeat(200))
  })
})
