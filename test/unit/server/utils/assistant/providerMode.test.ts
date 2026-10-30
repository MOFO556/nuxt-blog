import { describe, expect, it } from 'vitest'
import {
  isTightRateLimitProvider
} from '~~/server/utils/assistant/providerMode'

describe('isTightRateLimitProvider', () => {
  it('treats localhost as unrestricted', () => {
    expect(isTightRateLimitProvider('http://127.0.0.1:8000/v1')).toBe(false)
    expect(isTightRateLimitProvider('http://localhost:11434/v1')).toBe(false)
  })

  it('treats remote providers as rate-limited by default', () => {
    expect(isTightRateLimitProvider('https://api.groq.com/openai/v1')).toBe(true)
  })

  it('honors ASSISTANT_SPLIT_TURNS override', () => {
    expect(isTightRateLimitProvider('https://api.groq.com/openai/v1', 'false')).toBe(false)
    expect(isTightRateLimitProvider('http://127.0.0.1:8000/v1', 'true')).toBe(true)
  })
})