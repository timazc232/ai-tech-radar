import { describe, expect, it, vi } from 'vitest';
import { SocialCollector, type SocialCredentials } from '@/connectors/social';
import type { Source } from '@/modules/domain/schema';

const window = { start: '2026-08-11T16:00:00.000Z', end: '2026-08-12T16:00:00.000Z' };
const emptyCredentials: SocialCredentials = {
  xBearerToken: '', redditClientId: '', redditClientSecret: '', redditUserAgent: 'test',
};

function source(url: string, config: Partial<Source['config']> = {}): Source {
  return {
    id: 'src_social_test', type: 'api', url,
    config: { noise_factor: 1, cursor: null, etag: null, last_modified: null, ...config },
    status: 'active', entityId: 'ent_social', topicId: 'topic_llm',
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

describe('SocialCollector', () => {
  it('safely skips optional sources when credentials are missing', async () => {
    const fetcher = vi.fn();
    const collector = new SocialCollector(emptyCredentials, fetcher as unknown as typeof fetch);
    const x = await collector.fetch(source('https://api.x.com/2/tweets/search/recent'), window);
    const reddit = await collector.fetch(source('https://oauth.reddit.com/r/MachineLearning/hot.json'), window);
    expect(x.warning).toContain('X Bearer Token');
    expect(reddit.warning).toContain('Reddit Client ID');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('collects high-engagement X posts through the official endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({
      data: [{ id: '42', text: 'Launching a useful AI system', created_at: '2026-08-12T08:00:00.000Z', author_id: '7', public_metrics: { like_count: 12, reply_count: 3, repost_count: 4, quote_count: 1 } }],
      includes: { users: [{ id: '7', username: 'builder', name: 'Builder' }] },
    }));
    const collector = new SocialCollector({ ...emptyCredentials, xBearerToken: 'token' }, fetcher as typeof fetch);
    const result = await collector.fetch(source('https://api.x.com/2/tweets/search/recent', { query: 'from:builder', min_score: 10 }), window);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].payload).toMatchObject({ platform: 'x', author: 'Builder (@builder)', score: 22 });
  });

  it('authenticates and collects Reddit posts through OAuth', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ access_token: 'access' }))
      .mockResolvedValueOnce(jsonResponse({ data: { children: [{ data: {
        id: 'post1', title: 'Inference benchmark', author: 'alice', subreddit: 'LocalLLaMA',
        created_utc: 1786492800, score: 50, num_comments: 20,
        permalink: '/r/LocalLLaMA/comments/post1', url: 'https://example.com/benchmark',
      } }] } }));
    const collector = new SocialCollector({ ...emptyCredentials, redditClientId: 'id', redditClientSecret: 'secret' }, fetcher as typeof fetch);
    const result = await collector.fetch(source('https://oauth.reddit.com/r/LocalLLaMA/hot.json'), window);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].payload).toMatchObject({ platform: 'reddit', community: 'r/LocalLLaMA', score: 50 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
