import { NextRequest, NextResponse } from 'next/server';
import { JobLeaseHeld, runDaily } from '@/workers/pipeline';
import { runBackfill } from '@/workers/catchup';
import { cfg } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/** POST /api/admin/jobs/:type/run -- manually trigger a job (requires ADMIN_TOKEN if set). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  if (cfg.adminToken) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${cfg.adminToken}`) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'invalid admin token', requestId: 'admin' } }, { status: 401 });
    }
  }

  const { type } = await params;
  const body = await req.json().catch(() => ({})) as { lookbackDays?: number; date?: string };
  const lookbackDays = typeof body.lookbackDays === 'number' ? body.lookbackDays : undefined;

  try {
    if (type === 'daily') {
      const { metrics } = await runDaily({
        date: body.date,
        lookbackDays: lookbackDays ?? 7,
        backfill: true,
      });
      return NextResponse.json({ data: { type, status: 'success', metrics } });
    }
    if (type === 'daily_backfill') {
      const result = await runBackfill();
      return NextResponse.json({ data: { type, status: 'success', result } });
    }
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `unknown job type: ${type}`, requestId: 'admin' } },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof JobLeaseHeld) {
      return NextResponse.json(
        { error: { code: 'JOB_LEASE_HELD', message: err.message, requestId: 'admin' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: (err as Error).message, requestId: 'admin' } },
      { status: 500 },
    );
  }
}
