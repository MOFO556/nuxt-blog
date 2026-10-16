import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { createMockUserResp } from '#test-helpers/api-mock'
import LoginPage from '~/pages/auth/login.vue'

const { navigateTo, loginFn } = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  loginFn: vi.fn(),
}))

mockNuxtImport('navigateTo', () => navigateTo)

type SetupState = {
  form: {
    value: { login: string, password: string, usePasskey: boolean }
    submit: (method: (payload: unknown) => Promise<unknown>) => Promise<void>
  }
}

function setupStateOf(wrapper: { vm: unknown }): SetupState {
  const vm = wrapper.vm as { $: { setupState: SetupState } }
  return vm.$.setupState
}

describe('Login page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    navigateTo.mockReset()
    loginFn.mockReset()
    loginFn.mockResolvedValue(createMockUserResp({
      user: { id: 1, login: 'alice1', password: '' },
      token: 'tok',
    }))
  })

  it('renders Sign In CTA', async () => {
    const wrapper = await mountSuspended(LoginPage)
    expect(wrapper.text()).toContain('Sign In')
  })

  it('submits password login through auth.login', async () => {
    const wrapper = await mountSuspended(LoginPage)
    const { form } = setupStateOf(wrapper)
    form.value.login = 'alice1'
    form.value.password = 'secret12'
    form.value.usePasskey = false

    await form.submit(loginFn)

    expect(loginFn).toHaveBeenCalledWith(
      expect.objectContaining({
        login: 'alice1',
        password: 'secret12',
      }),
    )
    expect(navigateTo).toHaveBeenCalledWith('/')
  })
})
