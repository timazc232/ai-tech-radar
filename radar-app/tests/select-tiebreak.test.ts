import { describe, it, expect } from 'vitest';
import { selectDaily, tieBreakSort, applyTopicCap, tierLabel, type ScoredEvent } from '@/modules/scoring/select';
import { DEFAULT_THRESHOLDS } from '@/modules/domain/enums';

function mk(id: string, total: number, relevance: number, entityId: string, occurredAt: string, topicId?: string): ScoredEvent {
  return {
    eventId: id, entityId, title: id, type: 'release', topicId,
    dimensions: { relevance, impact: 50, novelty: 50, credibility: 50, urgency: 50 },
    total, occurredAt,
  };
}

describe('select / tie-break (§7.7)', () => {
  it('splits into mustRead / worthWatching / filtered by thresholds', () => {
    const scored = [
      mk('a', 85, 80, 'e1', '2026-08-06T10:00:00Z'),
      mk('b', 70, 65, 'e2', '2026-08-06T11:00:00Z'),
      mk('c', 50, 40, 'e3', '2026-08-06T12:00:00Z'),
    ];
    const r = selectDaily(scored);
    expect(r.mustRead.map((s) => s.eventId)).toEqual(['a']);
    expect(r.worthWatching.map((s) => s.eventId)).toEqual(['b']);
    expect(r.filtered.map((s) => s.eventId)).toEqual(['c']);
  });

  it('tie-break: equal total -> higher relevance wins', () => {
    const scored = [
      mk('low_rel', 80, 70, 'e1', '2026-08-06T10:00:00Z'),
      mk('high_rel', 80, 90, 'e2', '2026-08-06T09:00:00Z'),
    ];
    const r = tieBreakSort(scored);
    expect(r[0].eventId).toBe('high_rel');
  });

  it('tie-break: equal total+relevance -> entity diversity favors different entity', () => {
    const scored = [
      mk('a', 80, 80, 'same', '2026-08-06T10:00:00Z'),
      mk('b', 80, 80, 'same', '2026-08-06T11:00:00Z'),
      mk('c', 80, 80, 'other', '2026-08-06T12:00:00Z'),
    ];
    const r = tieBreakSort(scored);
    // first two are 'same' entity, 'c' (other) should outrank the second 'same'
    expect(r.map((s) => s.eventId)).toContain('c');
    const cIdx = r.findIndex((s) => s.eventId === 'c');
    const bIdx = r.findIndex((s) => s.eventId === 'b');
    expect(cIdx).toBeLessThan(bIdx);
  });

  it('topic cap prevents one topic dominating (ceil(n/2))', () => {
    const scored = [
      mk('t1a', 85, 80, 'e1', '2026-08-06T10:00:00Z', 'topic1'),
      mk('t1b', 84, 80, 'e2', '2026-08-06T11:00:00Z', 'topic1'),
      mk('t1c', 83, 80, 'e3', '2026-08-06T12:00:00Z', 'topic1'),
      mk('t2a', 82, 80, 'e4', '2026-08-06T13:00:00Z', 'topic2'),
    ];
    const r = applyTopicCap(scored);
    // 4 items -> cap = ceil(4/2) = 2; topic1 should have at most 2
    const topic1Count = r.filter((s) => s.topicId === 'topic1').length;
    expect(topic1Count).toBeLessThanOrEqual(2);
  });

  it('tierLabel classifies correctly', () => {
    expect(tierLabel(85)).toBe('must');
    expect(tierLabel(80)).toBe('must');
    expect(tierLabel(79)).toBe('worth');
    expect(tierLabel(65)).toBe('worth');
    expect(tierLabel(64)).toBe('filtered');
  });
});
