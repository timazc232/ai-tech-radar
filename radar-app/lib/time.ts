/**
 * Beijing-time data window utilities (§5.2, A1).
 * Data window = previous calendar day in Asia/Shanghai, expressed as UTC [start, end).
 * Uses Intl to avoid a timezone DB dependency; Asia/Shanghai has no DST, so offset is fixed +08:00.
 */

const TZ = 'Asia/Shanghai';
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // +08:00, no DST in China

export interface DataWindow {
  /** inclusive UTC ISO start (yesterday 00:00 Beijing) */
  start: string;
  /** exclusive UTC ISO end (today 00:00 Beijing) */
  end: string;
  /** Beijing calendar date YYYY-MM-DD of the window */
  date: string;
}

/** Format a Date as YYYY-MM-DD in Beijing time. */
export function toBeijingDate(utcInput: Date | string): string {
  const d = typeof utcInput === 'string' ? new Date(utcInput) : utcInput;
  // shift to Beijing wall-clock, then format
  const beijing = new Date(d.getTime() + TZ_OFFSET_MS);
  return beijing.toISOString().slice(0, 10);
}

/** Return the data window for the previous Beijing calendar day. */
export function dataWindow(now: Date = new Date()): DataWindow {
  // Current Beijing wall-clock
  const beijingNow = new Date(now.getTime() + TZ_OFFSET_MS);
  // Beijing today 00:00 (as a UTC timestamp of that wall-clock instant)
  const beijingTodayMidnight = new Date(
    Date.UTC(beijingNow.getUTCFullYear(), beijingNow.getUTCMonth(), beijingNow.getUTCDate()),
  );
  const beijingYesterdayMidnight = new Date(beijingTodayMidnight.getTime() - 24 * 60 * 60 * 1000);
  // Convert Beijing wall-clock midnights back to real UTC instants
  const startUtc = new Date(beijingYesterdayMidnight.getTime() - TZ_OFFSET_MS);
  const endUtc = new Date(beijingTodayMidnight.getTime() - TZ_OFFSET_MS);
  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
    date: beijingYesterdayMidnight.toISOString().slice(0, 10),
  };
}

/** Window for an explicit Beijing calendar date (for backfill). */
export function windowForDate(beijingDate: string): DataWindow {
  const [y, m, d] = beijingDate.split('-').map(Number);
  const dayMidnight = new Date(Date.UTC(y, m - 1, d));
  const startUtc = new Date(dayMidnight.getTime() - TZ_OFFSET_MS);
  const endUtc = new Date(dayMidnight.getTime() + 24 * 60 * 60 * 1000 - TZ_OFFSET_MS);
  return { start: startUtc.toISOString(), end: endUtc.toISOString(), date: beijingDate };
}

/** Is an ISO timestamp within [start, end)? */
export function isInWindow(utcIso: string, window: { start: string; end: string }): boolean {
  return utcIso >= window.start && utcIso < window.end;
}

/** Convert a Beijing calendar date to a human label. */
export function windowLabel(date: string, now: Date = new Date()): string {
  const yesterday = dataWindow(now).date;
  if (date === yesterday) return `${date}（北京时间昨日）`;
  return `${date}（北京时间）`;
}

/**
 * Cold-start / lookback window: last `days` Beijing calendar days ending at yesterday 24:00.
 * Brief date remains yesterday so Today still has a single bucket.
 */
export function lookbackWindow(days: number, now: Date = new Date()): DataWindow {
  const yesterday = dataWindow(now);
  if (!Number.isFinite(days) || days <= 1) return yesterday;
  const span = Math.min(30, Math.floor(days));
  const startMs = new Date(yesterday.start).getTime() - (span - 1) * 24 * 60 * 60 * 1000;
  return {
    start: new Date(startMs).toISOString(),
    end: yesterday.end,
    date: yesterday.date,
  };
}

/** Add/subtract whole Beijing calendar days from a YYYY-MM-DD. */
export function shiftBeijingDate(date: string, deltaDays: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return utc.toISOString().slice(0, 10);
}

/** Current freshness state per §2.4. */
export type Freshness = 'fresh' | 'stale' | 'pending';
