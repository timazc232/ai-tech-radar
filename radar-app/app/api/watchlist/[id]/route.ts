import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pauseTopicSources, removeSource, setSourceStatus, WatchlistError } from '@/modules/watchlist/service';

export const dynamic = 'force-dynamic';

const PatchBody = z.object({
  status: z.enum(['active', 'paused']),
  scope: z.enum(['source', 'topic']).default('source'),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: id } },
      { status: 400 },
    );
  }
  try {
    if (parsed.data.scope === 'topic') {
      const n = pauseTopicSources(id, parsed.data.status);
      return NextResponse.json({ data: { topicId: id, updated: n, status: parsed.data.status } });
    }
    const item = setSourceStatus(id, parsed.data.status);
    return NextResponse.json({ data: item });
  } catch (err) {
    if (err instanceof WatchlistError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, requestId: id } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: (err as Error).message, requestId: id } }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = removeSource(id);
    return NextResponse.json({ data: result });
  } catch (err) {
    if (err instanceof WatchlistError) {
      return NextResponse.json({ error: { code: err.code, message: err.message, requestId: id } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL', message: (err as Error).message, requestId: id } }, { status: 500 });
  }
}
