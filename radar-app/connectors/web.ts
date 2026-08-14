import * as cheerio from 'cheerio';
import type { Collector, CollectorResult } from './types';
import type { Source, RawItem } from '@/modules/domain/schema';
import { assertSafeUrl, canonicalUrl } from '@/lib/url';
import { contentHash, deterministicId } from '@/lib/hash';
import { isInWindow } from '@/lib/time';
import { log } from '@/lib/logger';
import { extractListingArticles } from './listing';

/**
 * Web change collector with 3-layer anti-false-positive (§6.1, A7, T-18).
 * Layer 1: content hash unchanged -> skip
 * Layer 2: diff ratio < 5% -> skip (noise)
 * Layer 3: boilerplate/template filtering -> only significant hunks emit an event
 */
const DIFF_RATIO_THRESHOLD = 0.05;

export class WebCollector implements Collector {
  async fetch(source: Source, window: { start: string; end: string }): Promise<CollectorResult> {
    assertSafeUrl(source.url);
    const html = await fetchHtml(source.url);
    const listed = extractListingArticles(html, source.url)
      .filter((a) => isInWindow(a.publishedAt, window));
    if (listed.length > 0) {
      const items: RawItem[] = listed.map((a) => ({
        id: deterministicId('raw', source.id, a.url),
        sourceId: source.id,
        externalId: a.url,
        contentHash: contentHash(`${a.url}|${a.title}|${a.publishedAt}`),
        capturedAt: new Date().toISOString(),
        payload: {
          kind: 'web',
          title: a.title,
          canonicalUrl: a.url,
          diff: a.excerpt,
          publishedAt: a.publishedAt,
        },
      }));
      const pageHash = contentHash(extractMain(html));
      log.info({ source: source.id, listed: items.length }, 'web listing extracted');
      return { items, newCursor: pageHash, newEtag: null };
    }

    const title = extractTitle(html);
    const current = extractMain(html);
    const hash = contentHash(current);

    // Layer 1
    if (hash === source.config.cursor) {
      return { items: [], newCursor: hash, newEtag: null };
    }

    // Layer 2 (needs a previous snapshot; in this scaffold we approximate by
    // requiring a minimum absolute content length to avoid tiny-change noise)
    if (current.length < 200) {
      return { items: [], newCursor: hash, newEtag: null };
    }

    // Layer 3: filter boilerplate (dates, cookie notices, ad markers)
    const significant = filterBoilerplate(current);
    if (significant.length === 0) {
      log.debug({ source: source.id }, 'web change below significance threshold');
      return { items: [], newCursor: hash, newEtag: null };
    }

    const externalId = `web_${hash.slice(0, 12)}`;
    const item: RawItem = {
      id: deterministicId('raw', source.id, externalId),
      sourceId: source.id,
      externalId,
      contentHash: hash,
      capturedAt: new Date().toISOString(),
      payload: {
        kind: 'web',
        title,
        canonicalUrl: canonicalUrl(source.url),
        diff: significant.slice(0, 2000),
        publishedAt: new Date().toISOString(),
      },
    };
    log.info({ source: source.id, title }, 'web change detected');
    return { items: [item], newCursor: hash, newEtag: null };
  }
}

async function fetchHtml(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!resp.ok) throw new Error(`web fetch ${resp.status}`);
  return resp.text();
}

function extractMain(html: string): string {
  const $ = cheerio.load(html);
  // drop nav/footer/script/style/ads
  $('nav, footer, script, style, noscript, .cookie, .ad, iframe').remove();
  return $('main, article, .content, body').first().text().replace(/\s+/g, ' ').trim();
}

/** Best-effort page headline: <h1> > og:title > <title>, cleaned & length-capped. */
function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  const candidates = [
    $('h1').first().text(),
    $('meta[property="og:title"]').attr('content') ?? '',
    $('title').first().text(),
  ];
  for (const c of candidates) {
    const t = c.replace(/\s+/g, ' ').trim();
    if (t.length >= 4) return t.slice(0, 200);
  }
  return '';
}

function filterBoilerplate(text: string): string {
  // remove obvious template/noise tokens
  const noise = /cookie|©|copyright|all rights reserved|privacy policy|subscribe|sign up|log in/gi;
  const cleaned = text.replace(noise, ' ').replace(/\s+/g, ' ').trim();
  return cleaned;
}

export function computeDiffRatio(prev: string, curr: string): number {
  // simplified char-level diff ratio (Levenshtein-ish via length delta + common prefix)
  if (!prev) return 1;
  const maxLen = Math.max(prev.length, curr.length);
  let common = 0;
  const minLen = Math.min(prev.length, curr.length);
  for (let i = 0; i < minLen; i++) {
    if (prev[i] === curr[i]) common++;
    else break;
  }
  return 1 - common / maxLen;
}

export const DIFF_THRESHOLD = DIFF_RATIO_THRESHOLD;
