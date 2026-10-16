import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

process.env.VITEST ??= 'true'
process.env.NUXT_TEST ??= 'true'

const root = fileURLToPath(new URL('.', import.meta.url))
const app = fileURLToPath(new URL('./app', import.meta.url))
const server = fileURLToPath(new URL('./server', import.meta.url))

const testAliases = {
  '~': app,
  '@': app,
  '~~': root,
  '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
  '#components': fileURLToPath(new URL('./app/components', import.meta.url)),
  '#app-utils': fileURLToPath(new URL('./app/utils', import.meta.url)),
  '#app-types': fileURLToPath(new URL('./app/types', import.meta.url)),
  '#server-utils': fileURLToPath(new URL('./server/utils', import.meta.url)),
  '#server-db': fileURLToPath(new URL('./server/database', import.meta.url)),
  '#server-composable': fileURLToPath(new URL('./server/composable', import.meta.url)),
  '#server-config': fileURLToPath(new URL('./server/config', import.meta.url)),
  '#test-helpers': fileURLToPath(new URL('./test/helpers', import.meta.url)),
  '#test-fixtures': fileURLToPath(new URL('./test/fixtures', import.meta.url)),
  '#server': server,
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: testAliases },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      {
        resolve: { alias: testAliases },
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.{test,spec}.ts'],
          environment: 'node',
          testTimeout: 120_000,
          hookTimeout: 240_000,
          fileParallelism: false,
          env: {
            VITEST: 'true',
            NUXT_TEST: 'true',
            APP_JWT_SECRET: 'test-jwt-secret-for-vitest-only',
          },
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          setupFiles: ['./test/nuxt/setup.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              domEnvironment: 'happy-dom',
            },
          },
        },
      }),
    ],
  },
})
