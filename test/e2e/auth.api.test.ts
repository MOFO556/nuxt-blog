import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { createTempDbFile } from '#test-helpers/db'
import { buildLoginPayload, buildRegisterPayload } from '#test-fixtures/user'

const dbFile = createTempDbFile()

describe('auth API', async () => {
  await setup({
    browser: false,
    env: {
      NUXT_DB_FILE: dbFile,
      APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
      VITEST: 'true',
      NUXT_TEST: 'true',
    },
  })

  it('registers a User with password and returns a Session token', async () => {
    const payload = buildRegisterPayload({
      login: `user_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })

    const res = await $fetch<{ user: { id: number, login: string }, token: string }>(
      '/api/auth/register',
      { method: 'POST', body: payload },
    )

    expect(res.user.login).toBe(payload.login)
    expect(res.user.id).toBeTypeOf('number')
    expect(res.token.length).toBeGreaterThan(10)
  })

  it('rejects invalid register payloads with 422 field tuples', async () => {
    try {
      await $fetch('/api/auth/register', {
        method: 'POST',
        body: { login: 'ab', password: '1', usePasskey: false },
      })
      expect.unreachable('should throw')
    }
    catch (err: unknown) {
      const error = err as {
        statusCode?: number
        data?: { data?: [string, string][], statusCode?: number } | [string, string][]
      }
      const status = error.statusCode ?? (error.data as { statusCode?: number })?.statusCode
      const payload = Array.isArray(error.data) ? error.data : error.data?.data
      expect(status).toBe(422)
      expect(Array.isArray(payload)).toBe(true)
      expect(payload!.length).toBeGreaterThan(0)
    }
  })

  it('logs in an existing User and lists Sessions', async () => {
    const payload = buildRegisterPayload({
      login: `login_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })

    await $fetch('/api/auth/register', { method: 'POST', body: payload })

    const login = await $fetch<{ user: { login: string }, token: string }>(
      '/api/auth/login',
      { method: 'POST', body: buildLoginPayload(payload) },
    )

    expect(login.user.login).toBe(payload.login)
    expect(login.token).toBeTruthy()

    const sessions = await $fetch<Array<{ id: string, current: boolean }>>(
      '/api/auth/sessions/',
      { headers: { Authorization: `Bearer ${login.token}` } },
    )

    expect(sessions.length).toBeGreaterThanOrEqual(1)
    expect(sessions.some(s => s.current)).toBe(true)
  })

  it('revokes a Session and rejects the old token', async () => {
    const payload = buildRegisterPayload({
      login: `rev_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })

    const registered = await $fetch<{ token: string }>(
      '/api/auth/register',
      { method: 'POST', body: payload },
    )

    await $fetch('/api/auth/sessions/current', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${registered.token}` },
    })

    try {
      await $fetch('/api/auth/sessions/', {
        headers: { Authorization: `Bearer ${registered.token}` },
      })
      expect.unreachable('revoked token should fail')
    }
    catch (err: unknown) {
      const error = err as { statusCode: number }
      expect(error.statusCode).toBe(401)
    }
  })

  it('rejects wrong credentials on login', async () => {
    const payload = buildRegisterPayload({
      login: `bad_${randomUUID().slice(0, 8)}`,
      password: 'secret12',
    })
    await $fetch('/api/auth/register', { method: 'POST', body: payload })

    try {
      await $fetch('/api/auth/login', {
        method: 'POST',
        body: { login: payload.login, password: 'wrong!!' },
      })
      expect.unreachable('should throw')
    }
    catch (err: unknown) {
      const error = err as {
        statusCode?: number
        data?: { data?: [string, string][], statusCode?: number } | [string, string][]
      }
      const status = error.statusCode ?? (error.data as { statusCode?: number })?.statusCode
      const payloadTuples = Array.isArray(error.data) ? error.data : error.data?.data
      expect(status).toBe(422)
      expect(payloadTuples?.some(([field]) => field === 'password')).toBe(true)
    }
  })
})
