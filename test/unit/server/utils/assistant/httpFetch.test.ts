import { describe, expect, it } from 'vitest'
import {
  normalizeHttpHeaders,
  shouldRetryForbiddenViaPowerShell,
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

  it('does not retry unrelated statuses or auth errors', () => {
    expect(shouldRetryForbiddenViaPowerShell(200, '{"ok":true}')).toBe(false)
    expect(shouldRetryForbiddenViaPowerShell(401, '{"error":{"message":"Invalid API Key"}}')).toBe(false)
    expect(shouldRetryForbiddenViaPowerShell(403, '{"error":{"message":"model_decommissioned"}}')).toBe(false)
  })
})