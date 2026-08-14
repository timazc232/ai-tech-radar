import { NextRequest, NextResponse } from 'next/server';
import { getBriefForDate, listBriefDates, prepareDisplayEvents } from '@/modules/pipeline/brief';
import { windowLabel } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? undefined;
  const { brief, window: win, freshness } = getBriefForDate(date);
  if (!brief) {
    return NextResponse.json({
      data: null,
      meta: { status: 'pending', window: win, dates: listBriefDates() },
    });
  }
  const selectedIds = brief.selectedEventIds as string[];
  const events = (await prepareDisplayEvents(selectedIds)).map((e) => ({
    ...e,
    tier: e.total >= 80 ? 'must' : 'worth',
  }));

  return NextResponse.json({
    data: {
      date: brief.date,
      window: win,
      freshness,
      windowLabel: windowLabel(win.date),
      metrics: brief.metrics,
      events,
      dates: listBriefDates(),
    },
    meta: { generatedAt: new Date().toISOString() },
  });
}
