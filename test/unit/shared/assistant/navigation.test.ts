import { describe, expect, it } from 'vitest'
import {
  buildPostsFilterPath,
  normalizeAssistantNavigation,
} from '~~/shared/assistant/navigation'

describe('normalizeAssistantNavigation', () => {
  it('accepts in-app paths and query maps', () => {
    expect(normalizeAssistantNavigation({
      path: '/posts',
      query: { tags: 'vue', empty: '' },
    })).toEqual({
      ok: true,
      path: '/posts',
      query: { tags: 'vue' },
    })
  })

  it('rejects external or protocol-relative paths', () => {
    expect(normalizeAssistantNavigation({ path: 'https://evil.test' }).ok).toBe(false)
    expect(normalizeAssistantNavigation({ path: '//evil.test' }).ok).toBe(false)
    expect(normalizeAssistantNavigation({ path: '/admin' }).ok).toBe(false)
  })
})

describe('buildPostsFilterPath', () => {
  it('uses tag prebuild path for a single tag filter', () => {
    expect(buildPostsFilterPath({ tags: 'vue' })).toEqual({
      path: '/posts/tag/vue',
      reason: 'Show posts tagged vue',
    })
  })

  it('uses author prebuild path when only author is set', () => {
    expect(buildPostsFilterPath({ author: 'jane' })).toEqual({
      path: '/posts/author/jane',
      reason: 'Show posts by jane',
    })
  })

  it('falls back to /posts query for combined filters', () => {
    expect(buildPostsFilterPath({ tags: ['a', 'b'], q: 'hello' })).toEqual({
      path: '/posts',
      query: { q: 'hello', tags: 'a,b' },
      reason: 'Apply post list filters',
    })
  })
})
