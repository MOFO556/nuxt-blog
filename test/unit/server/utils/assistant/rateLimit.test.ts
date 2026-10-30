import { describe, expect, it } from 'vitest'
import { createSlidingWindowRateLimiter } from '#server-utils/assistant/rateLimit'

describe('createSlidingWindowRateLimiter', () => {
  it('allows up to maxRequests then blocks until the window slides', () => {
    let now = 1_000
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 2,
      windowMs: 1_000,
      now: () => now,
    })

    expect(limiter.check('ip-a')).toEqual({ ok: true, remaining: 1 })
    expect(limiter.check('ip-a')).toEqual({ ok: true, remaining: 0 })
    expect(limiter.check('ip-a')).toEqual({ ok: false, retryAfterMs: 1_000 })

    now = 2_001
    expect(limiter.check('ip-a')).toEqual({ ok: true, remaining: 1 })
  })

  it('tracks keys independently', () => {
    const limiter = createSlidingWindowRateLimiter({
      maxRequests: 1,
      windowMs: 60_000,
      now: () => 0,
    })

    expect(limiter.check('a').ok).toBe(true)
    expect(limiter.check('b').ok).toBe(true)
    expect(limiter.check('a').ok).toBe(false)
  })
})
