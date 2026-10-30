import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PostsDetail from '~/components/posts/detail.vue'
import type { Post } from '~/types/posts'

vi.mock('~/stores/user', () => ({
  useUserStore: () => ({ user: { id: 1 } }),
}))

function basePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    url: '',
    title: 'Test post',
    content: 'legacy plain content goes here xx',
    mode: PostMode.Legacy,
    contentHtml: undefined,
    description: undefined,
    excerpt: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    userId: 1,
    user: { id: 1, login: 'alice' } as Post['user'],
    tags: [],
    attachments: [],
    ...overrides,
  }
}

describe('posts-detail', () => {
  it('renders formatted HTML body and still mounts comments', async () => {
    const wrapper = await mountSuspended(PostsDetail, {
      props: {
        post: basePost({
          mode: PostMode.Formatted,
          content: '{}',
          contentHtml: '<p>Hello formatted</p>',
          attachments: [
            { id: 1, name: 'a.jpg', path: 'images/a.jpg', postCover: true },
          ],
        }),
        basePath: '/posts',
        backPath: '/posts',
      },
      global: {
        stubs: {
          UBlogPost: {
            props: ['title', 'description'],
            template: `
              <div>
                <h1>{{ title }}</h1>
                <slot name="badge" />
                <div class="desc-slot"><slot name="description" /></div>
              </div>
            `,
          },
          PostsAttachments: { template: '<div class="legacy-attachments" />' },
          PostsComments: { template: '<div class="comments">comments</div>' },
          PostsNavigation: { template: '<div class="nav" />' },
          PostsTags: { template: '<div />' },
          PostsFormattedBody: {
            props: ['contentHtml', 'attachments'],
            template: `<div class="formatted-body" v-html="contentHtml" />`,
          },
        },
      },
    })

    expect(wrapper.find('.desc-slot .formatted-body').exists()).toBe(true)
    expect(wrapper.find('.formatted-body').html()).toContain('Hello formatted')
    expect(wrapper.find('.comments').exists()).toBe(true)
    expect(wrapper.find('.legacy-attachments').exists()).toBe(false)
  })

  it('uses formatted body for formatted posts even when contentHtml is empty', async () => {
    const wrapper = await mountSuspended(PostsDetail, {
      props: {
        post: basePost({
          mode: PostMode.Formatted,
          content: '{"type":"doc","content":[]}',
          contentHtml: '',
        }),
        basePath: '/posts',
        backPath: '/posts',
      },
      global: {
        stubs: {
          UBlogPost: {
            props: ['title', 'description'],
            template: `
              <div>
                <h1>{{ title }}</h1>
                <slot name="badge" />
                <div class="desc-slot"><slot name="description" /></div>
              </div>
            `,
          },
          PostsAttachments: { template: '<div class="legacy-attachments" />' },
          PostsComments: { template: '<div class="comments">comments</div>' },
          PostsNavigation: { template: '<div class="nav" />' },
          PostsTags: { template: '<div />' },
          PostsFormattedBody: {
            props: ['contentHtml', 'attachments'],
            template: `<div class="formatted-body" data-html="empty" />`,
          },
        },
      },
    })

    expect(wrapper.find('.desc-slot .formatted-body').exists()).toBe(true)
    expect(wrapper.find('.post-legacy-body').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('{"type":"doc"')
  })
})
