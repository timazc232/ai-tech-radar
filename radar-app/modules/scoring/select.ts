import type { ScoreDimensions, ScoreSnapshot } from '@/modules/domain/schema';
import { THRESHOLDS } from './rules';

export interface ScoredEvent {
  eventId: string;
  entityId: string;
  title: string;
  type: string;
  topicId?: string | null;
  dimensions: ScoreDimensions;
  total: number;
  occurredAt: string;
}

/**
 * §7.7 Daily selection + tie-break.
 * 1) Must Read: total >= must
 * 2) Worth Watching: worth <= total < must
 * 3) Tie-break (in order): total DESC -> relevance DESC -> entity diversity -> occurredAt DESC
 * 4) Single-topic cap: ceil(count/2) to prevent one topic dominating
 */
export function selectDaily(scored: ScoredEvent[], opts = THRESHOLDS): {
  mustRead: ScoredEvent[];
  worthWatching: ScoredEvent[];
  filtered: ScoredEvent[];
} {
  const mustRead = scored.filter((s) => s.total >= opts.must);
  const worthWatching = scored.filter((s) => s.total >= opts.worth && s.total < opts.must);
  const filtered = scored.filter((s) => s.total < opts.worth);

  return {
    mustRead: applyTopicCap(tieBreakSort(mustRead)),
    worthWatching: applyTopicCap(tieBreakSort(worthWatching)),
    filtered,
  };
}

export function tieBreakSort(list: ScoredEvent[]): ScoredEvent[] {
  // track entity occurrence count for diversity (later occurrences ranked lower)
  const entityCount = new Map<string, number>();
  return [...list]
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.dimensions.relevance !== a.dimensions.relevance)
        return b.dimensions.relevance - a.dimensions.relevance;
      // diversity: fewer prior occurrences of the same entity ranks higher
      const ac = entityCount.get(a.entityId) ?? 0;
      const bc = entityCount.get(b.entityId) ?? 0;
      if (ac !== bc) return ac - bc;
      entityCount.set(a.entityId, ac + 1);
      entityCount.set(b.entityId, bc + 1);
      return b.occurredAt.localeCompare(a.occurredAt);
    });
}

export function applyTopicCap(list: ScoredEvent[]): ScoredEvent[] {
  if (list.length === 0) return list;
  const cap = Math.max(1, Math.ceil(list.length / 2));
  const counts = new Map<string, number>();
  const out: ScoredEvent[] = [];
  for (const e of list) {
    const t = e.topicId ?? '_none';
    const c = counts.get(t) ?? 0;
    if (c < cap) {
      out.push(e);
      counts.set(t, c + 1);
    }
  }
  return out;
}

export function tierLabel(total: number, opts = THRESHOLDS): 'must' | 'worth' | 'filtered' {
  if (total >= opts.must) return 'must';
  if (total >= opts.worth) return 'worth';
  return 'filtered';
}
