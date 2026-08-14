import { describe, it, expect } from 'vitest';
import { extractListingArticles, parseFlexibleDate } from '@/connectors/listing';

describe('parseFlexibleDate', () => {
  it('parses ISO and English dates to UTC midnight', () => {
    expect(parseFlexibleDate('Date: 2026-08-12')).toBe('2026-08-12T00:00:00.000Z');
    expect(parseFlexibleDate('Aug 12, 2026')).toBe('2026-08-12T00:00:00.000Z');
    expect(parseFlexibleDate('August 12, 2026 extra')).toBe('2026-08-12T00:00:00.000Z');
  });
});

describe('extractListingArticles', () => {
  it('extracts x.ai-style news cards', () => {
    const html = `
      <main>
        <a href="/news/grok-4-6">Introducing Grok 4.6 Aug 12, 2026 Grok 4.6 builds on Grok 4.5</a>
        <a href="/news/introducing-grok-bot">Introducing Grok Bot Aug 11, 2026</a>
        <a href="/about">About</a>
      </main>`;
    const items = extractListingArticles(html, 'https://x.ai/news');
    expect(items.some((i) => i.title.includes('Grok 4.6'))).toBe(true);
    const grok = items.find((i) => i.url.includes('grok-4-6'));
    expect(grok?.publishedAt.startsWith('2026-08-12')).toBe(true);
  });

  it('extracts DeepSeek changelog dated sections', () => {
    const html = `
      <article>
        <h2 id="date-2026-08-13">Date: 2026-08-13</h2>
        <h3>DeepSeek-V4-Pro</h3>
        <p>Official release of DeepSeek-V4-Pro API.</p>
        <h2 id="date-2026-07-31">Date: 2026-07-31</h2>
        <h3>DeepSeek-V4-Flash Update</h3>
        <p>Flash public beta.</p>
      </article>`;
    const items = extractListingArticles(html, 'https://api-docs.deepseek.com/updates/');
    expect(items.length).toBe(2);
    expect(items[0].title).toMatch(/V4-Pro/);
    expect(items[0].publishedAt.startsWith('2026-08-13')).toBe(true);
  });
});
