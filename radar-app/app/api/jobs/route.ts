import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { jobRun } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { spentToday } from '@/modules/llm/budget';
import { effectiveLLM } from '@/lib/settings';
import { toBeijingDate } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET() {
  const jobs = db().select().from(jobRun).orderBy(desc(jobRun.startedAt)).limit(50).all();
  const llm = effectiveLLM();
  const spent = spentToday();
  return NextResponse.json({
    data: {
      jobs,
      cost: {
        date: toBeijingDate(new Date()),
        spentYuan: spent,
        budgetYuan: llm.budgetYuan,
      },
    },
  });
}
