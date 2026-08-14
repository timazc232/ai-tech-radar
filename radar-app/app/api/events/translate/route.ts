import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { translateEvents } from '@/modules/llm/translate';
import { getBriefForDate } from '@/modules/pipeline/brief';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

const Body = z.object({
  eventIds: z.array(z.string()).max(20).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'translate' } },
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
      { error: { code: 'VALIDATION_ERROR', message: 'eventIds or date required', requestId: 'translate' } },
      { status: 400 },
    );
  }

  const result = await translateEvents(ids);
  if (result.reason === 'no_api_key') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '未配置 LLM API Key，请到 Settings 填写后再翻译', requestId: 'translate' } },
      { status: 400 },
    );
  }
  return NextResponse.json({ data: result });
}
