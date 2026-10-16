import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from '#app-utils/throttle'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes immediately then ignores calls until the limit elapses', () => {
    const fn = vi.fn()
    const throttled = throttle(fn, 100)

    throttled(1)
    throttled(2)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith(1)

    vi.advanceTimersByTime(100)
    throttled(3)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenLastCalledWith(3)
  })
})
