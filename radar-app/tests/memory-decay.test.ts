import { describe, it, expect } from 'vitest';
import { decayInterest, decayResearch, daysBetween } from '@/modules/memory/decay';
import type { Memory } from '@/modules/domain/schema';

const NOW = new Date('2026-08-07T00:00:00.000Z');

function mkInterest(lastFeedbackDaysAgo: number, weight = 0.5, base = 0.3): Memory {
  const last = new Date(NOW.getTime() - lastFeedbackDaysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'm1', type: 'interest', content: { weight, base, lastFeedbackAt: last },
    evidence: [], confidence: 0.5, expiresAt: null, status: 'active',
    createdAt: last, updatedAt: last,
  };
}

function mkResearch(createdDaysAgo: number, weight = 1.0): Memory {
  const created = new Date(NOW.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'm2', type: 'research', content: { weight },
    evidence: [], confidence: 0.8, expiresAt: null, status: 'active',
    createdAt: created, updatedAt: created,
  };
}

describe('memory decay (§8.2)', () => {
  it('daysBetween computes floor of day difference', () => {
    expect(daysBetween('2026-08-01T00:00:00Z', '2026-08-07T00:00:00Z')).toBe(6);
    expect(daysBetween('2026-08-01T23:00:00Z', '2026-08-07T00:00:00Z')).toBe(5);
  });

  it('interest: no decay within 90 days', () => {
    const m = mkInterest(50);
    const d = decayInterest(m, NOW);
    expect(d.content.weight).toBe(0.5);
  });

  it('interest: decays after 90 days at 0.001/day, not below base', () => {
    const m = mkInterest(100, 0.5, 0.3); // 10 days past threshold
    const d = decayInterest(m, NOW);
    // 0.5 - 0.001*10 = 0.49
    expect(d.content.weight).toBeCloseTo(0.49, 5);
  });

  it('interest: never decays below base', () => {
    const m = mkInterest(500, 0.4, 0.3); // way past, would go negative
    const d = decayInterest(m, NOW);
    expect(d.content.weight).toBe(0.3);
  });

  it('research: full weight within 30 days', () => {
    const m = mkResearch(20);
    const d = decayResearch(m, NOW);
    expect(d.content.weight).toBe(1.0);
    expect(d.status).toBe('active');
  });

  it('research: auto-pauses after 30+15=45 days', () => {
    const m = mkResearch(50);
    const d = decayResearch(m, NOW);
    expect(d.status).toBe('paused');
  });

  it('research: linear decay between day 30 and 45', () => {
    const m = mkResearch(37); // 7 days into decay window (of 15)
    const d = decayResearch(m, NOW);
    // progress = 7/15, weight = 1.0 * (1 - 7/15) = 8/15
    expect(d.content.weight).toBeCloseTo((1 - 7 / 15), 3);
    expect(d.status).toBe('active');
  });
});
