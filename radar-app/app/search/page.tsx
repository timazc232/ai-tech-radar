'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Suspense } from 'react';
import {
  SEARCH_MIN_LEN,
  TYPE_LABEL,
  searchQueryHint,
  searchStatusText,
  searchView,
} from '@/lib/ui';

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
  const router = useRouter();
  const initial = params.get('q') ?? '';
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(initial.trim().length >= SEARCH_MIN_LEN);
  const [hint, setHint] = useState<string | null>(null);

  async function run(query: string) {
    const text = query.trim();
    const problem = searchQueryHint(text);
    if (problem) {
      setHint(problem);
      setHits([]);
      setError(null);
      setAttempted(true);
      return;
    }
    setHint(null);
    setAttempted(true);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message ?? `搜索失败（${res.status}）`);
      }
      setHits(json.data?.events ?? []);
    } catch (e) {
      setHits([]);
      setError((e as Error).message || '搜索失败');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setQ(initial);
    if (initial.trim().length >= SEARCH_MIN_LEN) {
      run(initial);
    } else {
      setHits([]);
      setBusy(false);
      setAttempted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const view = searchView({
    query: initial || q,
    busy,
    error,
    hitCount: hits.length,
    attempted,
  });
  const status = error ? error : searchStatusText(view, hits.length);

  return (
    <main>
      <PageHeader title="搜索" subtitle="按标题与实体名检索历史事件。" />
      <form
        className="flex gap-2 mb-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          const text = q.trim();
          const problem = searchQueryHint(text);
          if (problem) {
            setHint(problem);
            setAttempted(true);
            return;
          }
          if (text === initial) {
            run(text);
          } else {
            router.push(`/search?q=${encodeURIComponent(text)}`);
          }
        }}
      >
        <input
          className="input min-w-0"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (hint) setHint(searchQueryHint(e.target.value));
          }}
          placeholder="例如 vllm、MCP、release…"
          aria-label="搜索事件"
          aria-describedby="search-status"
        />
        <button type="submit" className="btn btn-primary shrink-0 touch-target" disabled={busy} aria-busy={busy}>
          {busy ? '搜索中…' : '搜索'}
        </button>
      </form>
      {hint && <p className="text-[11px] text-[var(--danger)] mb-3" role="alert">{hint}</p>}
      <p
        id="search-status"
        className={`text-xs mb-4 ${view === 'error' ? 'text-[var(--danger)]' : 'text-[var(--muted)]'}`}
        role="status"
        aria-live="polite"
      >
        {status}
      </p>
      <div className="space-y-2" aria-busy={busy}>
        {view === 'loading' && (
          <div className="card p-8 text-center text-sm text-[var(--muted)]">正在搜索…</div>
        )}
        {view === 'error' && (
          <div className="card p-8 text-center text-sm">
            <p className="text-[var(--danger)] mb-3">{error}</p>
            <button type="button" className="btn btn-primary touch-target" onClick={() => run(q)}>
              重试
            </button>
          </div>
        )}
        {view === 'empty' && (
          <div className="card p-8 text-center text-sm text-[var(--faint)]">
            没有匹配「{q.trim()}」的事件。可换个关键词，或先到
            {' '}<Link href="/watchlist" className="link">关注</Link> 确认来源。
          </div>
        )}
        {view === 'success' && hits.map((h) => (
          <Link key={h.id} href={`/events/${h.id}`} className="card card-hover p-4 block">
            <div className="flex justify-between gap-3">
              <div className="font-medium">{h.title}</div>
              <span className="mono text-sm text-[var(--accent)]">{Math.round(h.total)}</span>
            </div>
            <div className="text-xs text-[var(--muted)] mt-1">
              {h.entityName} · {TYPE_LABEL[h.type] ?? h.type} · {h.occurredAt.slice(0, 10)}
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
