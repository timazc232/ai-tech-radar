'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  lookbackDays?: number;
  label?: string;
  primary?: boolean;
  onDone?: () => void;
}

export function RunJobButton({ lookbackDays, label, primary, onDone }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(lookbackDays && lookbackDays > 1 ? '冷启动扫描中，约 1–3 分钟…' : '扫描昨日窗口中…');
    try {
      const res = await fetch('/api/admin/jobs/daily/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lookbackDays && lookbackDays > 1 ? { lookbackDays } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '任务失败');
      const m = json.data?.metrics as Record<string, number> | undefined;
      setMsg(m
        ? `完成：扫描 ${m.scanned} · 入选 ${ (m.mustRead ?? 0) + (m.worthWatching ?? 0) } · 异常 ${m.sourceAnomalies ?? 0}`
        : '完成');
      router.refresh();
      onDone?.();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`btn ${primary ? 'btn-primary' : ''}`}
      >
        {busy ? '扫描中…' : (label ?? '扫描近 7 天')}
      </button>
      {msg && <span className="text-xs text-[var(--muted)] mono">{msg}</span>}
    </div>
  );
}
