import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { source, entity } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sources = db().select().from(source).all();
  const health = sources.map((s) => {
    const ent = s.entityId ? db().select().from(entity).where(eq(entity.id, s.entityId)).get() : null;
    return {
      id: s.id,
      type: s.type,
      url: s.url,
      status: s.status,
      entity: ent?.name,
      topicId: s.topicId,
      lastFetchedAt: s.lastFetchedAt,
      lastError: s.lastError,
    };
  });
  const summary = {
    total: health.length,
    active: health.filter((h) => h.status === 'active').length,
    error: health.filter((h) => h.status === 'error').length,
    paused: health.filter((h) => h.status === 'paused').length,
  };
  return NextResponse.json({ data: { summary, sources: health } });
}
