import type { Feedback, ScoreDimensions } from '@/modules/domain/schema';
import {
  FEEDBACK_STEPS, WEIGHT_BOUNDS, SOURCE_NOISE_THRESHOLD, SOURCE_NOISE_FACTOR,
} from '@/modules/domain/enums';

export type DimensionWeights = Record<keyof ScoreDimensions, number>;

export const DEFAULT_WEIGHTS: DimensionWeights = {
  relevance: 1.0, impact: 1.0, novelty: 1.0, credibility: 1.0, urgency: 1.0,
};

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export interface FeedbackApplyResult {
  newWeights: DimensionWeights;
  delta: Record<string, number>;
}

/**
 * §8.1 feedback adjustment algorithm.
 * - weight ∈ [0.2, 1.0], clamped
 * - useful +0.03, irrelevant -0.05, save +0.01, later 0
 * - records weight_delta for rollback
 * - source noise: >= 3 irrelevant from one source -> credibility × 0.8
 */
export function applyFeedback(
  feedback: Pick<Feedback, 'action' | 'eventId'>,
  currentWeights: DimensionWeights,
  opts: { sourceIrrelevantCount?: number } = {},
): FeedbackApplyResult {
  const step = FEEDBACK_STEPS[feedback.action];
  const delta: Record<string, number> = {};
  const newWeights: DimensionWeights = { ...currentWeights };

  // affected dimensions by action
  const affected = affectedDimensions(feedback.action);
  for (const dim of affected) {
    const before = newWeights[dim];
    const after = clamp(before + step, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
    newWeights[dim] = after;
    if (after !== before) delta[dim] = after - before;
  }

  // source noise factor
  if (feedback.action === 'irrelevant' && (opts.sourceIrrelevantCount ?? 0) >= SOURCE_NOISE_THRESHOLD) {
    const before = newWeights.credibility;
    const after = clamp(before * SOURCE_NOISE_FACTOR, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
    newWeights.credibility = after;
    delta.credibility = after - before;
  }

  return { newWeights, delta };
}

function affectedDimensions(action: Feedback['action']): Array<keyof ScoreDimensions> {
  switch (action) {
    case 'useful': return ['relevance', 'impact'];
    case 'irrelevant': return ['relevance'];
    case 'save': return ['relevance'];
    case 'later': return [];
  }
}

/** Rollback: reverse-apply the recorded delta (§8.1). */
export function rollbackFeedback(
  delta: Record<string, number>,
  weights: DimensionWeights,
): DimensionWeights {
  const rolled: DimensionWeights = { ...weights };
  for (const [dim, d] of Object.entries(delta)) {
    const k = dim as keyof ScoreDimensions;
    rolled[k] = clamp(rolled[k] - d, WEIGHT_BOUNDS.min, WEIGHT_BOUNDS.max);
  }
  return rolled;
}

export const FEEDBACK_CONSTANTS = {
  STEPS: FEEDBACK_STEPS,
  BOUNDS: WEIGHT_BOUNDS,
  NOISE_THRESHOLD: SOURCE_NOISE_THRESHOLD,
  NOISE_FACTOR: SOURCE_NOISE_FACTOR,
};
