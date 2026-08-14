import { describe, it, expect } from 'vitest';
import { scoreByRules, weightedTotal, type ScoreContext } from '@/modules/scoring/rules';
import { SCORE_WEIGHTS } from '@/modules/domain/enums';

const ctx: ScoreContext = { watchlist: ['vllm'], officialEntities: new Set(['anthropic']) };

describe('scoring rules (§7.5)', () => {
  it('weightedTotal sums dimensions with correct weights', () => {
    const dims = { relevance: 100, impact: 100, novelty: 100, credibility: 100, urgency: 100 };
    expect(weightedTotal(dims)).toBe(100);
    const dims0 = { relevance: 0, impact: 0, novelty: 0, credibility: 0, urgency: 0 };
    expect(weightedTotal(dims0)).toBe(0);
  });

  it('weights sum to 1.0', () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('watchlist match boosts relevance', () => {
    const onList = scoreByRules({ type: 'release', title: 'v1.0', canonicalUrl: 'https://github.com/vllm/vllm', entityName: 'vllm' }, ctx);
    const offList = scoreByRules({ type: 'release', title: 'v1.0', canonicalUrl: 'https://github.com/x/y', entityName: 'someone' }, ctx);
    expect(onList.relevance).toBeGreaterThan(offList.relevance);
  });

  it('breaking_change gets high urgency', () => {
    const dims = scoreByRules({ type: 'breaking_change', title: 'deprecation', canonicalUrl: 'https://x', entityName: 'x' }, ctx);
    expect(dims.urgency).toBeGreaterThanOrEqual(85);
  });

  it('release with v1 gets higher impact than plain release', () => {
    const v1 = scoreByRules({ type: 'release', title: 'v1.0 launch', canonicalUrl: 'https://x', entityName: 'x' }, ctx);
    const plain = scoreByRules({ type: 'release', title: 'patch', canonicalUrl: 'https://x', entityName: 'x' }, ctx);
    expect(v1.impact).toBeGreaterThan(plain.impact);
  });

  it('official source gets high credibility', () => {
    const dims = scoreByRules({ type: 'release', title: 'x', canonicalUrl: 'https://x', entityName: 'anthropic' }, ctx);
    expect(dims.credibility).toBeGreaterThanOrEqual(85);
  });
});
