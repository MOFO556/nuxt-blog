import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from '../database/schema';

type Db = ReturnType<typeof create>;

function create() {
  const file = useRuntimeConfig().dbFile;
  mkdirSync(dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');

  return drizzle(sqlite, { schema });
}

const g = globalThis as typeof globalThis & { __stashDb?: Db };

export function useDb(): Db {
  return (g.__stashDb ??= create());
}