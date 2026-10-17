import { getIntroPrefetchStatus } from '@/lib/hot/prefetch-intro'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Lightweight status for UI progress after refresh. */
export async function GET() {
  return NextResponse.json({ ok: true, introPrefetch: getIntroPrefetchStatus() })
}
