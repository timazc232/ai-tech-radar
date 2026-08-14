import { db, rawDb, closeDb } from '@/db/client';
import { source, jobRun } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getCollector } from '@/connectors/registry';
import { normalize } from '@/modules/pipeline/normalize';
import { dedupAndPersist, persistRawItems } from '@/modules/pipeline/dedup';
import { persistEvent, scoreEventsV1, buildScoreContext } from '@/modules/pipeline/score';
import { buildAndPersistBrief } from '@/modules/pipeline/brief';
import { llmEnhance } from '@/modules/llm/enhance';
import { translateEvents } from '@/modules/llm/translate';
import { organizeEvents } from '@/modules/briefing/service';
import { dataWindow, lookbackWindow, windowForDate, type DataWindow } from '@/lib/time';
import { randomId } from '@/lib/hash';
import { log, redact } from '@/lib/logger';
import type { RawItem, EventCandidate, Source } from '@/modules/domain/schema';

const LEASE_DURATION_MIN = 30;

/** Acquire a lease lock; returns true if acquired. */
export function acquireLease(jobType: string, date: string): { id: string; acquired: boolean } {
  const id = randomId('job');
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LEASE_DURATION_MIN * 60 * 1000).toISOString();
  // Check for an existing unexpired lease
  const existing = db()
    .select()
    .from(jobRun)
    .where(and(eq(jobRun.jobType, jobType), eq(jobRun.date, date), eq(jobRun.status, 'running')))
    .all();
  for (const e of existing) {
    if (new Date(e.leaseUntil) > now) {
      return { id, acquired: false };
    }
  }
  db().insert(jobRun).values({
    id,
    jobType,
    date,
    leaseUntil,
    status: 'running',
    startedAt: now.toISOString(),
    finishedAt: null,
    metrics: null,
    error: null,
  }).run();
  return { id, acquired: true };
}

export function releaseLease(id: string, status: 'success' | 'failed', metrics?: Record<string, unknown>, error?: string): void {
  db().update(jobRun).set({
    status,
    finishedAt: new Date().toISOString(),
    metrics: metrics ?? null,
    error: error ?? null,
  }).where(eq(jobRun.id, id)).run();
}

export interface DailyRunOptions {
  date?: string;        // Beijing date; defaults to yesterday's window
  backfill?: boolean;
  lookbackDays?: number; // cold start: collect last N Beijing days into yesterday's brief
}

/** Run the full daily pipeline (§8.2). */
export async function runDaily(opts: DailyRunOptions = {}): Promise<{ jobId: string; metrics: Record<string, unknown> }> {
  const lookback = opts.lookbackDays && opts.lookbackDays > 1
    ? opts.lookbackDays
    : (!opts.date ? 7 : 0);
  const window: DataWindow = lookback
    ? lookbackWindow(lookback)
    : windowForDate(opts.date!);
  const date = window.date;
  const asBackfill = Boolean(opts.backfill || lookback);

  const lease = acquireLease('daily', date);
  if (!lease.acquired) {
    log.warn({ date }, 'daily job lease held by another instance');
    throw new JobLeaseHeld(date);
  }

  try {
    // 1. Collect — retry previously-errored sources too (transient failures recover);
    //    only 'paused' sources are skipped.
    const sources = db().select().from(source).where(inArray(source.status, ['active', 'error'])).all();
    let allRaws: RawItem[] = [];
    let sourceAnomalies = 0;
    for (const s of sources) {
      const srcObj: Source = {
        id: s.id,
        type: s.type as Source['type'],
        url: s.url,
        config: s.config as Source['config'],
        status: s.status as Source['status'],
        entityId: s.entityId,
        topicId: s.topicId,
      };
      try {
        const collector = getCollector(srcObj);
        const result = await collector.fetch(srcObj, window);
        allRaws = allRaws.concat(result.items);
        // update cursor/etag; a successful fetch restores the source to active
        db().update(source).set({
          status: 'active',
          config: { ...srcObj.config, cursor: result.newCursor, etag: result.newEtag },
          lastFetchedAt: new Date().toISOString(),
          lastError: null,
        }).where(eq(source.id, s.id)).run();
      } catch (err) {
        sourceAnomalies++;
        db().update(source).set({ status: 'error', lastError: (err as Error).message }).where(eq(source.id, s.id)).run();
        log.error(redact({ source: s.id, err: (err as Error).message }), 'collector failed');
      }
    }
    persistRawItems(allRaws);

    // 2. Normalize
    const candidates: EventCandidate[] = allRaws.map((r) => {
      const s = sources.find((x) => x.id === r.sourceId)!;
      return normalize(r, { type: s.type, url: s.url, entityId: s.entityId });
    });

    // 3. Dedup / Novelty
    const { unique, duplicates } = await dedupAndPersist(allRaws, candidates);

    // 4. Persist events (dedup by id: normalization collisions can map two raws to one event)
    const persistedAll = unique.map((c) => persistEvent(c, typeForCandidate(c), asBackfill));
    const persisted = [...new Map(persistedAll.map((p) => [p.id, p])).values()];

    // 5. Score v1 (rules)
    const ctx = buildScoreContext();
    const scored = scoreEventsV1(persisted, ctx);

    // 5.5 LLM v2 enhancement (graceful: keeps rules scores when no key / on failure)
    const scoredFinal = await llmEnhance(scored);

    // 6. Select + brief
    const { mustRead, worthWatching, filtered } = buildAndPersistBrief(date, scoredFinal, {
      scanned: allRaws.length,
      candidates: candidates.length,
      sourceAnomalies,
    });

    // 7. 结构化整理 + 汉化入选事件（失败不阻断 pipeline）
    const selectedIds = [...mustRead, ...worthWatching].map((s) => s.eventId);
    const briefing = await organizeEvents(selectedIds);
    const i18n = await translateEvents(selectedIds);

    const metrics = {
      scanned: allRaws.length,
      candidates: candidates.length,
      duplicates,
      persisted: persisted.length,
      scored: scored.length,
      mustRead: mustRead.length,
      worthWatching: worthWatching.length,
      filtered: filtered.length,
      sourceAnomalies,
      translated: i18n.translated,
      organized: briefing.organized + briefing.heuristic,
    };
    log.info({ date, metrics }, 'daily pipeline complete');
    releaseLease(lease.id, 'success', metrics);
    return { jobId: lease.id, metrics };
  } catch (err) {
    log.error(redact({ date, err: (err as Error).message }), 'daily pipeline failed');
    releaseLease(lease.id, 'failed', undefined, (err as Error).message);
    throw err;
  }
}

function typeForCandidate(c: EventCandidate): string {
  // infer event type from candidate signals (simplified)
  const t = c.title ?? '';
  const url = c.canonicalUrl ?? '';
  if (/release|v\d+\./i.test(t) || /\/releases\b/i.test(url)) return 'release';
  if (/breaking|deprecat|remov|sunset/i.test(t)) return 'breaking_change';
  if (/pricing|price|\bcost\b|tier/i.test(t)) return 'pricing_change';
  if (/arxiv|paper|research|benchmark/i.test(t) || /arxiv\.org/i.test(url)) return 'research';
  if (/security|cve|vulnerab|advisory/i.test(t)) return 'security_advisory';
  if (/blog|announcement|launch|introduc|announc/i.test(t)) return 'announcement';
  return 'docs_change';
}

export class JobLeaseHeld extends Error {
  constructor(public date: string) {
    super(`job lease held for ${date}`);
    this.name = 'JobLeaseHeld';
  }
}
