import { NextResponse } from 'next/server';
import { radarMeta, topicTrends } from '@/modules/radar/stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ data: { ...radarMeta(), topics: topicTrends() } });
}
