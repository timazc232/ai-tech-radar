import Parser from 'rss-parser';
import type { Collector, CollectorResult } from './types';
import type { Source, RawItem } from '@/modules/domain/schema';
import { canonicalUrl } from '@/lib/url';
import { contentHash, deterministicId } from '@/lib/hash';
import { isInWindow } from '@/lib/time';
import { log } from '@/lib/logger';

// Browser-like UA + longer timeout: many feeds block the default UA or are slow
// to first byte. 30s tolerates slow origins without thrashing the daily run.
const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
  },
});

/** RSS/Atom collector (T-17). */
export class RSSCollector implements Collector {
  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    const feed = await parser.parseURL(source.url);
    const items: RawItem[] = [];
    for (const it of feed.items ?? []) {
      const ts = it.isoDate ?? it.pubDate;
      if (!ts) continue;
      const iso = new Date(ts).toISOString();
      if (!isInWindow(iso, window)) continue;
      const guid = it.guid ?? it.link ?? iso;
      const title = it.title ?? '(untitled)';
      const cHash = contentHash(`${guid}|${title}|${it.contentSnippet ?? ''}`);
      items.push({
        id: deterministicId('raw', source.id, guid),
        sourceId: source.id,
        externalId: String(guid),
        contentHash: cHash,
        capturedAt: new Date().toISOString(),
        payload: {
          kind: 'rss',
          title,
          link: it.link ? canonicalUrl(it.link) : null,
          content: it.contentSnippet ?? it.content ?? '',
          publishedAt: iso,
          author: it.creator ?? it.author,
        },
      });
    }
    log.info({ source: source.id, collected: items.length }, 'rss fetch done');
    return { items, newCursor: null, newEtag: null };
  }
}
