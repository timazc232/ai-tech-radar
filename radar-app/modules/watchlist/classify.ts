import { canonicalUrl, parseGitHubUrl } from '@/lib/url';

export type ClassifiedSourceType = 'github_release' | 'github_repo' | 'rss' | 'web';
export type ClassifiedEntityType = 'repo' | 'company' | 'page';

export interface ClassifiedSource {
  type: ClassifiedSourceType;
  entityName: string;
  entityType: ClassifiedEntityType;
  canonicalUrl: string;
}

const RSS_PATH = /(?:^|\/)(feed|rss|atom)(?:[./]|$)/i;
const RSS_EXT = /\.(rss|atom|xml)$/i;

/** Infer collector type + entity from a pasted URL (§2.1 / §9.5). */
export function classifySourceUrl(raw: string): ClassifiedSource {
  const trimmed = raw.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const canon = canonicalUrl(withProto);
  const u = new URL(canon);
  const host = u.hostname.replace(/^www\./i, '').toLowerCase();

  if (host === 'github.com' || host === 'www.github.com') {
    const { owner, repo, kind } = parseGitHubUrl(canon);
    return {
      type: kind === 'release' ? 'github_release' : 'github_repo',
      entityName: repo,
      entityType: 'repo',
      canonicalUrl: `https://github.com/${owner}/${repo}${kind === 'release' ? '/releases' : ''}`,
    };
  }

  const path = u.pathname;
  const format = u.searchParams.get('format') ?? '';
  if (RSS_PATH.test(path) || RSS_EXT.test(path) || /^(rss|atom|xml)$/i.test(format)) {
    return {
      type: 'rss',
      entityName: host.split('.')[0] || host,
      entityType: 'company',
      canonicalUrl: canon,
    };
  }

  return {
    type: 'web',
    entityName: host.split('.')[0] || host,
    entityType: 'page',
    canonicalUrl: canon,
  };
}
