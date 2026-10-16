import { beforeAll, describe, expect, it } from 'vitest'
import jwt from 'jsonwebtoken'

beforeAll(() => {
  process.env.APP_JWT_SECRET ??= 'test-jwt-secret-for-vitest-only'
})

describe('signToken', () => {
  it('signs a JWT with user id and session id', async () => {
    const { signToken } = await import('#server-utils/auth')
    const { AUTH_JWT_SECRET } = await import('#server-config/auth')

    const token = signToken(42, 'session-abc')
    const payload = jwt.verify(token, AUTH_JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: number
      sid: string
    }

    expect(payload.id).toBe(42)
    expect(payload.sid).toBe('session-abc')
  })
})
