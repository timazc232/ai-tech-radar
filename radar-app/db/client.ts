import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';
import { cfg } from '@/lib/env';
import { log } from '@/lib/logger';

export type DrizzleDB = BetterSQLite3Database<typeof schema>;
export type RawDB = Database.Database;

let _db: DrizzleDB | null = null;
let _raw: RawDB | null = null;

/** Get the raw better-sqlite3 instance (for FTS5 / backup / pragmas). */
export function rawDb(): RawDB {
  if (_raw) return _raw;
  const path = cfg.databasePath;
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  _raw = new Database(path);
  _raw.pragma('journal_mode = WAL');
  _raw.pragma('foreign_keys = ON');
  _raw.pragma('busy_timeout = 5000');
  log.info({ path }, 'sqlite opened (WAL, busy_timeout=5000)');
  return _raw;
}

/** Get the Drizzle-wrapped instance. */
export function db(): DrizzleDB {
  if (_db) return _db;
  _db = drizzle(rawDb(), { schema });
  return _db;
}

/** Run a transaction (sync API of better-sqlite3). */
export function tx<T>(fn: (tx: DrizzleDB) => T): T {
  return db().transaction(fn);
}

/** Close the connection (mainly for tests / CLI exit). */
export function closeDb(): void {
  if (_raw) {
    _raw.close();
    _raw = null;
    _db = null;
    log.info('sqlite closed');
  }
}
