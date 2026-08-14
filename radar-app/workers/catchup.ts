import { db } from '@/db/client';
import { jobRun } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { dataWindow, windowForDate } from '@/lib/time';
import { runDaily } from './pipeline';
import { log } from '@/lib/logger';
import { STALE_THRESHOLD_HOURS, MAX_BACKFILL_RETRY } from '@/modules/domain/enums';

/** §3.4: detect stale last successful daily job (>26h) and compute missing windows. */
export function detectMissingWindows(): string[] {
  const last = db()
    .select()
    .from(jobRun)
    .where(and(eq(jobRun.jobType, 'daily'), eq(jobRun.status, 'success')))
    .orderBy(desc(jobRun.finishedAt))
    .all();

  if (last.length === 0) return []; // first run, nothing to backfill

  const lastSuccess = last[0];
  if (!lastSuccess.finishedAt) return [];
  const hoursSince = (Date.now() - new Date(lastSuccess.finishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince <= STALE_THRESHOLD_HOURS) return [];

  const missing: string[] = [];
  const lastDate = lastSuccess.date ?? dataWindow(new Date(new Date().getTime() - 24 * 60 * 60 * 1000)).date;
  // walk Beijing calendar dates from lastDate+1 up to (exclusive) yesterday.
  // Store Beijing wall-clock midnight as a UTC instant so toISOString().slice
  // yields Beijing dates directly (avoids +08:00 offset drift).
  const [ly, lm, ld] = lastDate.split('-').map(Number);
  const cursor = new Date(Date.UTC(ly, lm - 1, ld + 1));
  const yesterday = dataWindow().date;
  while (true) {
    const d = cursor.toISOString().slice(0, 10);
    if (d >= yesterday) break;
    missing.push(d);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  log.info({ missing: missing.length, lastDate }, 'backfill windows detected');
  return missing;
}

/** §3.4: run backfill for each missing window, up to MAX_BACKFILL_RETRY each. */
export async function runBackfill(): Promise<{ windows: string[]; succeeded: number; failed: string[] }> {
  const windows = detectMissingWindows();
  if (windows.length === 0) {
    log.info('no backfill needed');
    return { windows: [], succeeded: 0, failed: [] };
  }

  let succeeded = 0;
  const failed: string[] = [];
  for (const date of windows) {
    let ok = false;
    for (let attempt = 1; attempt <= MAX_BACKFILL_RETRY; attempt++) {
      try {
        await runDaily({ date, backfill: true });
        ok = true;
        break;
      } catch (err) {
        log.error({ date, attempt, err: (err as Error).message }, 'backfill attempt failed');
      }
    }
    if (ok) succeeded++;
    else failed.push(date);
  }
  log.info({ windows: windows.length, succeeded, failed }, 'backfill complete');
  return { windows, succeeded, failed };
}
