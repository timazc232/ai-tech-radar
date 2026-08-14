import { NextRequest, NextResponse } from 'next/server';
import { listInbox } from '@/modules/memory/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get('kind');
  const action = kind === 'later' ? 'later' : 'save';
  return NextResponse.json({ data: { kind: action, items: listInbox(action) } });
}
