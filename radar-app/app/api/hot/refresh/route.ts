import { getBoard } from '@/lib/hot/board'
import { getIntroPrefetchStatus } from '@/lib/hot/prefetch-intro'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST() {
  const board = await getBoard({ force: true })
  // Prefetch is scheduled inside getBoard; return current status snapshot.
  return NextResponse.json({
    ok: true,
    sources: Object.keys(board).length,
    introPrefetch: getIntroPrefetchStatus(),
  })
}

export async function GET() {
  return NextResponse.json({ ok: true, introPrefetch: getIntroPrefetchStatus() })
}
