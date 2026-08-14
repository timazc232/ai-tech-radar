import * as cheerio from 'cheerio';
import { canonicalUrl } from '@/lib/url';

export interface ListingArticle {
  title: string;
  url: string;
  publishedAt: string;
  excerpt: string;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

const MDY = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),\s+(\d{4})\b/i;
const ISO = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
const NEWS_HREF = /\/(news|blog|posts?|updates?|changelog|release-notes|announcements?)\b/i;

export function parseFlexibleDate(raw: string): string | null {
  const iso = raw.match(ISO);
  if (iso) {
    const d = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const mdy = raw.match(MDY);
  if (mdy) {
    const month = MONTHS[mdy[1].toLowerCase()];
    if (!month) return null;
    const d = new Date(Date.UTC(Number(mdy[3]), month - 1, Number(mdy[2])));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function absUrl(href: string, pageUrl: string): string | null {
  try {
    return canonicalUrl(new URL(href, pageUrl).toString());
  } catch {
    return null;
  }
}

/** DeepSeek / Docusaurus changelog: "## Date: YYYY-MM-DD" then "### Title". */
export function extractChangelogSections(html: string, pageUrl: string): ListingArticle[] {
  const $ = cheerio.load(html);
  const out: ListingArticle[] = [];
  $('h2').each((_, el) => {
    const heading = $(el).text().replace(/\s+/g, ' ').trim();
    const publishedAt = parseFlexibleDate(heading);
    if (!publishedAt) return;
    let title = '';
    let excerpt = '';
    $(el).nextUntil('h2').each((__, node) => {
      const tag = (node as { tagName?: string }).tagName?.toLowerCase();
      if (tag === 'h3' && !title) title = $(node).text().replace(/\s+/g, ' ').trim();
      else if (tag === 'p' || tag === 'ul' || tag === 'ol') {
        excerpt += ` ${$(node).text().replace(/\s+/g, ' ').trim()}`;
      }
    });
    if (!title) title = heading.replace(/^date:\s*/i, '').trim();
    const id = $(el).attr('id') || publishedAt.slice(0, 10);
    out.push({
      title: title.slice(0, 200),
      url: `${pageUrl.replace(/#.*$/, '').replace(/\/$/, '')}#${id}`,
      publishedAt,
      excerpt: excerpt.trim().slice(0, 800),
    });
  });
  return dedupe(out);
}

/** Generic news listing: dated links under /news /blog /updates. */
export function extractNewsLinks(html: string, pageUrl: string): ListingArticle[] {
  const $ = cheerio.load(html);
  $('nav, footer, header, script, style, noscript').remove();
  const out: ListingArticle[] = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!NEWS_HREF.test(href) || href.startsWith('#')) return;
    const url = absUrl(href, pageUrl);
    if (!url || url === canonicalUrl(pageUrl)) return;
    const title = $(el).text().replace(/\s+/g, ' ').trim();
    if (title.length < 6 || title.length > 220) return;
    const ctx = ($(el).closest('article, li, section, div').first().text() || $(el).parent().text())
      .replace(/\s+/g, ' ')
      .trim();
    const publishedAt = parseFlexibleDate(ctx) ?? parseFlexibleDate($(el).parent().text());
    if (!publishedAt) return;
    out.push({
      title,
      url,
      publishedAt,
      excerpt: ctx.slice(0, 400),
    });
  });
  return dedupe(out);
}

export function extractListingArticles(html: string, pageUrl: string): ListingArticle[] {
  const changelog = extractChangelogSections(html, pageUrl);
  if (changelog.length >= 2) return changelog;
  const links = extractNewsLinks(html, pageUrl);
  if (links.length > 0) return links;
  return changelog;
}

function dedupe(items: ListingArticle[]): ListingArticle[] {
  const seen = new Set<string>();
  const out: ListingArticle[] = [];
  for (const it of items) {
    const key = `${it.url}|${it.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}
