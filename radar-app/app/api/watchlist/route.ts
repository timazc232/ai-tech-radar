import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { addSource, listTopics, listWatchlist, WatchlistError } from '@/modules/watchlist/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    data: {
      sources: listWatchlist(),
      topics: listTopics(),
    },
  });
}

const Body = z.object({
  url: z.string().min(8).max(500),
  name: z.string().max(80).optional(),
  topicId: z.string().max(64).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'watchlist' } },
      { status: 400 },
    );
  }
  try {
    const result = await addSource(parsed.data);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    if (err instanceof WatchlistError) {
      const status = err.code === 'DUPLICATE' ? 409 : err.code === 'NOT_FOUND' ? 404 : 400;
      return NextResponse.json({ error: { code: err.code, message: err.message, requestId: 'watchlist' } }, { status });
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: (err as Error).message, requestId: 'watchlist' } },
      { status: 500 },
    );
  }
}
