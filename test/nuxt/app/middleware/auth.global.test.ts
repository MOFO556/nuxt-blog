import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useUserStore } from '~/stores/user.store'

const { navigateTo, cookieRef } = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  cookieRef: { value: null as string | null },
}))

mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useAuthTokenCookie', () => () => cookieRef)

async function runMiddleware(meta: { auth?: boolean, guest?: boolean }) {
  const mod = await import('~/middleware/auth.global')
  const middleware = mod.default
  const to = {
    matched: [{ meta }],
  }
  return middleware(to as never, undefined as never)
}

describe('auth.global middleware', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    cookieRef.value = null
    useUserStore().clearUser()
    useUserStore().resetInit()
  })

  it('redirects guests away from auth-required routes', async () => {
    await runMiddleware({ auth: true })
    expect(navigateTo).toHaveBeenCalledWith('/auth/login')
  })

  it('allows access when a token cookie is present', async () => {
    cookieRef.value = 'token'
    const result = await runMiddleware({ auth: true })
    expect(navigateTo).not.toHaveBeenCalled()
    expect(result).toBeUndefined()
  })

  it('redirects logged-in users away from guest routes after init', async () => {
    const store = useUserStore()
    store.setUser({ id: 1, login: 'eve', password: '' })
    store.resolveInit()

    await runMiddleware({ guest: true })
    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('does not redirect guests on guest routes before init', async () => {
    await runMiddleware({ guest: true })
    expect(navigateTo).not.toHaveBeenCalled()
  })
})
