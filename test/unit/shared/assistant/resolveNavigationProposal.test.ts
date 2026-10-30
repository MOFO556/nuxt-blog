import { describe, expect, it } from 'vitest'
import { resolveNavigationProposal } from '~~/shared/assistant/resolveNavigationProposal'

describe('resolveNavigationProposal', () => {
  it('turns path=/posts + tags into a tag filter route', () => {
    expect(resolveNavigationProposal({
      path: '/posts',
      tags: ['test-theme'],
      reason: 'Filter by tag',
    })).toEqual({
      status: 'awaiting_user_confirm',
      path: '/posts/tag/test-theme',
      query: {},
      reason: 'Filter by tag',
    })
  })

  it('keeps an explicit path when no filter fields are set', () => {
    expect(resolveNavigationProposal({
      path: '/office/posts/create',
      reason: 'Create a post',
    })).toEqual({
      status: 'awaiting_user_confirm',
      path: '/office/posts/create',
      query: {},
      reason: 'Create a post',
    })
  })

  it('merges q filter onto /posts query', () => {
    expect(resolveNavigationProposal({
      path: '/posts',
      q: 'test',
    })).toEqual({
      status: 'awaiting_user_confirm',
      path: '/posts',
      query: { q: 'test' },
      reason: 'Apply post list filters',
    })
  })
})
