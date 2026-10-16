import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ConfirmDialog from '~/components/confirm-dialog.vue'

describe('ConfirmDialog', () => {
  it('emits close(true) when accept is clicked', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: {
        description: 'Do you want to remove passkey?',
        acceptButton: 'OK',
        declineButton: 'Cancel',
      },
      global: {
        stubs: {
          UModal: {
            template: `
              <div>
                <slot name="body" />
                <slot name="footer" />
              </div>
            `,
          },
          UButton: {
            props: ['label'],
            template: `<button @click="$attrs.onClick?.($event)">{{ label }}</button>`,
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Do you want to remove passkey?')

    const ok = wrapper.findAll('button').find(b => b.text().includes('OK'))
    expect(ok).toBeTruthy()
    await ok!.trigger('click')
    expect(wrapper.emitted('close')?.[0]).toEqual([true])
  })

  it('emits close(false) when decline is clicked', async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { description: 'Sure?', declineButton: 'Cancel', acceptButton: 'OK' },
      global: {
        stubs: {
          UModal: {
            template: `<div><slot name="body" /><slot name="footer" /></div>`,
          },
          UButton: {
            props: ['label'],
            template: `<button @click="$attrs.onClick?.($event)">{{ label }}</button>`,
          },
        },
      },
    })

    const cancel = wrapper.findAll('button').find(b => b.text().includes('Cancel'))
    expect(cancel).toBeTruthy()
    await cancel!.trigger('click')
    expect(wrapper.emitted('close')?.[0]).toEqual([false])
  })
})
