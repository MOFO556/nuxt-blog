import { describe, expect, it, vi } from 'vitest'
import {
  normalizeHttpHeaders,
  parsePowerShellHttpPayload,
  readRetryAfterMs,
  resilientFetchTimeoutMs,
  shouldRetryForbiddenViaPowerShell,
  synthesizeStreamedChatResponse,
} from '~~/server/utils/assistant/httpFetch'

describe('normalizeHttpHeaders', () => {
  it('collapses case-duplicate header names for PowerShell ConvertFrom-Json', () => {
    expect(normalizeHttpHeaders(
      { 'User-Agent': 'assistant' },
      { 'user-agent': 'ai-sdk', Authorization: 'Bearer x' },
    )).toEqual({
      'user-agent': 'ai-sdk',
      Authorization: 'Bearer x',
    })
    expect(() => JSON.parse(JSON.stringify(normalizeHttpHeaders(
      { 'User-Agent': 'a' },
      { 'user-agent': 'b' },
    )))).not.toThrow()
  })
})

describe('shouldRetryForbiddenViaPowerShell', () => {
  it('retries HTML and Groq-style JSON Forbidden', () => {
    expect(shouldRetryForbiddenViaPowerShell(403, '<html><head>403 Forbidden</head></html>')).toBe(true)
    expect(shouldRetryForbiddenViaPowerShell(403, '{"error":{"message":"Forbidden"}}')).toBe(true)
    expect(shouldRetryForbiddenViaPowerShell(403, 'Forbidden')).toBe(true)
  })

  it('retries Cloudflare bot-policy JSON that blocks Node TLS fingerprints', () => {
    expect(shouldRetryForbiddenViaPowerShell(
      403,
      '{ "success": false, "error": "Access denied by security policy." }',
    )).toBe(true)
  })

  it('does not retry unrelated statuses or auth errors', () => {
    expect(shouldRetryForbiddenViaPowerShell(200, '{"ok":true}')).toBe(false)
    expect(shouldRetryForbiddenViaPowerShell(401, '{"error":{"message":"Invalid API Key"}}')).toBe(false)
    expect(shouldRetryForbiddenViaPowerShell(403, '{"error":{"message":"model_decommissioned"}}')).toBe(false)
  })
})

describe('readRetryAfterMs', () => {
  it('treats Retry-After as delta-seconds and caps the wait at 60s', () => {
    expect(readRetryAfterMs(new Headers({ 'retry-after': '2' }), '')).toBe(2_000)
    expect(readRetryAfterMs(new Headers({ 'retry-after': '100' }), '')).toBe(60_000)
    expect(readRetryAfterMs(new Headers({ 'retry-after': '120' }), 'try again in 1s')).toBe(60_000)
  })

  it('reads an HTTP-date Retry-After', () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
      expect(readRetryAfterMs(
        new Headers({ 'retry-after': 'Thu, 01 Jan 2026 00:00:30 GMT' }),
        '',
      )).toBe(30_000)
      expect(readRetryAfterMs(
        new Headers({ 'retry-after': 'Wed, 31 Dec 2025 23:00:00 GMT' }),
        'try again in 9s',
      )).toBe(0)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('falls back to the provider body when the header is missing or not a delay', () => {
    expect(readRetryAfterMs(new Headers(), 'Please try again in 3s')).toBe(3_250)
    expect(readRetryAfterMs(new Headers({ 'retry-after': 'soon' }), 'try again in 1s')).toBe(1_250)
  })
})

describe('resilientFetchTimeoutMs', () => {
  it('uses the chat timeout for chat completions, including a query string', () => {
    expect(resilientFetchTimeoutMs('https://openrouter.ai/api/v1/chat/completions')).toBe(180_000)
    expect(resilientFetchTimeoutMs('https://openrouter.ai/api/v1/chat/completions/')).toBe(180_000)
    expect(resilientFetchTimeoutMs(
      'https://example.com/v1/chat/completions?api-version=2024-10-21',
    )).toBe(180_000)
    expect(resilientFetchTimeoutMs('https://api.groq.com/openai/v1/models')).toBe(60_000)
  })
})

describe('synthesizeStreamedChatResponse', () => {
  it('turns a completion into SSE when the request asked to stream', () => {
    const result = synthesizeStreamedChatResponse(true, {
      ok: true,
      status: 200,
      body: JSON.stringify({
        id: 'chatcmpl-1',
        created: 1,
        model: 'm',
        choices: [{
          message: { role: 'assistant', content: 'hello' },
          finish_reason: 'stop',
        }],
      }),
    })
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body.startsWith('data: ')).toBe(true)
    expect(result.body).toContain('"content":"hello"')
  })

  it('fails the fallback when a 200 body is not a chat completion', () => {
    expect(synthesizeStreamedChatResponse(true, {
      ok: true,
      status: 200,
      body: '{"error":{"message":"upstream"}}',
    })).toEqual({
      ok: false,
      status: 502,
      body: '{"error":{"message":"upstream"}}',
    })
  })

  it('leaves non-stream responses unchanged', () => {
    const result = { ok: true, status: 200, body: '{"error":true}' }
    expect(synthesizeStreamedChatResponse(false, result)).toEqual(result)
  })
})

describe('parsePowerShellHttpPayload', () => {
  it('keeps Retry-After from the PowerShell payload', () => {
    const parsed = parsePowerShellHttpPayload({
      status: 429,
      body: 'slow down',
      retryAfter: '100',
    })
    expect(parsed.ok).toBe(false)
    expect(parsed.status).toBe(429)
    expect(readRetryAfterMs(parsed.headers, parsed.body)).toBe(60_000)
  })

  it('accepts a payload without Retry-After', () => {
    const parsed = parsePowerShellHttpPayload({ status: 200, body: '{"ok":true}' })
    expect(parsed.ok).toBe(true)
    expect(parsed.headers.get('retry-after')).toBeNull()
  })

  it('rejects a payload without status and body', () => {
    expect(() => parsePowerShellHttpPayload({ status: 200 })).toThrow(/unexpected payload/)
  })
})