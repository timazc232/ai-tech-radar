import { createHash, randomBytes } from 'node:crypto';

/** Content hash for dedup (§6.3). Hash of normalized content. */
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex').slice(0, 32);
}

/** Stable id from a prefix + deterministic inputs. */
export function deterministicId(prefix: string, ...parts: string[]): string {
  const h = createHash('sha1').update(parts.join('|'), 'utf8').digest('hex').slice(0, 12);
  return `${prefix}_${h}`;
}

/** Random id (for request/lease ids). Uses crypto, not Math.random. */
export function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString('hex')}`;
}
