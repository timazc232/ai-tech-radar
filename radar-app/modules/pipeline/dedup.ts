import { db } from '@/db/client';
import { rawItem, event } from '@/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';
import type { RawItem, EventCandidate, Fact } from '@/modules/domain/schema';
import { assessNovelty } from '@/modules/scoring/novelty';
import { log } from '@/lib/logger';

/**
 * §6.3/7.6 dedup:
 * 1) content_hash dedup: skip raw items whose hash already exists
 * 2) novelty: assess against historical events, mark duplicates as merged
 */
export async function dedupAndPersist(
  raws: RawItem[],
  candidates: EventCandidate[],
): Promise<{ unique: Array<EventCandidate & { noveltyScore: number; duplicateOf?: string }>; duplicates: number }> {
  const unique: Array<EventCandidate & { noveltyScore: number; duplicateOf?: string }> = [];
  let duplicates = 0;

  for (const c of candidates) {
    // content hash dedup against existing events with same title/entity
    const existing = db()
      .select({ id: event.id })
      .from(event)
      .where(and(eq(event.title, c.title), eq(event.entityId, c.entityId)))
      .get();
    if (existing) {
      duplicates++;
      continue;
    }
    // novelty via FTS5
    const nov = await assessNovelty({ title: c.title, facts: c.facts }, loadFacts);
    if (nov.isDuplicate) {
      duplicates++;
      log.debug({ title: c.title, dupOf: nov.duplicateOf }, 'duplicate event skipped');
      continue;
    }
    unique.push({ ...c, noveltyScore: nov.noveltyScore, duplicateOf: nov.duplicateOf });
  }

  log.info({ unique: unique.length, duplicates }, 'dedup done');
  return { unique, duplicates };
}

async function loadFacts(eventId: string): Promise<Fact[]> {
  const row = db().select({ facts: event.factsJson }).from(event).where(eq(event.id, eventId)).get();
  return (row?.facts as Fact[]) ?? [];
}

/** Persist raw items (idempotent via unique index). */
export function persistRawItems(items: RawItem[]): void {
  for (const r of items) {
    db().insert(rawItem).values(r).onConflictDoNothing().run();
  }
}
