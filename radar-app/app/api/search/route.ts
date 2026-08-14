import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { entity, event, intelligenceCard, scoreSnapshot } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ftsRecall } from '@/db/fts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ data: { q, events: [] } });
  }
  const hits = ftsRecall(q, 20);
  const events = hits.map((h) => {
    const ev = db().select().from(event).where(eq(event.id, h.id)).get();
    if (!ev) return null;
    const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
    const sc = db().select().from(scoreSnapshot).where(eq(scoreSnapshot.eventId, ev.id)).all().at(-1);
    const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, ev.id)).get();
    return {
      id: ev.id,
      title: ev.title,
      type: ev.type,
      occurredAt: ev.occurredAt,
      entityName: ent?.name ?? '?',
      total: sc?.total ?? 0,
      why: card?.whyItMatters,
      rank: h.rank,
    };
  }).filter(Boolean);
  return NextResponse.json({ data: { q, events } });
}
