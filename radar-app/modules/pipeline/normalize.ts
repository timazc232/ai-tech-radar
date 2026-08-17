import type { RawItem, EventCandidate, Fact } from '@/modules/domain/schema';
import { canonicalUrl } from '@/lib/url';

/** §6.4/6.5 normalize a raw item into an event candidate. */
export function normalize(raw: RawItem, source: { type: string; url: string; entityId: string | null }): EventCandidate {
  const payload = raw.payload as Record<string, unknown>;
  const { title, occurredAt, facts, entityName, canonical } = extractByType(payload, source);
  return {
    title,
    entityName,
    canonicalUrl: canonical,
    facts,
    occurredAt,
    rawItemId: raw.id,
    sourceId: raw.sourceId,
    entityId: source.entityId ?? `ent_${entityName}`,
  };
}

function extractByType(payload: Record<string, unknown>, source: { type: string; url: string }): {
  title: string;
  occurredAt: string;
  facts: Fact[];
  entityName: string;
  canonical: string;
} {
  if (payload.kind === 'github_release' || payload.kind === 'github_repo' || payload.kind === 'release' || payload.kind === 'repo') {
    const release = payload.release as Record<string, unknown>;
    const tag = (release.tag_name as string) ?? '';
    const name = (release.name as string) ?? '';
    // Auto-generated releases often have name === tag or empty; build a readable title
    // like "llama.cpp b10330 released" so the radar card isn't just a bare build number.
    let title: string;
    if (name.trim() && name.trim() !== tag.trim()) {
      title = name.trim();
    } else {
      const repo = source.url.match(/github\.com\/[^/]+\/([^/]+)/)?.[1] ?? '';
      title = repo ? `${repo} ${tag} released`.trim() : (tag || 'release');
    }
    const occurredAt = (release.published_at as string) ?? (release.pushed_at as string) ?? new Date().toISOString();
    const htmlUrl = (release.html_url as string) ?? source.url;
    const facts: Fact[] = [
      { key: 'tag', value: tag },
      { key: 'prerelease', value: String(release.prerelease ?? false) },
      { key: 'url', value: canonicalUrl(htmlUrl) },
    ];
    const owner = (payload.owner as string) ?? '';
    const repo = (payload.repo as string) ?? '';
    if (owner) facts.push({ key: 'owner', value: owner });
    if (repo) facts.push({ key: 'repo', value: repo });
    if (release.body) facts.push({ key: 'notes', value: (release.body as string).slice(0, 500) });
    return {
      title,
      occurredAt,
      facts,
      entityName: (payload.owner as string) ?? '',
      canonical: canonicalUrl(htmlUrl),
    };
  }
  if (payload.kind === 'rss') {
    const title = (payload.title as string) ?? '(untitled)';
    const occurredAt = (payload.publishedAt as string) ?? new Date().toISOString();
    const link = (payload.link as string) ?? source.url;
    const facts: Fact[] = [
      { key: 'link', value: link },
      { key: 'author', value: (payload.author as string) ?? 'unknown' },
    ];
    return {
      title,
      occurredAt,
      facts,
      entityName: extractEntityFromUrl(source.url),
      canonical: canonicalUrl(link),
    };
  }
  if (payload.kind === 'web') {
    const title = (payload.title as string) || `Change on ${extractEntityFromUrl(source.url)}`;
    const occurredAt = (payload.publishedAt as string) ?? new Date().toISOString();
    const facts: Fact[] = [
      { key: 'diff', value: ((payload.diff as string) ?? '').slice(0, 500) },
      { key: 'url', value: (payload.canonicalUrl as string) ?? source.url },
    ];
    return {
      title,
      occurredAt,
      facts,
      entityName: extractEntityFromUrl(source.url),
      canonical: (payload.canonicalUrl as string) ?? canonicalUrl(source.url),
    };
  }
  if (payload.kind === 'community') {
    const title = (payload.title as string) ?? '(untitled)';
    const link = (payload.link as string) ?? source.url;
    const discussionUrl = (payload.discussionUrl as string) ?? link;
    const community = (payload.community as string) ?? extractEntityFromUrl(source.url);
    const facts: Fact[] = [
      { key: 'source', value: community },
      { key: 'author', value: (payload.author as string) ?? 'unknown' },
      { key: 'score', value: String(payload.score ?? 0) },
      { key: 'comments', value: String(payload.commentCount ?? 0) },
      { key: 'discussion', value: discussionUrl },
    ];
    const tags = Array.isArray(payload.tags) ? payload.tags.filter((tag): tag is string => typeof tag === 'string') : [];
    if (tags.length) facts.push({ key: 'tags', value: tags.join(', ') });
    if (payload.content) facts.push({ key: 'summary', value: String(payload.content).slice(0, 500) });
    return {
      title,
      occurredAt: (payload.publishedAt as string) ?? new Date().toISOString(),
      facts,
      entityName: community,
      canonical: canonicalUrl(link),
    };
  }
  // fallback
  const title = (payload.title as string) ?? 'event';
  return {
    title,
    occurredAt: (payload.publishedAt as string) ?? new Date().toISOString(),
    facts: [],
    entityName: extractEntityFromUrl(source.url),
    canonical: canonicalUrl(source.url),
  };
}

function extractEntityFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
    if (u.hostname.includes('github.com') && parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}
