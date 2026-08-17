'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Suspense } from 'react';

interface Hit {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
  entityName: string;
  total: number;
  why?: string;
}

function SearchInner() {
  const params = useSearchParams();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(query: string) {
    const text = query.trim();
    if (text.length < 2) {
      setHits([]);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '搜索失败');
      setHits(json.data.events ?? []);
    } catch (e) {
      setHits([]);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { run(initial); }, [initial]);

  return (
    <main>
      <PageHeader title="搜索" subtitle="FTS5 检索历史事件标题与实体名。" />
      <form
        className="flex gap-2 mb-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(q);
        }}
      >
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例如 vllm、MCP、release…"
          aria-label="搜索"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={busy}>
          {busy ? '…' : '搜索'}
        </button>
      </form>
      <div className="text-xs text-[var(--muted)] mb-3" role="status" aria-live="polite">
        {busy ? '正在检索历史事件…' : error ? `搜索失败：${error}` : q.trim().length >= 2 ? `找到 ${hits.length} 条结果` : '请输入至少 2 个字符'}
      </div>
      <div className="space-y-2">
        {hits.length === 0 && q.trim().length >= 2 && !busy && (
          <div className="card p-8 text-center text-sm text-[var(--faint)]">没有匹配事件</div>
        )}
        {hits.map((h) => (
          <Link key={h.id} href={`/events/${h.id}`} className="card card-hover p-4 block">
            <div className="flex justify-between gap-3">
              <div className="font-medium">{h.title}</div>
              <span className="mono text-sm text-[var(--accent)]">{Math.round(h.total)}</span>
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">
              {h.entityName} · {h.type} · {h.occurredAt.slice(0, 10)}
            </div>
            {h.why && <p className="text-xs text-[var(--faint)] mt-2 line-clamp-2">{h.why}</p>}
          </Link>
        ))}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<main><p className="text-[var(--muted)]">加载中…</p></main>}>
      <SearchInner />
    </Suspense>
  );
}
