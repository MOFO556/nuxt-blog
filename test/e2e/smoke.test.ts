import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'

describe('e2e smoke', async () => {
  await setup({
    browser: false,
    env: {
      NUXT_DB_FILE: './.data/db/test-e2e.db',
      APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
      VITEST: 'true',
      NUXT_TEST: 'true',
    },
  })

  it('serves the home page', async () => {
    const html = await $fetch<string>('/')
    expect(html).toContain('html')
  })
})
