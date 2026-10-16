import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '~/stores/user.store'

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setUser stores public User fields and marks loggedIn', () => {
    const store = useUserStore()
    expect(store.loggedIn).toBe(false)

    store.setUser({ id: 7, login: 'alice', password: 'ignored', avatar: '/a.png' })

    expect(store.loggedIn).toBe(true)
    expect(store.user).toEqual({ id: 7, login: 'alice', avatar: '/a.png' })
  })

  it('clearUser removes the session flag', () => {
    const store = useUserStore()
    store.setUser({ id: 1, login: 'bob', password: '' })
    store.clearUser()
    expect(store.user).toBeNull()
    expect(store.loggedIn).toBe(false)
  })

  it('resolveInit flips inited', () => {
    const store = useUserStore()
    expect(store.inited).toBe(false)
    store.resolveInit()
    expect(store.inited).toBe(true)
    store.resetInit()
    expect(store.inited).toBe(false)
  })
})
