import { ConnectorError, type Collector, type CollectorResult } from './types';
import type { Source, RawItem } from '@/modules/domain/schema';
import { parseGitHubUrl, canonicalUrl } from '@/lib/url';
import { contentHash, deterministicId } from '@/lib/hash';
import { isInWindow } from '@/lib/time';
import { log } from '@/lib/logger';

interface GitHubRelease {
  id: number;
  name: string | null;
  tag_name: string;
  published_at: string | null;
  body: string | null;
  html_url: string;
  prerelease: boolean;
  draft: boolean;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  pushed_at: string;
  updated_at: string;
  html_url: string;
  description: string | null;
}

/**
 * GitHub Collector -- first-slice complete implementation (§5.2, T-09).
 * Supports github_release and github_repo source types.
 * Uses ETag conditional requests (304 does not count against quota).
 */
export class GitHubCollector implements Collector {
  constructor(private token: string, private fetcher: typeof fetch = fetch) {}

  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    const { owner, repo, kind } = parseGitHubUrl(source.url);
    const url =
      kind === 'release'
        ? `https://api.github.com/repos/${owner}/${repo}/releases?per_page=50`
        : `https://api.github.com/repos/${owner}/${repo}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-tech-radar',
    };
    if (source.config.etag) headers['If-None-Match'] = source.config.etag;

    const resp = await this.fetcher(url, { headers });

    if (resp.status === 304) {
      log.debug({ source: source.id }, 'github 304 not modified');
      return { items: [], newCursor: source.config.cursor, newEtag: source.config.etag };
    }
    if (resp.status === 401 || resp.status === 403) {
      const remaining = resp.headers.get('x-ratelimit-remaining');
      if (resp.status === 403 && remaining === '0') {
        throw new ConnectorError('github rate limit exceeded', 'RATE_LIMIT', true);
      }
      if (resp.status === 401) throw new ConnectorError('github auth failed', 'AUTH_FAILED', false);
    }
    if (!resp.ok) {
      throw new ConnectorError(`github ${resp.status}`, 'NETWORK', resp.status >= 500);
    }

    const data = (await resp.json()) as GitHubRelease[] | GitHubRepo;
    const releases = Array.isArray(data) ? data : [data];
    const newEtag = resp.headers.get('etag') ?? source.config.etag;

    const items: RawItem[] = [];
    for (const r of releases) {
      // skip drafts/prereleases unless they're the only signal
      if ('draft' in r && r.draft) continue;
      const ts = 'published_at' in r ? r.published_at : (r as GitHubRepo).pushed_at;
      if (!ts) continue;
      // For repo endpoint (single object), accept regardless of window (it's a snapshot);
      // for releases, filter by window.
      if (kind === 'release' && !isInWindow(ts, window)) continue;

      const externalId = String(r.id);
      const title = 'tag_name' in r
        ? `${r.name ?? r.tag_name}`
        : `${(r as GitHubRepo).full_name} activity`;
      const body = 'body' in r ? (r.body ?? '') : ((r as GitHubRepo).description ?? '');
      const cHash = contentHash(`${externalId}|${title}|${body}`);
      const payload = {
        kind,
        owner,
        repo,
        release: r,
        canonicalUrl: canonicalUrl(r.html_url),
      };
      items.push({
        id: deterministicId('raw', source.id, externalId),
        sourceId: source.id,
        externalId,
        contentHash: cHash,
        capturedAt: new Date().toISOString(),
        payload,
      });
    }

    const newCursor = items.at(-1)?.externalId ?? source.config.cursor;
    const rateLimit = parseRateLimit(resp.headers);
    log.info({ source: source.id, kind, collected: items.length }, 'github fetch done');
    return { items, newCursor, newEtag, rateLimit };
  }
}

function parseRateLimit(h: Headers): { remaining: number; resetAt: string } | undefined {
  const remaining = h.get('x-ratelimit-remaining');
  const reset = h.get('x-ratelimit-reset');
  if (remaining && reset) {
    return { remaining: Number(remaining), resetAt: new Date(Number(reset) * 1000).toISOString() };
  }
  return undefined;
}
