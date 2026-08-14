import { ftsRecall } from '@/db/fts';
import { NOVELTY_DUPLICATE_THRESHOLD } from '@/modules/domain/enums';
import type { Fact } from '@/modules/domain/schema';

export interface NoveltyResult {
  isDuplicate: boolean;
  duplicateOf?: string;
  similarity: number;
  noveltyScore: number;
}

/**
 * §7.6 Novelty assessment:
 * 1) FTS5 bm25 recall top-5 historical events
 * 2) title Jaccard + facts key overlap -> weighted similarity
 * 3) sim >= 0.85 -> duplicate (status=merged)
 */
export async function assessNovelty(
  candidate: { title: string; facts: Fact[] },
  loadFacts: (eventId: string) => Promise<Fact[]>,
): Promise<NoveltyResult> {
  const similar = ftsRecall(candidate.title, 5);
  if (similar.length === 0) {
    return { isDuplicate: false, similarity: 0, noveltyScore: 100 };
  }

  let best = { id: '', sim: 0 };
  for (const s of similar) {
    const titleSim = jaccard(tokenize(candidate.title), tokenize(s.title));
    const otherFacts = await loadFacts(s.id);
    const factsOverlap = factsKeyOverlap(candidate.facts, otherFacts);
    const sim = 0.6 * titleSim + 0.4 * factsOverlap;
    if (sim > best.sim) best = { id: s.id, sim };
  }

  return {
    isDuplicate: best.sim >= NOVELTY_DUPLICATE_THRESHOLD,
    duplicateOf: best.sim >= NOVELTY_DUPLICATE_THRESHOLD ? best.id : undefined,
    similarity: best.sim,
    noveltyScore: clamp(Math.round((1 - best.sim) * 100), 0, 100),
  };
}

export function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function factsKeyOverlap(a: Fact[], b: Fact[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const ak = new Set(a.map((f) => f.key));
  const bk = new Set(b.map((f) => f.key));
  return jaccard(ak, bk);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
