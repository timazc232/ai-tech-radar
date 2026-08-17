import { describe, expect, it } from 'vitest';
import { groupRelatedBriefEvents, type HydratedBriefEvent } from '@/modules/pipeline/brief';

function event(id: string, entityName: string, type = 'release'): HydratedBriefEvent {
  return {
    id, title: id, type, occurredAt: '2026-08-12T08:00:00.000Z', entityName, total: 70,
    dimensions: { relevance: 70, impact: 70, novelty: 70, credibility: 70, urgency: 70 },
    sourceCount: 1,
  };
}

describe('groupRelatedBriefEvents', () => {
  it('folds same-entity releases while keeping unrelated events', () => {
    const grouped = groupRelatedBriefEvents([
      event('v1.0.3', 'sdk'), event('v1.0.2', 'sdk'), event('research', 'sdk', 'research'), event('other', 'other'),
    ]);
    expect(grouped).toHaveLength(3);
    expect(grouped[0]).toMatchObject({ id: 'v1.0.3', relatedCount: 2, relatedTitles: ['v1.0.3', 'v1.0.2'] });
    expect(grouped[1].id).toBe('research');
  });
});
