import { describe, it, expect } from 'vitest';
import { tokenize, jaccard, factsKeyOverlap } from '@/modules/scoring/novelty';
import type { Fact } from '@/modules/domain/schema';

describe('novelty helpers (§7.6)', () => {
  it('tokenize splits on word boundaries, lowercases', () => {
    const t = tokenize('Claude 3.5 Sonnet Release');
    expect(t.has('claude')).toBe(true);
    expect(t.has('sonnet')).toBe(true);
    expect(t.has('release')).toBe(true);
  });

  it('jaccard of identical sets is 1', () => {
    expect(jaccard(tokenize('alpha beta gamma'), tokenize('alpha beta gamma'))).toBe(1);
  });

  it('jaccard of disjoint sets is 0', () => {
    expect(jaccard(tokenize('alpha beta'), tokenize('gamma delta'))).toBe(0);
  });

  it('jaccard of partial overlap is between 0 and 1', () => {
    const j = jaccard(tokenize('alpha beta gamma'), tokenize('alpha beta delta'));
    expect(j).toBeGreaterThan(0);
    expect(j).toBeLessThan(1);
    // intersection {alpha,beta}=2, union {alpha,beta,gamma,delta}=4 -> 0.5
    expect(j).toBeCloseTo(0.5, 2);
  });

  it('factsKeyOverlap measures key set overlap', () => {
    const a: Fact[] = [{ key: 'tag', value: 'v1' }, { key: 'url', value: 'x' }];
    const b: Fact[] = [{ key: 'tag', value: 'v2' }, { key: 'author', value: 'y' }];
    // keys: a={tag,url}, b={tag,author}; inter={tag}=1, union=3 -> 1/3
    expect(factsKeyOverlap(a, b)).toBeCloseTo(1 / 3, 2);
  });

  it('identical titles yield high similarity -> would be duplicate', () => {
    const sim = jaccard(tokenize('GPT-5 Released'), tokenize('GPT-5 Released'));
    expect(sim).toBeGreaterThanOrEqual(0.85);
  });
});
