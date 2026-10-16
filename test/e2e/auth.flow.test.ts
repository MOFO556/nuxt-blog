import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createPage, setup, url } from '@nuxt/test-utils/e2e'
import { createTempDbFile } from '#test-helpers/db'

const dbFile = createTempDbFile()
const login = `e2e_${randomUUID().slice(0, 8)}`
const password = 'secret12'

describe('auth browser flow', async () => {
  await setup({
    browser: true,
    env: {
      NUXT_DB_FILE: dbFile,
      APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
      VITEST: 'true',
      NUXT_TEST: 'true',
    },
  })

  it('redirects guests from /office to login', async () => {
    const page = await createPage('/office')
    await page.waitForURL(/\/auth\/login/, { timeout: 30_000 })
    expect(page.url()).toMatch(/\/auth\/login/)
    await page.close()
  })

  it('registers a User and reaches office', async () => {
    const page = await createPage('/auth/register')

    await page.locator('input[type="text"]').first().fill(login)
    await page.locator('input[type="password"]').first().fill(password)
    await page.getByRole('button', { name: /sign up/i }).click()

    await page.waitForURL(u => !u.pathname.includes('/auth/'), { timeout: 45_000 })

    await page.goto(url('/office/profile'))
    await page.waitForURL(/\/office/, { timeout: 20_000 })
    expect(page.url()).toMatch(/\/office/)

    await page.close()
  })
})
