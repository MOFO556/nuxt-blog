import { describe, expect, it } from 'vitest'
import { mirrorAllEnvToNuxt } from '#server-utils/mirror-runtime-env.mjs'

describe('mirrorAllEnvToNuxt', () => {
  it('mirrors any unset name onto NUXT_* so new runtimeConfig keys need no list', () => {
    const env: Record<string, string | undefined> = {
      AI_BASE_URL: 'https://api.groq.com/openai/v1',
      EMBEDDING_DIMENSIONS: '384',
      SOME_FUTURE_SETTING: 'yes',
    }

    mirrorAllEnvToNuxt(env)

    expect(env.NUXT_AI_BASE_URL).toBe('https://api.groq.com/openai/v1')
    expect(env.NUXT_EMBEDDING_DIMENSIONS).toBe('384')
    expect(env.NUXT_SOME_FUTURE_SETTING).toBe('yes')
  })

  it('does not overwrite an existing NUXT_* value', () => {
    const env: Record<string, string | undefined> = {
      AI_BASE_URL: 'https://from-alias.example/v1',
      NUXT_AI_BASE_URL: 'https://from-nuxt.example/v1',
    }

    mirrorAllEnvToNuxt(env)

    expect(env.NUXT_AI_BASE_URL).toBe('https://from-nuxt.example/v1')
  })

  it('skips empty values and keys that are already NUXT_ or NITRO_', () => {
    const env: Record<string, string | undefined> = {
      AI_API_KEY: '',
      NUXT_AI_MODEL: 'already',
      NITRO_PRESET: 'node-server',
    }

    mirrorAllEnvToNuxt(env)

    expect(env.NUXT_AI_API_KEY).toBeUndefined()
    expect(env.NUXT_NUXT_AI_MODEL).toBeUndefined()
    expect(env.NUXT_NITRO_PRESET).toBeUndefined()
  })

  it('does not copy AI_* into EMBEDDING_*', () => {
    const env: Record<string, string | undefined> = {
      AI_BASE_URL: 'https://chat.example/v1',
      AI_API_KEY: 'chat-key',
    }

    mirrorAllEnvToNuxt(env)

    expect(env.NUXT_EMBEDDING_BASE_URL).toBeUndefined()
    expect(env.NUXT_EMBEDDING_API_KEY).toBeUndefined()
  })
})