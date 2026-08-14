/**
 * Apply migrations: executes 0001_init.sql + ensures FTS5.
 * Usage: tsx scripts/migrate.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rawDb } from '../db/client';
import { ensureFts } from '../db/fts';
import { log } from '../lib/logger';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', 'db', 'migrations');

function main() {
  const db = rawDb();
  // migrations tracking table
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const applied = db.prepare('SELECT 1 FROM _migrations WHERE id = ?').get(file);
    if (applied) {
      log.info({ file }, 'migration already applied, skip');
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (id, applied_at) VALUES (?, ?)').run(
      file,
      new Date().toISOString(),
    );
    log.info({ file }, 'migration applied');
  }

  // FTS5 virtual table + triggers (idempotent)
  ensureFts();

  log.info('migrations complete');
  process.exit(0);
}

main();
