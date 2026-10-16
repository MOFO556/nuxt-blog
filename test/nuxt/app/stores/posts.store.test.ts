import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePostsStore } from '~/stores/posts.store'
import type { Post } from '~/types/posts'

function post(id: number): Post {
  return {
    id,
    title: `Post ${id}`,
    content: 'x'.repeat(30),
    url: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 1,
    user: { id: 1, login: 'author' },
    tags: [],
  }
}

describe('usePostsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('nextPostId and prevPostId navigate the list edges', () => {
    const store = usePostsStore()
    store.addPosts([post(10), post(20), post(30)])

    expect(store.prevPostId(10)).toBe(0)
    expect(store.nextPostId(10)).toBe(20)
    expect(store.prevPostId(20)).toBe(10)
    expect(store.nextPostId(20)).toBe(30)
    expect(store.nextPostId(30)).toBe(0)
    expect(store.prevPostId(30)).toBe(20)
  })
})
