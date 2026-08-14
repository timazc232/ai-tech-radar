import { createHash } from 'node:crypto';

/** §6.5 canonical URL: strip tracking params, drop fragment. */
export function canonicalUrl(raw: string): string {
  try {
    const u = new URL(raw);
    const strip = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      '_ga', 'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref',
    ];
    for (const k of strip) u.searchParams.delete(k);
    u.hash = '';
    // normalize trailing slash
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.replace(/\/+$/, '');
    }
    return u.toString();
  } catch {
    return raw;
  }
}

/** SSRF protection (§11.5): reject internal/loopback/metadata endpoints. */
export function assertSafeUrl(raw: string): void {
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol)) {
    throw new SsrfError(`blocked protocol: ${u.protocol}`);
  }
  const host = u.hostname.toLowerCase();
  const blocked = [
    'localhost', '127.0.0.1', '0.0.0.0', '::1',
    '169.254.169.254', // cloud metadata
    'metadata.google.internal',
  ];
  if (blocked.includes(host)) {
    throw new SsrfError(`blocked host: ${host}`);
  }
  // block private ranges
  if (/^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^192\.168\./.test(host)) {
    throw new SsrfError(`blocked private host: ${host}`);
  }
}

export class SsrfError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'SsrfError';
  }
}

/** Parse owner/repo/kind from a GitHub URL. */
export function parseGitHubUrl(url: string): { owner: string; repo: string; kind: 'release' | 'repo' } {
  const u = new URL(url);
  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/');
  const owner = parts[0];
  const repo = parts[1];
  const kind = parts[2] === 'releases' || u.pathname.includes('/releases') ? 'release' : 'repo';
  if (!owner || !repo) throw new Error(`invalid github url: ${url}`);
  return { owner, repo, kind };
}

/** sha256 hex of a string. */
export function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}
