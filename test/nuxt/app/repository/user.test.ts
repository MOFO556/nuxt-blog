import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createUserRepository } from '~/repository/user'
import { useUserStore } from '~/stores/user.store'

const { cookieRef } = vi.hoisted(() => ({
  cookieRef: { value: null as string | null },
}))

mockNuxtImport('useAuthTokenCookie', () => () => cookieRef)

describe('createUserRepository', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    cookieRef.value = null
  })

  it('login stores token cookie and User on success', async () => {
    const appFetch = vi.fn().mockResolvedValue({
      user: { id: 3, login: 'carol', avatar: undefined },
      token: 'jwt-token',
    })

    const repo = createUserRepository(appFetch as unknown as typeof $fetch)
    const res = await repo.login({ login: 'carol', password: 'secret12' })

    expect(appFetch).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      body: { login: 'carol', password: 'secret12' },
    })
    expect(res.token).toBe('jwt-token')
    expect(cookieRef.value).toBe('jwt-token')
    expect(useUserStore().user?.login).toBe('carol')
    expect(useUserStore().loggedIn).toBe(true)
  })

  it('register stores token cookie and User on success', async () => {
    const appFetch = vi.fn().mockResolvedValue({
      user: { id: 4, login: 'dave' },
      token: 'reg-token',
    })

    const repo = createUserRepository(appFetch as unknown as typeof $fetch)
    await repo.register({ login: 'dave', password: 'secret12' })

    expect(cookieRef.value).toBe('reg-token')
    expect(useUserStore().user?.id).toBe(4)
  })

  it('check clears User when auth is false', async () => {
    const store = useUserStore()
    store.setUser({ id: 1, login: 'x', password: '' })

    const appFetch = vi.fn().mockResolvedValue({ auth: false })
    const repo = createUserRepository(appFetch as unknown as typeof $fetch)
    await repo.check()

    expect(store.user).toBeNull()
    expect(store.inited).toBe(true)
  })

  it('revokeSession calls DELETE on the Session endpoint', async () => {
    const appFetch = vi.fn().mockResolvedValue([])
    const repo = createUserRepository(appFetch as unknown as typeof $fetch)
    await repo.revokeSession('session-9')

    expect(appFetch).toHaveBeenCalledWith('/api/auth/sessions/session-9', {
      method: 'DELETE',
    })
  })
})
