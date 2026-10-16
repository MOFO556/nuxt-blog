import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '#server-db/schema'

type StashGlobal = typeof globalThis & { __stashDb?: unknown }

export type TestDb = ReturnType<typeof drizzle<typeof schema>>

export function createTempDbFile(): string {
  const dir = join(tmpdir(), 'nuxt-blog-tests')
  mkdirSync(dir, { recursive: true })
  return join(dir, `test-${randomUUID()}.db`)
}

export function resetDbSingleton(): void {
  const g = globalThis as StashGlobal
  delete g.__stashDb
}

export function openMigratedDb(dbFile: string): TestDb {
  mkdirSync(join(dbFile, '..'), { recursive: true })
  const sqlite = new Database(dbFile)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: './server/database/migrations' })
  return db
}

export function withTempDb(): { dbFile: string, db: TestDb, cleanup: () => void } {
  const dbFile = createTempDbFile()
  resetDbSingleton()
  process.env.NUXT_DB_FILE = dbFile
  const db = openMigratedDb(dbFile)

  const cleanup = () => {
    resetDbSingleton()
    try {
      rmSync(dbFile, { force: true })
      rmSync(`${dbFile}-wal`, { force: true })
      rmSync(`${dbFile}-shm`, { force: true })
    }
    catch {
      // ignore cleanup races on Windows
    }
  }

  return { dbFile, db, cleanup }
}
