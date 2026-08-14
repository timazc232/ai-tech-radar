import { db } from '@/db/client';
import { event, feedback, memory, profileWeights, topic } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { Memory } from '@/modules/domain/schema';
import { decayMemory } from './decay';
import { log } from '@/lib/logger';
import { deterministicId } from '@/lib/hash';
import { rollbackFeedback, DEFAULT_WEIGHTS, type DimensionWeights } from '@/modules/feedback/engine';
import { getSetting, setSetting } from '@/lib/settings';

/** Apply decay to all active memories; persists changed rows. */
export function runDecay(now: Date = new Date()): { processed: number; updated: number } {
  const all = db().select().from(memory).all();
  let updated = 0;
  for (const row of all) {
    if (row.status !== 'active') continue;
    const mem = rowToMemory(row);
    const decayed = decayMemory(mem, now);
    if (decayed.updatedAt !== mem.updatedAt || decayed.status !== mem.status) {
      db().update(memory)
        .set({
          content: decayed.content,
          status: decayed.status,
          updatedAt: decayed.updatedAt,
        })
        .where(eq(memory.id, mem.id))
        .run();
      updated++;
    }
  }
  log.info({ processed: all.length, updated }, 'memory decay done');
  return { processed: all.length, updated };
}

export function rowToMemory(row: typeof memory.$inferSelect): Memory {
  return {
    id: row.id,
    type: row.type as Memory['type'],
    content: row.content as Record<string, unknown>,
    evidence: row.evidence as string[],
    confidence: row.confidence,
    expiresAt: row.expiresAt,
    status: row.status as Memory['status'],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function isLearningPaused(): boolean {
  return getSetting('learning_paused') === '1';
}

export function setLearningPaused(paused: boolean): void {
  setSetting('learning_paused', paused ? '1' : '0');
}

/** Seed one interest memory per topic if none exist. */
export function ensureInterestMemories(): void {
  const existing = db().select().from(memory).where(eq(memory.type, 'interest')).get();
  if (existing) return;
  const now = new Date().toISOString();
  for (const t of db().select().from(topic).all()) {
    db().insert(memory).values({
      id: deterministicId('mem', 'interest', t.id),
      type: 'interest',
      content: { topicId: t.id, name: t.name, weight: 0.7, base: 0.7, source: 'explicit' },
      evidence: [],
      confidence: 0.8,
      expiresAt: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().run();
  }
}

export function listMemories(type?: Memory['type']): Memory[] {
  ensureInterestMemories();
  const rows = type
    ? db().select().from(memory).where(eq(memory.type, type)).orderBy(desc(memory.updatedAt)).all()
    : db().select().from(memory).orderBy(desc(memory.updatedAt)).all();
  return rows.map(rowToMemory);
}

export function getMemory(id: string): Memory | null {
  const row = db().select().from(memory).where(eq(memory.id, id)).get();
  return row ? rowToMemory(row) : null;
}

export function createMemory(input: {
  type: Memory['type'];
  content: Record<string, unknown>;
  evidence?: string[];
  confidence?: number;
  expiresAt?: string | null;
}): Memory {
  const now = new Date().toISOString();
  const id = deterministicId('mem', input.type, JSON.stringify(input.content), now);
  db().insert(memory).values({
    id,
    type: input.type,
    content: input.content,
    evidence: input.evidence ?? [],
    confidence: input.confidence ?? 0.7,
    expiresAt: input.expiresAt ?? null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();
  return getMemory(id)!;
}

export function updateMemory(id: string, patch: {
  content?: Record<string, unknown>;
  status?: Memory['status'];
  confidence?: number;
  expiresAt?: string | null;
}): Memory {
  const row = db().select().from(memory).where(eq(memory.id, id)).get();
  if (!row) throw new Error('memory not found');
  const content = patch.content ? { ...(row.content as Record<string, unknown>), ...patch.content } : row.content;
  db().update(memory).set({
    content,
    status: patch.status ?? row.status,
    confidence: patch.confidence ?? row.confidence,
    expiresAt: patch.expiresAt === undefined ? row.expiresAt : patch.expiresAt,
    updatedAt: new Date().toISOString(),
  }).where(eq(memory.id, id)).run();
  return getMemory(id)!;
}

export function recordFeedbackMemory(opts: {
  feedbackId: string;
  eventId: string;
  action: string;
  reason?: string;
  delta: Record<string, number>;
}): Memory {
  const ev = db().select().from(event).where(eq(event.id, opts.eventId)).get();
  const effect = Object.entries(opts.delta)
    .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v.toFixed(3)}`)
    .join(', ') || '无权重变化';
  return createMemory({
    type: 'feedback',
    content: {
      feedbackId: opts.feedbackId,
      eventId: opts.eventId,
      eventTitle: ev?.title ?? opts.eventId,
      action: opts.action,
      reason: opts.reason ?? null,
      delta: opts.delta,
      effect,
    },
    evidence: [opts.eventId],
    confidence: 0.9,
  });
}

export function forgetMemory(id: string): { rolledBack: boolean } {
  const mem = getMemory(id);
  if (!mem) throw new Error('memory not found');

  let rolledBack = false;
  if (mem.type === 'feedback') {
    const delta = (mem.content.delta as Record<string, number> | undefined) ?? {};
    if (Object.keys(delta).length > 0) {
      const pw = db().select().from(profileWeights).where(eq(profileWeights.profileId, 'local')).get();
      const current: DimensionWeights = pw
        ? {
            relevance: pw.relevance ?? 1,
            impact: pw.impact ?? 1,
            novelty: pw.novelty ?? 1,
            credibility: pw.credibility ?? 1,
            urgency: pw.urgency ?? 1,
          }
        : { ...DEFAULT_WEIGHTS };
      const rolled = rollbackFeedback(delta, current);
      db().update(profileWeights).set({
        ...rolled,
        updatedAt: new Date().toISOString(),
      }).where(eq(profileWeights.profileId, 'local')).run();
      rolledBack = true;
    }
  }

  db().delete(memory).where(eq(memory.id, id)).run();
  return { rolledBack };
}

export function loadCurrentWeights(): DimensionWeights {
  const pw = db().select().from(profileWeights).where(eq(profileWeights.profileId, 'local')).get();
  if (!pw) return { ...DEFAULT_WEIGHTS };
  return {
    relevance: pw.relevance ?? 1,
    impact: pw.impact ?? 1,
    novelty: pw.novelty ?? 1,
    credibility: pw.credibility ?? 1,
    urgency: pw.urgency ?? 1,
  };
}

export function listInbox(action: 'save' | 'later') {
  const rows = db()
    .select()
    .from(feedback)
    .where(eq(feedback.action, action))
    .orderBy(desc(feedback.createdAt))
    .all();
  return rows.map((f) => {
    const ev = db().select().from(event).where(eq(event.id, f.eventId)).get();
    return {
      feedbackId: f.id,
      eventId: f.eventId,
      action: f.action,
      reason: f.reason,
      createdAt: f.createdAt,
      title: ev?.title ?? f.eventId,
      type: ev?.type ?? '',
      occurredAt: ev?.occurredAt ?? '',
    };
  });
}
