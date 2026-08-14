'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TranslateButton({
  eventIds,
  date,
  label = '生成本页中文',
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
    setMsg('翻译中…');
    try {
      const res = await fetch('/api/events/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds, date }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '翻译失败');
      const n = json.data?.translated ?? 0;
      const skip = json.data?.skipped ?? 0;
      setMsg(n > 0 ? `已译 ${n} 条${skip ? `，跳过 ${skip}` : ''}` : (skip ? '已有中文或无可译字段' : '没有译出内容'));
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button type="button" className="btn" disabled={busy} onClick={run}>
        {busy ? '翻译中…' : label}
      </button>
      {msg && <span className="text-xs text-[var(--muted)]">{msg}</span>}
    </div>
  );
}
