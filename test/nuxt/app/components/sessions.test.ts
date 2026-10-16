import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useUserStore } from '~/stores/user.store'
import Sessions from '~/components/office/sessions.vue'

const { revokeSession, sessions } = vi.hoisted(() => {
  const sessions = [
    {
      id: 'current-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      city: null,
      country: null,
      userAgent: 'Chrome on Windows (desktop)',
      loginMethod: 'password' as const,
      lastSeenAt: '2026-01-01T00:00:00.000Z',
      invalidated: false,
      invalidReason: null,
      current: true,
    },
    {
      id: 'other-2',
      createdAt: '2026-01-01T00:00:00.000Z',
      city: null,
      country: null,
      userAgent: 'Firefox on Linux (desktop)',
      loginMethod: 'password' as const,
      lastSeenAt: '2026-01-01T00:00:00.000Z',
      invalidated: false,
      invalidReason: null,
      current: false,
    },
  ]
  return {
    revokeSession: vi.fn(async (_id: string) => []),
    sessions,
  }
})

mockNuxtImport('useRealtime', () => () => ({
  on: () => () => {},
}))

mockNuxtImport('useAsyncData', () => {
  return async () => ({
    data: ref(sessions),
    refresh: vi.fn(),
  })
})

describe('Office sessions', () => {
  beforeEach(() => {
    revokeSession.mockClear()
    useUserStore().setUser({ id: 1, login: 'alice', password: '' })

    const auth = useNuxtApp().$api.auth
    vi.spyOn(auth, 'revokeSession').mockImplementation(revokeSession)
    vi.spyOn(auth, 'getSessions').mockResolvedValue(sessions)
  })

  it('renders Session cards and revokes a non-current Session', async () => {
    useUserStore().setUser({ id: 1, login: 'alice', password: '' })
    const wrapper = await mountSuspended(Sessions)

    expect(wrapper.text()).toContain('Chrome on Windows (desktop)')
    expect(wrapper.text()).toContain('Firefox on Linux (desktop)')
    expect(wrapper.text()).toContain('Revoke')

    const revokeButtons = wrapper.findAll('button').filter(b => b.text().includes('Revoke'))
    expect(revokeButtons.length).toBeGreaterThan(0)
    await revokeButtons[0]!.trigger('click')

    expect(revokeSession).toHaveBeenCalledWith('other-2')
  })
})
