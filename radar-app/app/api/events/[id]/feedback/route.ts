import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, tx } from '@/db/client';
import { feedback, event, profileWeights, source } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { applyFeedback, DEFAULT_WEIGHTS, type DimensionWeights } from '@/modules/feedback/engine';
import { isLearningPaused, recordFeedbackMemory } from '@/modules/memory/service';
import { randomId } from '@/lib/hash';

const Body = z.object({
  action: z.enum(['useful', 'irrelevant', 'save', 'later']),
  reason: z.string().max(200).optional(),
  clientRequestId: z.string().min(8),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: id } },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // idempotency: same clientRequestId returns existing
  const existing = db()
    .select()
    .from(feedback)
    .where(eq(feedback.clientRequestId, body.clientRequestId))
    .get();
  if (existing) {
    if (existing.eventId !== id || existing.action !== body.action) {
      return NextResponse.json(
        { error: { code: 'IDEMPOTENT_CONFLICT', message: 'request id reused', requestId: id } },
        { status: 409 },
      );
    }
    return NextResponse.json({ data: existing });
  }

  const ev = db().select().from(event).where(eq(event.id, id)).get();
  if (!ev) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'event', requestId: id } },
      { status: 404 },
    );
  }

  // load current weights
  const pw = db().select().from(profileWeights).where(eq(profileWeights.profileId, 'local')).get();
  const current: DimensionWeights = pw
    ? {
        relevance: pw.relevance ?? 1.0,
        impact: pw.impact ?? 1.0,
        novelty: pw.novelty ?? 1.0,
        credibility: pw.credibility ?? 1.0,
        urgency: pw.urgency ?? 1.0,
      }
    : DEFAULT_WEIGHTS;

  // source noise count (§8.1)
  const srcRow = db().select().from(source).where(eq(source.entityId, ev.entityId)).all();
  const sourceIrrelevantCount = srcRow.length
    ? db().select().from(feedback).all().filter((f) => f.action === 'irrelevant').length
    : 0;

  const paused = isLearningPaused();
  const { newWeights, delta } = paused
    ? { newWeights: current, delta: {} as Record<string, number> }
    : applyFeedback(
      { action: body.action, eventId: id },
      current,
      { sourceIrrelevantCount },
    );

  const fbId = randomId('fb');
  tx((txn) => {
    txn.insert(feedback).values({
      id: fbId,
      eventId: id,
      action: body.action,
      reason: body.reason ?? null,
      weightDelta: delta,
      clientRequestId: body.clientRequestId,
      createdAt: new Date().toISOString(),
    }).run();
    if (!paused) {
      txn.update(profileWeights).set({
        relevance: newWeights.relevance,
        impact: newWeights.impact,
        novelty: newWeights.novelty,
        credibility: newWeights.credibility,
        urgency: newWeights.urgency,
        updatedAt: new Date().toISOString(),
      }).where(eq(profileWeights.profileId, 'local')).run();
    }
  });

  recordFeedbackMemory({
    feedbackId: fbId,
    eventId: id,
    action: body.action,
    reason: body.reason,
    delta,
  });

  return NextResponse.json({ data: { id: fbId, applied: true, delta, learningPaused: paused } });
}
