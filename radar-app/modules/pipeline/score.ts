import { db } from '@/db/client';
import { event, scoreSnapshot, entity, source, eventEvidence } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { EventCandidate, Fact } from '@/modules/domain/schema';
import { scoreByRules, weightedTotal, type ScoreContext } from '@/modules/scoring/rules';
import { deterministicId } from '@/lib/hash';
import { log } from '@/lib/logger';
import type { ScoredEvent } from '@/modules/scoring/select';

export interface PersistedEvent {
  id: string;
  candidate: EventCandidate & { noveltyScore: number };
  type: string;
  topicId: string | null;
}

/** Persist candidate as event + evidence, return persisted event with topicId. */
export function persistEvent(
  c: EventCandidate & { noveltyScore: number },
  type: string,
  backfill = false,
): PersistedEvent {
  // ensure entity exists
  const ent = db().select().from(entity).where(eq(entity.id, c.entityId)).get();
  const topicId = ent?.topicId ?? null;
  if (!ent) {
    db().insert(entity).values({
      id: c.entityId,
      type: 'repo',
      name: c.entityName,
      aliases: '[]',
      canonicalUrl: c.canonicalUrl,
      topicId,
    }).onConflictDoNothing().run();
  }

  const eventId = deterministicId('evt', c.entityId, c.title, c.occurredAt);
  const facts: Fact[] = c.facts;
  db().insert(event).values({
    id: eventId,
    entityId: c.entityId,
    type,
    title: c.title,
    factsJson: facts,
    occurredAt: c.occurredAt,
    capturedAt: new Date().toISOString(),
    status: 'candidate',
    backfill,
    version: 1,
  }).onConflictDoNothing().run();

  // evidence: source URL + title quote (card generation requires >= 1 evidence)
  db().insert(eventEvidence).values({
    id: deterministicId('evd', eventId, c.canonicalUrl),
    eventId,
    sourceId: c.sourceId,
    url: c.canonicalUrl,
    quote: c.title,
    confidence: 0.9,
    capturedAt: new Date().toISOString(),
  }).onConflictDoNothing().run();

  return { id: eventId, candidate: c, type, topicId };
}

/** Rule-based scoring v1 (§7.5). */
export function scoreEventsV1(
  persisted: PersistedEvent[],
  ctx: ScoreContext,
): ScoredEvent[] {
  const now = new Date().toISOString();
  const scored: ScoredEvent[] = [];

  for (const p of persisted) {
    // use canonical DB entity name for watchlist/official matching (§6.5)
    const ent = db().select().from(entity).where(eq(entity.id, p.candidate.entityId)).get();
    const entName = ent?.name ?? p.candidate.entityName;
    const dims = scoreByRules(
      { type: p.type, title: p.candidate.title, canonicalUrl: p.candidate.canonicalUrl, entityName: entName },
      ctx,
    );
    // override novelty with assessed value
    dims.novelty = p.candidate.noveltyScore;
    const total = weightedTotal(dims);

    db().insert(scoreSnapshot).values({
      id: deterministicId('sc', p.id, 'v1'),
      eventId: p.id,
      profileId: 'local',
      dimensions: dims,
      total,
      scorer: 'rules',
      version: 1,
      weightDiff: {},
      model: null,
      promptVersion: null,
      generatedAt: now,
    }).onConflictDoNothing().run();

    scored.push({
      eventId: p.id,
      entityId: p.candidate.entityId,
      title: p.candidate.title,
      type: p.type,
      topicId: p.topicId,
      dimensions: dims,
      total,
      occurredAt: p.candidate.occurredAt,
    });
  }

  log.info({ scored: scored.length }, 'score v1 done');
  return scored;
}

/** Build score context from DB (watchlist = all entities currently tracked). */
export function buildScoreContext(): ScoreContext {
  const sources = db().select().from(source).all();
  const watchlist = db().select().from(entity).all().map((e) => e.name);
  const official = new Set(
    sources.filter((s) => s.type === 'github_release' || s.type === 'rss').map((s) => {
      const e = db().select().from(entity).where(eq(entity.id, s.entityId ?? '')).get();
      return e?.name;
    }).filter(Boolean) as string[],
  );
  return { watchlist, officialEntities: official };
}
