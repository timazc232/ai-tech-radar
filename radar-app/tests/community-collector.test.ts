import { describe, expect, it, vi } from 'vitest';
import { CommunityCollector } from '@/connectors/community';
import type { Source } from '@/modules/domain/schema';

const window = { start: '2026-08-11T16:00:00.000Z', end: '2026-08-12T16:00:00.000Z' };

function source(url: string): Source {
  return {
    id: 'src_community_test',
    type: 'api',
    url,
    config: { noise_factor: 1, cursor: null, etag: null, last_modified: null },
    status: 'active',
    entityId: 'ent_community',
    topicId: 'topic_devtool',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('CommunityCollector', () => {
  it('collects Hacker News stories in the window above the score floor', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse([101, 102, 103]))
      .mockResolvedValueOnce(jsonResponse({ id: 101, type: 'story', by: 'alice', time: 1786496400, title: 'Useful AI agent release', url: 'https://example.com/agent', score: 42, descendants: 12 }))
      .mockResolvedValueOnce(jsonResponse({ id: 102, type: 'story', by: 'bob', time: 1786496400, title: 'Low signal', score: 3 }))
      .mockResolvedValueOnce(jsonResponse({ id: 103, type: 'story', by: 'carol', time: 1786320000, title: 'Old story', score: 99 }));

    const result = await new CommunityCollector(fetcher as typeof fetch).fetch(
      source('https://hacker-news.firebaseio.com/v0/beststories.json'),
      window,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].externalId).toBe('101');
    expect(result.items[0].payload).toMatchObject({
      kind: 'community', platform: 'hackernews', score: 42, commentCount: 12,
    });
  });

  it('collects Lobsters hottest stories and keeps discussion metadata', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse([
      {
        short_id: 'abc123', title: 'New inference runtime', url: 'https://example.com/runtime',
        comments_url: 'https://lobste.rs/s/abc123', created_at: '2026-08-12T08:00:00.000Z',
        description: 'Fast and small', submitter_user: { username: 'dev' }, score: 18,
        comment_count: 7, tags: ['ai', 'release'],
      },
      { short_id: 'quiet', title: 'Quiet item', created_at: '2026-08-12T09:00:00.000Z', score: 1 },
    ]));

    const result = await new CommunityCollector(fetcher as typeof fetch).fetch(
      source('https://lobste.rs/hottest.json'),
      window,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].payload).toMatchObject({
      platform: 'lobsters', discussionUrl: 'https://lobste.rs/s/abc123', tags: ['ai', 'release'],
    });
  });

  it('isolates unsupported APIs as non-retryable parse errors', async () => {
    const collector = new CommunityCollector(vi.fn() as unknown as typeof fetch);
    await expect(collector.fetch(source('https://example.com/feed.json'), window))
      .rejects.toMatchObject({ code: 'PARSE_ERROR', retryable: false });
  });
});
