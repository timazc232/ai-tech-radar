import type { ScoreDimensions } from '@/modules/domain/schema';
import { SCORE_WEIGHTS, DEFAULT_THRESHOLDS } from '@/modules/domain/enums';

/** Context passed to the rule scorer. */
export interface ScoreContext {
  watchlist: string[];            // entity names on the watchlist
  officialEntities: Set<string>;  // high-credibility entities
  topicId?: string | null;
}

export interface Rule {
  id: string;
  match: (e: { type: string; title: string; canonicalUrl: string; entityName: string }, ctx: ScoreContext) => boolean;
  dim: keyof ScoreDimensions;
  score: number;
}

// §7.5 rule rubric
const RULES: Rule[] = [
  { id: 'release_v1', match: (e) => e.type === 'release' && /\bv1\b|\b1\.0\b/i.test(e.title), dim: 'impact', score: 65 },
  { id: 'release_major', match: (e) => e.type === 'release', dim: 'impact', score: 50 },
  { id: 'watchlist_match', match: (e, ctx) => ctx.watchlist.includes(e.entityName), dim: 'relevance', score: 75 },
  { id: 'topic_match', match: (e, ctx) => !!ctx.topicId, dim: 'relevance', score: 60 },
  { id: 'breaking_change', match: (e) => e.type === 'breaking_change', dim: 'urgency', score: 90 },
  { id: 'security_advisory', match: (e) => e.type === 'security_advisory', dim: 'urgency', score: 85 },
  { id: 'research_arxiv', match: (e) => /arxiv\.org/i.test(e.canonicalUrl), dim: 'novelty', score: 70 },
  { id: 'launch', match: (e) => e.type === 'launch', dim: 'novelty', score: 65 },
  { id: 'official_source', match: (e, ctx) => ctx.officialEntities.has(e.entityName), dim: 'credibility', score: 85 },
  { id: 'pricing_change', match: (e) => e.type === 'pricing_change', dim: 'impact', score: 55 },
];

/** Score an event by rules (v1, §7.5). LLM unavailable fallback. */
export function scoreByRules(
  event: { type: string; title: string; canonicalUrl: string; entityName: string },
  ctx: ScoreContext,
): ScoreDimensions {
  const dims: ScoreDimensions = { relevance: 45, impact: 40, novelty: 50, credibility: 55, urgency: 25 };
  for (const r of RULES) {
    if (r.match(event, ctx)) {
      // take the max so a specific rule (e.g. release_v1=65) is not overwritten
      // by a later general rule (e.g. release_major=50) on the same dimension
      dims[r.dim] = Math.min(100, Math.max(dims[r.dim], r.score));
    }
  }
  return dims;
}

export function weightedTotal(d: ScoreDimensions, weights = SCORE_WEIGHTS): number {
  return Math.round(
    d.relevance * weights.relevance +
      d.impact * weights.impact +
      d.novelty * weights.novelty +
      d.credibility * weights.credibility +
      d.urgency * weights.urgency,
  );
}

export const THRESHOLDS = DEFAULT_THRESHOLDS;
