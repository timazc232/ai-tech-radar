import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { costLedger } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { toBeijingDate } from '@/lib/time';
import { effectiveLLM } from '@/lib/settings';
import { spentToday } from '@/modules/llm/budget';

export const dynamic = 'force-dynamic';

export async function GET() {
  const date = toBeijingDate(new Date());
  const rows = db().select().from(costLedger).where(eq(costLedger.date, date)).all();
  const llm = effectiveLLM();
  const spent = spentToday();
  return NextResponse.json({
    data: {
      date,
      spentYuan: spent,
      budgetYuan: llm.budgetYuan,
      remainingYuan: Math.max(0, llm.budgetYuan - spent),
      entries: rows,
    },
  });
}
