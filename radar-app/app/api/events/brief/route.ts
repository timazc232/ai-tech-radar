import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { organizeEvents } from '@/modules/briefing/service';
import { getBriefForDate } from '@/modules/pipeline/brief';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const Body = z.object({
  eventIds: z.array(z.string()).max(20).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  force: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'brief' } },
      { status: 400 },
    );
  }
  let ids = parsed.data.eventIds ?? [];
  if (ids.length === 0 && parsed.data.date) {
    const { brief } = getBriefForDate(parsed.data.date);
    ids = (brief?.selectedEventIds as string[] | undefined) ?? [];
  }
  if (ids.length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'eventIds or date required', requestId: 'brief' } },
      { status: 400 },
    );
  }
  const result = await organizeEvents(ids, { force: parsed.data.force });
  return NextResponse.json({ data: result });
}
