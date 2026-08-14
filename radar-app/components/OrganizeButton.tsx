'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OrganizeButton({
  eventIds,
  date,
  label = '用 AI 整理本页',
}: {
  eventIds?: string[];
  date?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg('整理中…');
    try {
      const res = await fetch('/api/events/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds, date, force: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '整理失败');
      const d = json.data as { organized: number; heuristic: number; skipped: number };
      setMsg(`已整理 ${d.organized} 条${d.heuristic ? ` · 规则兜底 ${d.heuristic}` : ''}`);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" className="btn btn-primary" disabled={busy} onClick={run}>
        {busy ? '整理中…' : label}
      </button>
      {msg && <span className="text-xs text-[var(--muted)]">{msg}</span>}
    </div>
  );
}
