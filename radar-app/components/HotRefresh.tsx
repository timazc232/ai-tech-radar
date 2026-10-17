'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function HotRefresh() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (busy) return
    setBusy(true)
    try {
      await fetch('/api/hot/refresh', { method: 'POST' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" className="hot-refresh" onClick={onClick} disabled={busy}>
      {busy ? '刷新中…' : '立即刷新'}
    </button>
  )
}
