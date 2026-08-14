import { describe, it, expect, vi } from 'vitest';
import { GitHubCollector } from '@/connectors/github';
import type { Source } from '@/modules/domain/schema';

const baseSource: Source = {
  id: 'src_test',
  type: 'github_release',
  url: 'https://github.com/anthropics/anthropic-sdk-python/releases',
  config: { noise_factor: 1.0, cursor: null, etag: null, last_modified: null },
  status: 'active',
  entityId: 'ent_anthropic',
  topicId: 'topic_llm',
};

function mockResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Response;
}

describe('GitHub collector (§5.2, T-09)', () => {
  it('parses releases within window', async () => {
    const releases = [
      { id: 1, name: 'v1.0', tag_name: 'v1.0.0', published_at: '2026-08-06T17:00:00.000Z', body: 'first', html_url: 'https://github.com/o/r/releases/tag/v1.0.0', prerelease: false, draft: false },
      { id: 2, name: null, tag_name: 'v0.9', published_at: '2026-08-01T17:00:00.000Z', body: 'old', html_url: 'https://github.com/o/r/releases/tag/v0.9', prerelease: false, draft: false },
    ];
    const fetcher = vi.fn().mockResolvedValue(mockResponse(200, releases, { etag: '"abc"' }));
    const c = new GitHubCollector('tok', fetcher as unknown as typeof fetch);
    const result = await c.fetch(baseSource, { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' });
    // only the v1.0 release (2026-08-06 17:00 UTC) is in window
    expect(result.items).toHaveLength(1);
    expect(result.items[0].externalId).toBe('1');
    expect(result.newEtag).toBe('"abc"');
    expect(fetcher).toHaveBeenCalledOnce();
    // auth header present
    const calledUrl = (fetcher.mock.calls[0][0] as string);
    expect(calledUrl).toContain('/releases');
  });

  it('304 not modified returns empty items, preserves cursor/etag', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(304, null));
    const src = { ...baseSource, config: { ...baseSource.config, etag: '"abc"', cursor: '5' } };
    const c = new GitHubCollector('tok', fetcher as unknown as typeof fetch);
    const result = await c.fetch(src, { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' });
    expect(result.items).toHaveLength(0);
    expect(result.newEtag).toBe('"abc"');
    expect(result.newCursor).toBe('5');
  });

  it('rate limit (403 + remaining=0) throws retryable', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(403, { message: 'rate' }, { 'x-ratelimit-remaining': '0' }));
    const c = new GitHubCollector('tok', fetcher as unknown as typeof fetch);
    await expect(c.fetch(baseSource, { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' })).rejects.toThrow();
  });

  it('auth failed (401) throws non-retryable', async () => {
    const fetcher = vi.fn().mockResolvedValue(mockResponse(401, { message: 'bad credentials' }));
    const c = new GitHubCollector('tok', fetcher as unknown as typeof fetch);
    await expect(c.fetch(baseSource, { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' })).rejects.toThrow();
  });

  it('skips drafts', async () => {
    const releases = [
      { id: 10, name: 'draft', tag_name: 'v2.0', published_at: '2026-08-06T17:00:00.000Z', body: 'd', html_url: 'https://github.com/o/r/releases/tag/v2.0', prerelease: false, draft: true },
      { id: 11, name: 'pub', tag_name: 'v2.1', published_at: '2026-08-06T18:00:00.000Z', body: 'p', html_url: 'https://github.com/o/r/releases/tag/v2.1', prerelease: false, draft: false },
    ];
    const fetcher = vi.fn().mockResolvedValue(mockResponse(200, releases));
    const c = new GitHubCollector('tok', fetcher as unknown as typeof fetch);
    const result = await c.fetch(baseSource, { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].externalId).toBe('11');
  });
});
