import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { nextTick } from 'vue'
import ImagesDescription from '~/components/images/description.vue'

describe('images-description', () => {
  it('keeps the committed draft in read mode even if the model prop stays stale', async () => {
    const stopped: string[] = []

    const wrapper = await mountSuspended(ImagesDescription, {
      props: {
        modelValue: 'old',
        canEdit: true,
        onEditStopped: (v: string | undefined) => {
          stopped.push(v ?? '')
        },
      },
      global: {
        stubs: {
          UInput: {
            props: ['modelValue'],
            emits: ['update:modelValue'],
            template: `
              <input
                class="desc-input"
                :value="modelValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
            `,
          },
        },
      },
    })

    await wrapper.get('div').trigger('dblclick')
    await nextTick()

    const input = wrapper.get('.desc-input')
    await input.setValue('brand new caption')
    await input.trigger('keydown.ctrl.enter')
    await nextTick()

    await wrapper.setProps({ modelValue: 'old' })
    await nextTick()

    expect(stopped).toEqual(['brand new caption'])
    expect(wrapper.get('div').text()).toContain('brand new caption')

    await wrapper.get('div').trigger('dblclick')
    await nextTick()
    expect((wrapper.get('.desc-input').element as HTMLInputElement).value).toBe('brand new caption')
  })
})
