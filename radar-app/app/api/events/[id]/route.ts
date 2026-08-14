import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { event, scoreSnapshot, eventEvidence, entity, source, intelligenceCard } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = db().select().from(event).where(eq(event.id, id)).get();
  if (!ev) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'event', requestId: id } }, { status: 404 });
  }
  const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
  const scores = db().select().from(scoreSnapshot).where(eq(scoreSnapshot.eventId, id)).all();
  const latestScore = scores.at(-1);
  const evidence = db().select().from(eventEvidence).where(eq(eventEvidence.eventId, id)).all();
  const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, id)).get();
  const src = ent ? db().select().from(source).where(eq(source.entityId, ent.id)).all() : [];

  return NextResponse.json({
    data: {
      id: ev.id,
      title: ev.title,
      type: ev.type,
      occurredAt: ev.occurredAt,
      status: ev.status,
      backfill: ev.backfill,
      entity: ent,
      sources: src,
      facts: ev.factsJson,
      score: latestScore,
      evidence,
      card,
    },
  });
}
