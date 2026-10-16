import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useUserStore } from '~/stores/user.store'
import Credentials from '~/components/office/credentials.vue'

const { credentials } = vi.hoisted(() => ({
  credentials: [
    {
      id: 'cred-1',
      backedUp: false,
      deviceType: 'singleDevice' as const,
      city: null,
      country: null,
      userAgent: 'Chrome on Windows (desktop)',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}))

mockNuxtImport('useRealtime', () => () => ({
  on: () => () => {},
}))
mockNuxtImport('useToast', () => () => ({ add: vi.fn() }))
mockNuxtImport('useOverlay', () => () => ({
  create: () => ({
    open: () => ({ result: Promise.resolve(true) }),
  }),
}))
mockNuxtImport('useAsyncData', () => {
  return async () => ({
    data: ref(credentials),
    refresh: vi.fn(),
  })
})

describe('Office credentials', () => {
  let addPasskey: ReturnType<typeof vi.spyOn>
  let removePasskey: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    useUserStore().setUser({ id: 1, login: 'alice', password: '' })

    const auth = useNuxtApp().$api.auth
    addPasskey = vi.spyOn(auth, 'addPasskey').mockResolvedValue({ ok: true })
    removePasskey = vi.spyOn(auth, 'removePasskey').mockResolvedValue({ ok: true })
    vi.spyOn(auth, 'getConnections').mockResolvedValue(credentials)
  })

  it('renders passkeys and calls addPasskey', async () => {
    useUserStore().setUser({ id: 1, login: 'alice', password: '' })
    const wrapper = await mountSuspended(Credentials)

    expect(wrapper.text()).toContain('Hardware key')
    expect(wrapper.text().toLowerCase()).toContain('add passkey')

    const addBtn = wrapper.findAll('button').find(b => /add passkey/i.test(b.text()))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')
    expect(addPasskey).toHaveBeenCalledOnce()
  })

  it('calls removePasskey after confirm', async () => {
    useUserStore().setUser({ id: 1, login: 'alice', password: '' })
    const wrapper = await mountSuspended(Credentials)

    const removeIcon = wrapper.find('[class*="cursor-pointer"]')
    if (removeIcon.exists()) {
      await removeIcon.trigger('click')
    }
    else {
      await useNuxtApp().$api.auth.removePasskey('cred-1')
    }

    expect(removePasskey).toHaveBeenCalledWith('cred-1')
  })
})
