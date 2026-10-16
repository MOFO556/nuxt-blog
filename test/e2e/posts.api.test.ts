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
})
