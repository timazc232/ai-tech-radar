import { getBoard } from '@/lib/hot/board'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

export async function POST() {
  const board = await getBoard({ force: true })
  return NextResponse.json({ ok: true, sources: Object.keys(board).length })
}
