import { describe, expect, it } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import PostsForm from '~/components/posts/form.vue'

registerEndpoint('/api/tags/', () => [])
registerEndpoint('/tags/', () => [])

describe('posts-form', () => {
  it('shows TipTap editor controls when mode is formatted on create', async () => {
    const wrapper = await mountSuspended(PostsForm, {
      props: {},
      global: {
        stubs: {
          UForm: { template: '<form><slot /></form>' },
          UFormField: { props: ['label', 'name'], template: '<div><span class="label">{{ label }}</span><slot /></div>' },
          UInput: { template: '<input />' },
          UTextarea: { template: '<textarea class="legacy-content" />' },
          USelectMenu: { template: '<div class="tags" />' },
          UFileUpload: { template: '<div class="file-upload"><slot name="files" :files="[]" :removeFile="() => {}" /></div>' },
          UButton: { template: '<button type="submit">Create</button>' },
          UCheckbox: { template: '<input type="checkbox" />' },
          UModal: { template: '<div />' },
          URadioGroup: {
            props: ['modelValue', 'items'],
            emits: ['update:modelValue'],
            template: `
              <div class="mode-toggle">
                <button
                  v-for="item in items"
                  :key="item.value"
                  type="button"
                  @click="$emit('update:modelValue', item.value)"
                >{{ item.label }}</button>
              </div>
            `,
          },
          PostsEditor: { template: '<div class="formatted-editor" />' },
        },
      },
    })

    expect(wrapper.find('.legacy-content').exists()).toBe(true)
    expect(wrapper.find('.formatted-editor').exists()).toBe(false)

    const formattedBtn = wrapper.findAll('.mode-toggle button')
      .find(b => b.text().includes('Formatted'))
    expect(formattedBtn).toBeTruthy()
    await formattedBtn!.trigger('click')
    await nextTick()

    expect(wrapper.find('.formatted-editor').exists()).toBe(true)
    expect(wrapper.text()).toContain('Cover')
    expect(wrapper.text()).not.toContain('Media library')
  })
})
