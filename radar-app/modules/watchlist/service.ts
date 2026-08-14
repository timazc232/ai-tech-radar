import { db } from '@/db/client';
import { entity, event, source, topic } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { assertSafeUrl, parseGitHubUrl, SsrfError } from '@/lib/url';
import { deterministicId } from '@/lib/hash';
import { effectiveGitHubToken } from '@/lib/settings';
import { classifySourceUrl, type ClassifiedSource } from './classify';

export class WatchlistError extends Error {
  constructor(
    public code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DUPLICATE',
    message: string,
  ) {
    super(message);
    this.name = 'WatchlistError';
  }
}

export interface WatchlistItem {
  id: string;
  type: string;
  url: string;
  status: string;
  entityId: string | null;
  entityName: string | null;
  entityType: string | null;
  topicId: string | null;
  topicName: string | null;
  lastFetchedAt: string | null;
  lastError: string | null;
  eventCount: number;
}

export function listWatchlist(): WatchlistItem[] {
  const sources = db().select().from(source).all();
  const topics = new Map(db().select().from(topic).all().map((t) => [t.id, t.name]));
  return sources.map((s) => {
    const ent = s.entityId ? db().select().from(entity).where(eq(entity.id, s.entityId)).get() : null;
    const eventCount = s.entityId
      ? (db().select({ n: sql<number>`count(*)` }).from(event).where(eq(event.entityId, s.entityId)).get()?.n ?? 0)
      : 0;
    return {
      id: s.id,
      type: s.type,
      url: s.url,
      status: s.status ?? 'active',
      entityId: s.entityId,
      entityName: ent?.name ?? null,
      entityType: ent?.type ?? null,
      topicId: s.topicId,
      topicName: s.topicId ? topics.get(s.topicId) ?? null : null,
      lastFetchedAt: s.lastFetchedAt,
      lastError: s.lastError,
      eventCount: Number(eventCount),
    };
  });
}

export function listTopics() {
  return db().select().from(topic).all();
}

export interface AddSourceInput {
  url: string;
  name?: string;
  topicId?: string;
}

export interface AddSourceResult {
  source: WatchlistItem;
  classified: ClassifiedSource;
  warning?: string;
}

/** Add a source after URL classify + SSRF check. Probe is best-effort. */
export async function addSource(input: AddSourceInput): Promise<AddSourceResult> {
  let classified: ClassifiedSource;
  try {
    classified = classifySourceUrl(input.url);
    assertSafeUrl(classified.canonicalUrl);
  } catch (err) {
    if (err instanceof SsrfError) throw new WatchlistError('VALIDATION_ERROR', err.message);
    throw new WatchlistError('VALIDATION_ERROR', (err as Error).message);
  }

  const existing = db().select().from(source).all().find((s) => s.url === classified.canonicalUrl);
  if (existing) throw new WatchlistError('DUPLICATE', '该来源已在 Watchlist 中');

  const topics = listTopics();
  const topicId = input.topicId && topics.some((t) => t.id === input.topicId)
    ? input.topicId
    : (topics[0]?.id ?? null);

  const entityName = (input.name?.trim() || classified.entityName).slice(0, 80);
  const entityId = deterministicId('ent', classified.entityType, entityName.toLowerCase());
  const sourceId = deterministicId('src', classified.type, classified.canonicalUrl);

  const probeWarning = await probeSource(classified);

  const existingEnt = db().select().from(entity).where(eq(entity.id, entityId)).get();
  if (!existingEnt) {
    db().insert(entity).values({
      id: entityId,
      type: classified.entityType,
      name: entityName,
      aliases: '[]',
      canonicalUrl: classified.canonicalUrl,
      topicId,
    }).run();
  }

  db().insert(source).values({
    id: sourceId,
    type: classified.type,
    url: classified.canonicalUrl,
    config: { noise_factor: 1.0, cursor: null, etag: null, last_modified: null },
    status: 'active',
    entityId,
    topicId,
    lastError: null,
    lastFetchedAt: null,
  }).run();

  const item = listWatchlist().find((s) => s.id === sourceId)!;
  return { source: item, classified, warning: probeWarning };
}

export function setSourceStatus(id: string, status: 'active' | 'paused'): WatchlistItem {
  const row = db().select().from(source).where(eq(source.id, id)).get();
  if (!row) throw new WatchlistError('NOT_FOUND', 'source');
  db().update(source).set({ status, lastError: status === 'active' ? null : row.lastError }).where(eq(source.id, id)).run();
  const item = listWatchlist().find((s) => s.id === id);
  if (!item) throw new WatchlistError('NOT_FOUND', 'source');
  return item;
}

export function pauseTopicSources(topicId: string, status: 'active' | 'paused'): number {
  const rows = db().select().from(source).where(eq(source.topicId, topicId)).all();
  for (const r of rows) {
    db().update(source).set({ status }).where(eq(source.id, r.id)).run();
  }
  return rows.length;
}

/** Hard-delete unused sources; otherwise pause (FK from raw_item / evidence). */
export function removeSource(id: string): { deleted: boolean; paused: boolean } {
  const row = db().select().from(source).where(eq(source.id, id)).get();
  if (!row) throw new WatchlistError('NOT_FOUND', 'source');
  try {
    db().delete(source).where(eq(source.id, id)).run();
    return { deleted: true, paused: false };
  } catch {
    db().update(source).set({ status: 'paused' }).where(eq(source.id, id)).run();
    return { deleted: false, paused: true };
  }
}

async function probeSource(classified: ClassifiedSource): Promise<string | undefined> {
  try {
    if (classified.type === 'github_release' || classified.type === 'github_repo') {
      const token = effectiveGitHubToken();
      if (!token) return '未配置 GitHub Token，采集时会失败。请到 Settings 填写。';
      const { owner, repo } = parseGitHubUrl(classified.canonicalUrl);
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'ai-tech-radar',
        },
      });
      if (resp.status === 404) return 'GitHub 仓库不存在或不可见';
      if (!resp.ok) return `GitHub 检查返回 ${resp.status}`;
      return undefined;
    }
    const resp = await fetch(classified.canonicalUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'ai-tech-radar', Accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return `来源返回 HTTP ${resp.status}，已添加但采集可能失败`;
  } catch (err) {
    return `无法探测来源：${(err as Error).message}`;
  }
  return undefined;
}
