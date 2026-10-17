'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Prefetch = {
  running?: boolean
  miss?: number
  ok?: number
  fail?: number
  hit?: number
}

export function HotRefresh() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [prefetchNote, setPrefetchNote] = useState<string | null>(null)

  async function onClick() {
    if (busy) return
    setBusy(true)
    setPrefetchNote(null)
    try {
      await fetch('/api/hot/refresh', { method: 'POST' })
      router.refresh()
      setBusy(false)
      setPrefetchNote('正在生成中文简介…')
      await waitPrefetch()
    } catch {
      setBusy(false)
    } finally {
      setPrefetchNote(null)
    }
  }

  async function waitPrefetch() {
    const deadline = Date.now() + 90_000
    // brief delay so server job can flip to running
    await sleep(400)
    while (Date.now() < deadline) {
      try {
        const r = await fetch('/api/hot/prefetch', { cache: 'no-store' })
        const json = (await r.json()) as { introPrefetch?: Prefetch }
        const p = json.introPrefetch
        if (!p?.running) return
        const miss = p.miss ?? 0
        const ok = p.ok ?? 0
        const fail = p.fail ?? 0
        const done = ok + fail
        setPrefetchNote(
          miss > 0 ? `正在生成中文简介… ${done}/${miss}` : '正在生成中文简介…',
        )
      } catch {
        return
      }
      await sleep(1200)
    }
  }

  return (
    <span className="hot-refresh-wrap">
      <button type="button" className="hot-refresh" onClick={onClick} disabled={busy}>
        {busy ? '刷新中…' : '立即刷新'}
      </button>
      {prefetchNote ? <span className="hot-prefetch-note">{prefetchNote}</span> : null}
    </span>
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
