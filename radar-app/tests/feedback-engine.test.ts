import { describe, it, expect } from 'vitest';
import {
  applyFeedback, rollbackFeedback, DEFAULT_WEIGHTS, clamp,
} from '@/modules/feedback/engine';
import { FEEDBACK_STEPS, WEIGHT_BOUNDS } from '@/modules/domain/enums';

describe('feedback engine (§8.1)', () => {
  it('useful increases weight by 0.03', () => {
    const start = { ...DEFAULT_WEIGHTS, relevance: 0.5, impact: 0.5 };
    const { newWeights, delta } = applyFeedback({ action: 'useful', eventId: 'e1' }, start);
    expect(newWeights.relevance).toBeCloseTo(0.5 + FEEDBACK_STEPS.useful, 5);
    expect(newWeights.impact).toBeCloseTo(0.5 + FEEDBACK_STEPS.useful, 5);
    expect(delta.relevance).toBeCloseTo(FEEDBACK_STEPS.useful, 5);
  });

  it('irrelevant decreases relevance by 0.05', () => {
    const { newWeights, delta } = applyFeedback({ action: 'irrelevant', eventId: 'e1' }, DEFAULT_WEIGHTS);
    expect(newWeights.relevance).toBeCloseTo(1.0 + FEEDBACK_STEPS.irrelevant, 5);
    expect(delta.relevance).toBeCloseTo(FEEDBACK_STEPS.irrelevant, 5);
  });

  it('weight clamped to max 1.0', () => {
    const w = { ...DEFAULT_WEIGHTS, relevance: 0.99 };
    const { newWeights } = applyFeedback({ action: 'useful', eventId: 'e1' }, w);
    expect(newWeights.relevance).toBe(WEIGHT_BOUNDS.max);
  });

  it('weight clamped to min 0.2', () => {
    const w = { ...DEFAULT_WEIGHTS, relevance: 0.22 };
    const { newWeights } = applyFeedback({ action: 'irrelevant', eventId: 'e1' }, w);
    expect(newWeights.relevance).toBe(WEIGHT_BOUNDS.min);
  });

  it('source noise factor applies credibility x0.8 at threshold', () => {
    const { newWeights, delta } = applyFeedback(
      { action: 'irrelevant', eventId: 'e1' },
      DEFAULT_WEIGHTS,
      { sourceIrrelevantCount: 3 },
    );
    expect(newWeights.credibility).toBeCloseTo(1.0 * 0.8, 5);
    expect(delta.credibility).toBeCloseTo(-0.2, 5);
  });

  it('source noise factor does NOT apply below threshold', () => {
    const { newWeights } = applyFeedback(
      { action: 'irrelevant', eventId: 'e1' },
      DEFAULT_WEIGHTS,
      { sourceIrrelevantCount: 2 },
    );
    expect(newWeights.credibility).toBe(1.0);
  });

  it('rollback reverses the delta exactly', () => {
    const start = { ...DEFAULT_WEIGHTS, relevance: 0.5, impact: 0.5 };
    const { newWeights, delta } = applyFeedback({ action: 'useful', eventId: 'e1' }, start);
    const rolled = rollbackFeedback(delta, newWeights);
    expect(rolled.relevance).toBeCloseTo(start.relevance, 5);
    expect(rolled.impact).toBeCloseTo(start.impact, 5);
  });

  it('later action has zero delta', () => {
    const { newWeights, delta } = applyFeedback({ action: 'later', eventId: 'e1' }, DEFAULT_WEIGHTS);
    expect(newWeights).toEqual(DEFAULT_WEIGHTS);
    expect(Object.keys(delta)).toHaveLength(0);
  });
});
