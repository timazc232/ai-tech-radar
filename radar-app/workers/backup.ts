import { rawDb } from '@/db/client';
import { readFileSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { log } from '@/lib/logger';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RETENTION = 7;

/** §8.4: SQLite online backup (hot, non-blocking) + retention rotation. */
export async function runBackup(): Promise<{ dest: string }> {
  const dbPath = process.env.DATABASE_PATH ?? './data/radar.db';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dest = `${dbPath}.${stamp}.bak`;

  // better-sqlite3 backup API (online, to another file)
  const database = rawDb();
  await database.backup(dest);
  log.info({ dest }, 'backup done');

  // rotate: keep most recent RETENTION
  const dir = dirname(dest);
  const base = dbPath.split(/[\\/]/).pop() ?? 'radar.db';
  const backups = readdirSync(dir)
    .filter((f) => f.startsWith(`${base}.`) && f.endsWith('.bak'))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  for (const b of backups.slice(RETENTION)) {
    unlinkSync(join(dir, b.f));
    log.info({ file: b.f }, 'rotated old backup');
  }
  return { dest };
}
