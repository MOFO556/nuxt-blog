import { describe, expect, it } from 'vitest'
import { formatUserAgent, parseUserAgent } from '#server-utils/uaparser'

describe('parseUserAgent', () => {
  it('returns unknowns for empty ua', () => {
    const parsed = parseUserAgent('')
    expect(parsed.browser.name).toBe('Unknown')
    expect(parsed.device.type).toBe('unknown')
  })

  it('parses Chrome on Windows desktop', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    const parsed = parseUserAgent(ua)
    expect(parsed.browser.name).toBe('Chrome')
    expect(parsed.browser.version.startsWith('120')).toBe(true)
    expect(parsed.os.name).toBe('Windows 10/11')
    expect(parsed.device.type).toBe('desktop')
    expect(parsed.engine.name).toBe('Blink')
  })

  it('parses iPhone Safari as mobile', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const parsed = parseUserAgent(ua)
    expect(parsed.browser.name).toBe('Safari')
    expect(parsed.os.name).toBe('iOS')
    expect(parsed.device.type).toBe('mobile')
    expect(parsed.device.vendor).toBe('Apple')
    expect(parsed.device.model).toBe('iPhone')
  })
})

describe('formatUserAgent', () => {
  it('builds a short display string', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    expect(formatUserAgent(ua)).toBe('Chrome 120 on Windows 10/11 (desktop)')
  })
})
