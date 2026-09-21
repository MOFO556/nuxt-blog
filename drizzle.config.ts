import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema/index.ts',
  out: './server/database/migrations/',
  dbCredentials: { url: process.env.NUXT_DB_FILE || './.data/db/stash.db' },
})