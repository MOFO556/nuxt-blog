import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nuxtRoot = dirname(require.resolve('nuxt/package.json'))
const entry = join(nuxtRoot, 'dist/app/entry.js')
const stub = join(nuxtRoot, 'dist/app/nuxt-vitest-app-entry.js')

if (!existsSync(entry)) {
  console.warn(`[prepare-vitest-entry] missing ${entry}`)
  process.exit(0)
}

copyFileSync(entry, stub)
console.log(`[prepare-vitest-entry] wrote ${stub}`)
