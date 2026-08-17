import { db } from '@/db/client';
import { dailyBrief, scoreSnapshot, event, entity, intelligenceCard, eventEvidence } from '@/db/schema';
import { eq, desc, and, gte, lt } from 'drizzle-orm';
import { selectDaily, type ScoredEvent } from '@/modules/scoring/select';
import { dataWindow, windowForDate } from '@/lib/time';
import { log } from '@/lib/logger';
import { getEventZh, translateEvents } from '@/modules/llm/translate';
import { getEventBriefing, organizeEvents } from '@/modules/briefing/service';
import type { EventBriefing } from '@/modules/briefing/types';

/** Load scored events within a window, build ScoredEvent list. */
export function loadScoredForWindow(window: { start: string; end: string }): ScoredEvent[] {
  const rows = db()
    .select({
      eventId: scoreSnapshot.eventId,
      total: scoreSnapshot.total,
      dimensions: scoreSnapshot.dimensions,
      generatedAt: scoreSnapshot.generatedAt,
    })
    .from(scoreSnapshot)
    .where(
      and(
        gte(scoreSnapshot.generatedAt, window.start),
        lt(scoreSnapshot.generatedAt, window.end),
      ),
    )
    .orderBy(desc(scoreSnapshot.total))
    .all();

  const scored: ScoredEvent[] = [];
  for (const r of rows) {
    const ev = db().select().from(event).where(eq(event.id, r.eventId)).get();
    if (!ev) continue;
    scored.push({
      eventId: r.eventId,
      entityId: ev.entityId,
      title: ev.title,
      type: ev.type,
      topicId: null,
      dimensions: r.dimensions as ScoredEvent['dimensions'],
      total: r.total,
      occurredAt: ev.occurredAt,
    });
  }
  return scored;
}

/** §7.7 build and persist the daily brief. */
export function buildAndPersistBrief(
  date: string,
  scored: ScoredEvent[],
  metrics: { scanned: number; candidates: number; sourceAnomalies: number },
): { mustRead: ScoredEvent[]; worthWatching: ScoredEvent[]; filtered: ScoredEvent[] } {
  const { mustRead, worthWatching, filtered } = selectDaily(scored);
  const selectedIds = [...mustRead, ...worthWatching].map((s) => s.eventId);

  const briefMetrics = {
    scanned: metrics.scanned,
    candidates: scored.length,
    recommended: selectedIds.length,
    filtered: filtered.length,
    sourceAnomalies: metrics.sourceAnomalies,
  };

  db().insert(dailyBrief).values({
    date,
    selectedEventIds: selectedIds,
    metrics: briefMetrics,
    status: 'fresh',
    generatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: dailyBrief.date,
    set: {
      selectedEventIds: selectedIds,
      metrics: briefMetrics,
      status: 'fresh',
      generatedAt: new Date().toISOString(),
    },
  }).run();

  log.info({ date, must: mustRead.length, worth: worthWatching.length, filtered: filtered.length }, 'daily brief persisted');
  return { mustRead, worthWatching, filtered };
}

export type BriefFreshness = 'fresh' | 'stale' | 'pending';

/** Get a brief by Beijing calendar date (default: yesterday window). */
export function getBriefForDate(date?: string) {
  const window = date ? windowForDate(date) : dataWindow();
  const brief = db().select().from(dailyBrief).where(eq(dailyBrief.date, window.date)).get();
  if (!brief) return { brief: null, window, freshness: 'pending' as const };

  let freshness: BriefFreshness = 'pending';
  if (brief.status === 'fresh') freshness = 'fresh';
  else if (brief.status === 'stale') freshness = 'stale';

  return { brief, window, freshness };
}

/** Get today's brief for the API (§2.4 freshness). */
export function getTodayBrief() {
  return getBriefForDate();
}

export function listBriefDates(limit = 30): string[] {
  return db()
    .select({ date: dailyBrief.date })
    .from(dailyBrief)
    .orderBy(desc(dailyBrief.date))
    .limit(limit)
    .all()
    .map((r) => r.date);
}

export interface HydratedBriefEvent {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
  entityName: string;
  total: number;
  dimensions: { relevance: number; impact: number; novelty: number; credibility: number; urgency: number };
  why?: string;
  action?: string;
  backfill?: boolean;
  titleZh?: string | null;
  whyZh?: string | null;
  briefing?: EventBriefing | null;
  relatedCount?: number;
  relatedTitles?: string[];
  sourceCount?: number;
}

/** Fill missing briefing + 中文 before display. Idempotent; already-stored rows are skipped. */
export async function prepareDisplayEvents(ids: string[]): Promise<HydratedBriefEvent[]> {
  const missingBrief = ids.filter((id) => !getEventBriefing(id));
  if (missingBrief.length > 0) {
    await organizeEvents(missingBrief);
  }
  const missingZh = ids.filter((id) => !getEventZh(id)?.titleZh);
  if (missingZh.length > 0) {
    await translateEvents(missingZh);
  }
  return hydrateBriefEvents(ids);
}

export function hydrateBriefEvents(ids: string[]): HydratedBriefEvent[] {
  return ids.map((id) => {
    const ev = db().select().from(event).where(eq(event.id, id)).get();
    if (!ev) return null;
    const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
    const sc = db().select().from(scoreSnapshot).where(eq(scoreSnapshot.eventId, id)).all().at(-1);
    const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, id)).get();
    const zh = getEventZh(id);
    const briefing = getEventBriefing(id);
    const sourceCount = new Set(
      db().select({ sourceId: eventEvidence.sourceId }).from(eventEvidence).where(eq(eventEvidence.eventId, id)).all().map((row) => row.sourceId),
    ).size;
    return {
      id,
      title: ev.title,
      type: ev.type,
      occurredAt: ev.occurredAt,
      entityName: ent?.name ?? '?',
      total: sc?.total ?? 0,
      dimensions: (sc?.dimensions as HydratedBriefEvent['dimensions']) ?? {
        relevance: 0, impact: 0, novelty: 0, credibility: 0, urgency: 0,
      },
      why: card?.whyItMatters,
      action: card?.recommendedAction,
      backfill: Boolean(ev.backfill),
      titleZh: zh?.titleZh,
      whyZh: zh?.whyZh,
      briefing,
      sourceCount: Math.max(1, sourceCount),
    };
  }).filter(Boolean) as HydratedBriefEvent[];
}

/** Fold consecutive releases for the same entity into one readable update train. */
export function groupRelatedBriefEvents(items: HydratedBriefEvent[]): HydratedBriefEvent[] {
  const output: HydratedBriefEvent[] = [];
  const releaseIndex = new Map<string, number>();
  for (const item of items) {
    if (item.type !== 'release') {
      output.push(item);
      continue;
    }
    const existingIndex = releaseIndex.get(item.entityName);
    if (existingIndex === undefined) {
      releaseIndex.set(item.entityName, output.length);
      output.push({ ...item, relatedCount: 1, relatedTitles: [item.title] });
      continue;
    }
    const existing = output[existingIndex];
    output[existingIndex] = {
      ...existing,
      relatedCount: (existing.relatedCount ?? 1) + 1,
      relatedTitles: [...(existing.relatedTitles ?? [existing.title]), item.title],
      sourceCount: Math.max(existing.sourceCount ?? 1, item.sourceCount ?? 1),
    };
  }
  return output;
}
