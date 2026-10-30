import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { createTempDbFile } from '#test-helpers/db'
import { buildRegisterPayload } from '#test-fixtures/user'
import { buildPostPayload } from '#test-fixtures/post'

const dbFile = createTempDbFile()

describe('posts API', async () => {
  await setup({
    browser: false,
    env: {
      NUXT_DB_FILE: dbFile,
      APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
      VITEST: 'true',
      NUXT_TEST: 'true',
    },
  })

  async function registerAndToken() {
    const payload = buildRegisterPayload({
      login: `p_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })
    const res = await $fetch<{ token: string, user: { login: string } }>(
      '/api/auth/register',
      { method: 'POST', body: payload },
    )
    return { token: res.token, login: res.user.login }
  }

  it('lists Posts for anonymous readers', async () => {
    const res = await $fetch<{ data: unknown[], pagination: { page: number } }>('/api/posts')
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.pagination.page).toBe(1)
  })

  it('creates a Post when authenticated and filters by author', async () => {
    const { token, login } = await registerAndToken()
    const body = buildPostPayload({
      title: 'Hello posts title',
      content: 'y'.repeat(40),
      tags: [{ name: 'Vitest' }],
    })

    const created = await $fetch<{ id: number, title: string }>(
      '/api/posts',
      {
        method: 'POST',
        body,
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    expect(created.title).toBe('Hello posts title')
    expect(created.id).toBeTypeOf('number')

    const listed = await $fetch<{ data: Array<{ id: number }> }>(
      '/api/posts',
      { query: { author: login } },
    )

    expect(listed.data.some(p => p.id === created.id)).toBe(true)
  })

  it('creates a formatted Post with sanitized HTML and excerpt', async () => {
    const { token } = await registerAndToken()
    const content = JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello formatted' }] }],
    })
    const created = await $fetch<{
      id: number
      mode: string
      contentHtml: string | null
      excerpt: string | null
    }>(
      '/api/posts',
      {
        method: 'POST',
        body: {
          title: 'Formatted post title',
          mode: 'formatted',
          content,
          contentHtml: '<p onclick="alert(1)">Hello formatted</p><script>bad()</script>',
          description: '',
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    expect(created.mode).toBe('formatted')
    expect(created.contentHtml).toBe('<p>Hello formatted</p>')
    expect(created.excerpt).toBe('Hello formatted')

    const fetched = await $fetch<{ mode: string, contentHtml: string | null }>(
      `/api/posts/${created.id}`,
    )
    expect(fetched.mode).toBe('formatted')
    expect(fetched.contentHtml).toBe('<p>Hello formatted</p>')
  })

  it('keeps mode immutable when editing a Post', async () => {
    const { token } = await registerAndToken()
    const created = await $fetch<{ id: number }>(
      '/api/posts',
      {
        method: 'POST',
        body: buildPostPayload({
          title: 'Legacy locked mode',
          content: 'y'.repeat(40),
        }),
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const updated = await $fetch<{ mode: string }>(
      `/api/posts/${created.id}`,
      {
        method: 'PUT',
        body: {
          title: 'Legacy locked mode edit',
          content: 'z'.repeat(40),
          mode: 'formatted',
          contentHtml: '<p>should not switch</p>',
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    expect(updated.mode).toBe('legacy')
  })

  it('rejects oversized content on a legacy Post even when mode is omitted', async () => {
    const { token } = await registerAndToken()
    const created = await $fetch<{ id: number }>(
      '/api/posts',
      {
        method: 'POST',
        body: buildPostPayload({
          title: 'Legacy size guard',
          content: 'y'.repeat(40),
        }),
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    await expect(
      $fetch(`/api/posts/${created.id}`, {
        method: 'PUT',
        body: { content: 'x'.repeat(5001) },
        headers: { Authorization: `Bearer ${token}` },
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('lists formatted Posts using description and finds them via q on excerpt fields', async () => {
    const { token } = await registerAndToken()
    const unique = `zebra-${randomUUID().slice(0, 8)}`
    const created = await $fetch<{ id: number }>(
      '/api/posts',
      {
        method: 'POST',
        body: {
          title: 'Searchable formatted title',
          mode: 'formatted',
          content: JSON.stringify({ type: 'doc', content: [] }),
          contentHtml: `<p>Body without the needle</p>`,
          description: unique,
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const listed = await $fetch<{
      data: Array<{ id: number, description: string | null, excerpt: string | null }>
    }>('/api/posts', { query: { q: unique } })

    const hit = listed.data.find(p => p.id === created.id)
    expect(hit).toBeTruthy()
    expect(hit?.description).toBe(unique)
    expect(hit?.excerpt).toBe(unique)
  })

  it('finds formatted Posts via q on deep contentHtml beyond the excerpt window', async () => {
    const { token } = await registerAndToken()
    const unique = `deep-body-${randomUUID().slice(0, 8)}`
    const created = await $fetch<{ id: number }>(
      '/api/posts',
      {
        method: 'POST',
        body: {
          title: 'Deep body search title',
          mode: 'formatted',
          content: JSON.stringify({ type: 'doc', content: [] }),
          contentHtml: `<p>${'x'.repeat(250)} ${unique}</p>`,
          description: 'short teaser only',
        },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const listed = await $fetch<{ data: Array<{ id: number }> }>(
      '/api/posts',
      { query: { q: unique } },
    )

    expect(listed.data.some(p => p.id === created.id)).toBe(true)
  })
})
