import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as sqliteVec from 'sqlite-vec';
import * as schema from '../database/schema';

type SqliteDb = InstanceType<typeof Database>;
type Db = ReturnType<typeof create>;

function loadSqliteVec(sqlite: SqliteDb) {
  try {
    sqliteVec.load(sqlite);
  }
  catch (err) {
    console.warn('[db] sqlite-vec unavailable; semantic search disabled', err);
  }
}

function readConfiguredDimensions(): number {
  const config = useRuntimeConfig();
  const raw = Number(config.embeddingDimensions);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 768;
}

function vecTableSql(dimensions: number): string {
  return `
    CREATE VIRTUAL TABLE IF NOT EXISTS post_chunk_vec USING vec0(
      chunk_id INTEGER PRIMARY KEY,
      embedding float[${dimensions}]
    );
  `;
}

function existingVecTableSql(sqlite: SqliteDb): string | null {
  try {
    const row = sqlite.prepare(
      `SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'post_chunk_vec'`,
    ).get() as { sql?: string } | undefined;
    return row?.sql ?? null;
  }
  catch {
    return null;
  }
}

export function ensureVecTables(sqlite: SqliteDb, dimensions: number) {
  const dim = Number.isFinite(dimensions) && dimensions > 0 ? Math.floor(dimensions) : 768;
  const existing = existingVecTableSql(sqlite);
  if (existing && !existing.includes(`float[${dim}]`)) {
    console.warn(
      `[db] post_chunk_vec dimension mismatch (have ${existing.match(/float\[(\d+)\]/)?.[1] ?? '?'}, need ${dim}); recreating table`,
    );
    try {
      sqlite.exec('DROP TABLE IF EXISTS post_chunk_vec');
    }
    catch (err) {
      console.warn('[db] could not drop post_chunk_vec', err);
    }
  }

  try {
    sqlite.exec(vecTableSql(dim));
  }
  catch (err) {
    console.warn('[db] could not create post_chunk_vec', err);
  }
}

export function recreatePostChunkVec(dimensions: number) {
  const sqlite = useSqlite();
  ensureVecTables(sqlite, dimensions);
}

function create() {
  const file = useRuntimeConfig().dbFile;
  mkdirSync(dirname(file), { recursive: true });

  const sqlite = new Database(file);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');

  loadSqliteVec(sqlite);
  ensureVecTables(sqlite, readConfiguredDimensions());

  const db = drizzle(sqlite, { schema });
  return Object.assign(db, { $client: sqlite });
}

const g = globalThis as typeof globalThis & { __stashDb?: Db };

export function useDb(): Db {
  return (g.__stashDb ??= create());
}

export function useSqlite(): SqliteDb {
  return useDb().$client;
}