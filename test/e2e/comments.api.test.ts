import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { createTempDbFile } from '#test-helpers/db'
import { buildRegisterPayload } from '#test-fixtures/user'
import { buildPostPayload } from '#test-fixtures/post'

const dbFile = createTempDbFile()

describe('comments API', async () => {
  await setup({
    browser: false,
    env: {
      NUXT_DB_FILE: dbFile,
      APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
      VITEST: 'true',
      NUXT_TEST: 'true',
    },
  })

  it('creates a Comment on a Post', async () => {
    const payload = buildRegisterPayload({
      login: `c_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })
    const { token } = await $fetch<{ token: string }>(
      '/api/auth/register',
      { method: 'POST', body: payload },
    )

    const post = await $fetch<{ id: number }>(
      '/api/posts',
      {
        method: 'POST',
        body: buildPostPayload({ title: 'Comment host post', content: 'z'.repeat(40) }),
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    const comment = await $fetch<{ id: number, text: string }>(
      `/api/comments/post/${post.id}`,
      {
        method: 'POST',
        body: { text: 'Nice post!' },
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    expect(comment.text).toBe('Nice post!')
    expect(comment.id).toBeTypeOf('number')
  })
})
