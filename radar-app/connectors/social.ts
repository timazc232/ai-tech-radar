import { Buffer } from 'node:buffer';
import type { Collector, CollectorResult } from './types';
import { ConnectorError } from './types';
import type { RawItem, Source } from '@/modules/domain/schema';
import { contentHash, deterministicId } from '@/lib/hash';
import { canonicalUrl } from '@/lib/url';
import { isInWindow } from '@/lib/time';
import { log } from '@/lib/logger';

export interface SocialCredentials {
  xBearerToken: string;
  redditClientId: string;
  redditClientSecret: string;
  redditUserAgent: string;
}

interface XSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    author_id?: string;
    public_metrics?: { like_count?: number; reply_count?: number; repost_count?: number; quote_count?: number };
  }>;
  includes?: { users?: Array<{ id: string; username: string; name?: string }> };
}

interface RedditListing {
  data?: { children?: Array<{ data?: {
    id?: string;
    title?: string;
    selftext?: string;
    author?: string;
    subreddit?: string;
    created_utc?: number;
    score?: number;
    num_comments?: number;
    permalink?: string;
    url?: string;
    stickied?: boolean;
  } }> };
}

/** Optional official X and Reddit API integration. Missing credentials are a safe skip. */
export class SocialCollector implements Collector {
  constructor(private credentials: SocialCredentials, private fetcher: typeof fetch = fetch) {}

  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    const host = new URL(source.url).hostname.toLowerCase();
    if (host === 'api.x.com') return this.fetchX(source, window);
    if (host === 'oauth.reddit.com') return this.fetchReddit(source, window);
    throw new ConnectorError(`unsupported social API: ${host}`, 'PARSE_ERROR', false);
  }

  private async fetchX(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    if (!this.credentials.xBearerToken) {
      return this.skipped(source, '可选源未启用：请在设置中配置 X Bearer Token');
    }
    const url = new URL(source.url);
    if (source.config.query) url.searchParams.set('query', source.config.query);
    url.searchParams.set('max_results', String(source.config.max_items ?? 50));
    url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'username,name');

    const data = await this.fetchJson<XSearchResponse>(url.toString(), {
      Authorization: `Bearer ${this.credentials.xBearerToken}`,
    });
    const users = new Map((data.includes?.users ?? []).map((user) => [user.id, user]));
    const minScore = source.config.min_score ?? 10;
    const items = (data.data ?? []).flatMap((tweet) => {
      if (!tweet.created_at || !isInWindow(tweet.created_at, window)) return [];
      const metrics = tweet.public_metrics ?? {};
      const score = (metrics.like_count ?? 0) + (metrics.repost_count ?? 0) * 2 + (metrics.quote_count ?? 0) * 2;
      if (score < minScore) return [];
      const user = users.get(tweet.author_id ?? '');
      const username = user?.username ?? 'i';
      const discussionUrl = `https://x.com/${username}/status/${tweet.id}`;
      return [this.toRaw(source, {
        externalId: tweet.id,
        platform: 'x',
        community: 'X',
        title: tweet.text.replace(/\s+/g, ' ').slice(0, 180),
        link: discussionUrl,
        discussionUrl,
        content: tweet.text,
        publishedAt: tweet.created_at,
        author: user?.name ? `${user.name} (@${username})` : `@${username}`,
        score,
        commentCount: metrics.reply_count ?? 0,
        tags: [],
      })];
    });
    log.info({ source: source.id, collected: items.length }, 'x fetch done');
    return { items, newCursor: items.at(0)?.externalId ?? source.config.cursor, newEtag: null };
  }

  private async fetchReddit(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    if (!this.credentials.redditClientId || !this.credentials.redditClientSecret) {
      return this.skipped(source, '可选源未启用：请在设置中配置 Reddit Client ID 与 Secret');
    }
    const basic = Buffer.from(`${this.credentials.redditClientId}:${this.credentials.redditClientSecret}`).toString('base64');
    const token = await this.fetchJson<{ access_token?: string }>('https://www.reddit.com/api/v1/access_token', {
      Authorization: `Basic ${basic}`,
      'User-Agent': this.credentials.redditUserAgent,
      'Content-Type': 'application/x-www-form-urlencoded',
    }, { method: 'POST', body: 'grant_type=client_credentials' });
    if (!token.access_token) throw new ConnectorError('reddit auth response missing access token', 'AUTH_FAILED', false);

    const url = new URL(source.url);
    url.searchParams.set('limit', String(source.config.max_items ?? 60));
    url.searchParams.set('raw_json', '1');
    const listing = await this.fetchJson<RedditListing>(url.toString(), {
      Authorization: `Bearer ${token.access_token}`,
      'User-Agent': this.credentials.redditUserAgent,
    });
    const minScore = source.config.min_score ?? 10;
    const items = (listing.data?.children ?? []).flatMap((entry) => {
      const post = entry.data;
      if (!post?.id || !post.title || !post.created_utc || post.stickied || (post.score ?? 0) < minScore) return [];
      const publishedAt = new Date(post.created_utc * 1000).toISOString();
      if (!isInWindow(publishedAt, window)) return [];
      const discussionUrl = `https://www.reddit.com${post.permalink ?? ''}`;
      return [this.toRaw(source, {
        externalId: post.id,
        platform: 'reddit',
        community: `r/${post.subreddit ?? 'unknown'}`,
        title: post.title,
        link: canonicalUrl(post.url ?? discussionUrl),
        discussionUrl,
        content: post.selftext ?? '',
        publishedAt,
        author: `u/${post.author ?? 'unknown'}`,
        score: post.score ?? 0,
        commentCount: post.num_comments ?? 0,
        tags: post.subreddit ? [post.subreddit] : [],
      })];
    });
    log.info({ source: source.id, collected: items.length }, 'reddit fetch done');
    return { items, newCursor: items.at(0)?.externalId ?? source.config.cursor, newEtag: null };
  }

  private skipped(source: Source, warning: string): CollectorResult {
    log.info({ source: source.id, warning }, 'optional social source skipped');
    return { items: [], newCursor: source.config.cursor, newEtag: source.config.etag, warning };
  }

  private toRaw(source: Source, item: Record<string, unknown> & { externalId: string; title: string; link: string }): RawItem {
    return {
      id: deterministicId('raw', source.id, item.externalId),
      sourceId: source.id,
      externalId: item.externalId,
      contentHash: contentHash(`${item.externalId}|${item.title}|${item.link}`),
      capturedAt: new Date().toISOString(),
      payload: { kind: 'community', ...item },
    };
  }

  private async fetchJson<T>(url: string, headers: Record<string, string>, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(url, { ...init, headers });
    } catch (error) {
      throw new ConnectorError(`social network error: ${(error as Error).message}`, 'NETWORK', true);
    }
    if (response.status === 401 || response.status === 403) {
      throw new ConnectorError('social API authentication failed', 'AUTH_FAILED', false);
    }
    if (response.status === 429) throw new ConnectorError('social API rate limit exceeded', 'RATE_LIMIT', true);
    if (!response.ok) throw new ConnectorError(`social API ${response.status}`, 'NETWORK', response.status >= 500);
    return await response.json() as T;
  }
}
