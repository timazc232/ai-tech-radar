import type { Collector, CollectorResult } from './types';
import { ConnectorError } from './types';
import type { RawItem, Source } from '@/modules/domain/schema';
import { contentHash, deterministicId } from '@/lib/hash';
import { isInWindow } from '@/lib/time';
import { canonicalUrl } from '@/lib/url';
import { log } from '@/lib/logger';

interface HackerNewsStory {
  id: number;
  type?: string;
  by?: string;
  time?: number;
  title?: string;
  text?: string;
  url?: string;
  score?: number;
  descendants?: number;
  deleted?: boolean;
  dead?: boolean;
}

interface LobstersStory {
  short_id?: string;
  title?: string;
  url?: string;
  comments_url?: string;
  created_at?: string;
  description?: string;
  submitter_user?: { username?: string };
  score?: number;
  comment_count?: number;
  tags?: string[];
}

const HN_ITEM_LIMIT = 60;
const HN_MIN_SCORE = 20;
const LOBSTERS_ITEM_LIMIT = 60;
const LOBSTERS_MIN_SCORE = 5;

/** Public community feeds that need no user credentials. */
export class CommunityCollector implements Collector {
  constructor(private fetcher: typeof fetch = fetch) {}

  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    const host = new URL(source.url).hostname.toLowerCase();
    if (host === 'hacker-news.firebaseio.com') return this.fetchHackerNews(source, window);
    if (host === 'lobste.rs') return this.fetchLobsters(source, window);
    throw new ConnectorError(`unsupported community API: ${host}`, 'PARSE_ERROR', false);
  }

  private async fetchHackerNews(
    source: Source,
    window: { start: string; end: string },
  ): Promise<CollectorResult> {
    const ids = await this.fetchJson<number[]>(source.url);
    if (!Array.isArray(ids)) {
      throw new ConnectorError('hacker news feed is not an array', 'PARSE_ERROR', false);
    }

    const stories = await Promise.all(
      ids.slice(0, HN_ITEM_LIMIT).map((id) =>
        this.fetchJson<HackerNewsStory>(`https://hacker-news.firebaseio.com/v0/item/${id}.json`),
      ),
    );
    const items = stories.flatMap((story) => {
      if (
        !story || story.type !== 'story' || story.deleted || story.dead ||
        !story.id || !story.title || !story.time || (story.score ?? 0) < HN_MIN_SCORE
      ) return [];
      const publishedAt = new Date(story.time * 1000).toISOString();
      if (!isInWindow(publishedAt, window)) return [];
      const discussionUrl = `https://news.ycombinator.com/item?id=${story.id}`;
      return [this.toRawItem(source, {
        externalId: String(story.id),
        platform: 'hackernews',
        community: 'Hacker News',
        title: story.title,
        link: canonicalUrl(story.url ?? discussionUrl),
        discussionUrl,
        content: story.text ?? '',
        publishedAt,
        author: story.by ?? 'unknown',
        score: story.score ?? 0,
        commentCount: story.descendants ?? 0,
        tags: [],
      })];
    });

    log.info({ source: source.id, collected: items.length }, 'hacker news fetch done');
    return { items, newCursor: items.at(0)?.externalId ?? source.config.cursor, newEtag: null };
  }

  private async fetchLobsters(
    source: Source,
    window: { start: string; end: string },
  ): Promise<CollectorResult> {
    const stories = await this.fetchJson<LobstersStory[]>(source.url);
    if (!Array.isArray(stories)) {
      throw new ConnectorError('lobsters feed is not an array', 'PARSE_ERROR', false);
    }
    const items = stories.slice(0, LOBSTERS_ITEM_LIMIT).flatMap((story) => {
      const externalId = story.short_id;
      if (!externalId || !story.title || !story.created_at || (story.score ?? 0) < LOBSTERS_MIN_SCORE) return [];
      const publishedAt = new Date(story.created_at).toISOString();
      if (Number.isNaN(Date.parse(publishedAt)) || !isInWindow(publishedAt, window)) return [];
      const discussionUrl = story.comments_url ?? `https://lobste.rs/s/${externalId}`;
      return [this.toRawItem(source, {
        externalId,
        platform: 'lobsters',
        community: 'Lobsters',
        title: story.title,
        link: canonicalUrl(story.url ?? discussionUrl),
        discussionUrl,
        content: story.description ?? '',
        publishedAt,
        author: story.submitter_user?.username ?? 'unknown',
        score: story.score ?? 0,
        commentCount: story.comment_count ?? 0,
        tags: story.tags ?? [],
      })];
    });

    log.info({ source: source.id, collected: items.length }, 'lobsters fetch done');
    return { items, newCursor: items.at(0)?.externalId ?? source.config.cursor, newEtag: null };
  }

  private toRawItem(source: Source, item: {
    externalId: string;
    platform: string;
    community: string;
    title: string;
    link: string;
    discussionUrl: string;
    content: string;
    publishedAt: string;
    author: string;
    score: number;
    commentCount: number;
    tags: string[];
  }): RawItem {
    return {
      id: deterministicId('raw', source.id, item.externalId),
      sourceId: source.id,
      externalId: item.externalId,
      contentHash: contentHash(`${item.externalId}|${item.title}|${item.link}`),
      capturedAt: new Date().toISOString(),
      payload: { kind: 'community', ...item },
    };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'ai-tech-radar' },
      });
    } catch (error) {
      throw new ConnectorError(`community network error: ${(error as Error).message}`, 'NETWORK', true);
    }
    if (!response.ok) {
      throw new ConnectorError(`community API ${response.status}`, 'NETWORK', response.status >= 500 || response.status === 429);
    }
    try {
      return await response.json() as T;
    } catch {
      throw new ConnectorError('community API returned invalid JSON', 'PARSE_ERROR', false);
    }
  }
}
