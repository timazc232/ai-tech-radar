'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

type Prefetch = {
  running?: boolean
  miss?: number
  ok?: number
  fail?: number
  hit?: number
}

// Refresh on page enter; skip if we just refreshed (e.g. switching source pills).
const AUTO_MIN_GAP = 60_000
let lastRefreshAt = 0

export function HotRefresh() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [prefetchNote, setPrefetchNote] = useState<string | null>(null)

  const busyRef = useRef(false)

  useEffect(() => {
    if (Date.now() - lastRefreshAt < AUTO_MIN_GAP) return
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onClick() {
    await run()
  }

  async function run() {
    if (busyRef.current) return
    busyRef.current = true
    lastRefreshAt = Date.now()
    setBusy(true)
    setPrefetchNote(null)
    try {
      await fetch('/api/hot/refresh', { method: 'POST' })
      router.refresh()
      busyRef.current = false
      setBusy(false)
      setPrefetchNote('正在生成中文简介…')
      await waitPrefetch()
    } catch {
      busyRef.current = false
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
