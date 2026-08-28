'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import {
  ORIGIN_LABEL,
  sourceOrigin,
  sourceRunKind,
  sourceRunLabel,
  sourceWatchLabel,
} from '@/lib/ui';

interface Topic { id: string; name: string }
interface Item {
  id: string;
  type: string;
  url: string;
  status: string;
  entityName: string | null;
  topicId: string | null;
  topicName: string | null;
  lastFetchedAt: string | null;
  lastError: string | null;
  eventCount: number;
}

export default function WatchlistPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Item[]>([]);
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [topicId, setTopicId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/watchlist');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '加载失败');
      setSources(json.data.sources);
      setTopics(json.data.topics);
      setTopicId((current) => current || json.data.topics[0]?.id || '');
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); }, []);

  async function add() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: name || undefined, topicId: topicId || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '添加失败');
      setUrl('');
      setName('');
      setMsg(json.data.warning ? `已添加（${json.data.warning}）` : `已添加 · ${json.data.classified.type}`);
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, status: 'active' | 'paused', scope: 'source' | 'topic' = 'source') {
    await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, scope }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm('删除该来源？已有历史数据时会改为暂停。')) return;
    const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    const json = await res.json();
    setMsg(json.data?.paused ? '已有历史，已改为暂停' : '已删除');
    await load();
  }

  const builtin = sources.filter((s) => sourceOrigin(s.id) === 'builtin');
  const custom = sources.filter((s) => sourceOrigin(s.id) === 'custom');

  return (
    <main>
      <PageHeader
        title="关注列表"
        subtitle="决定系统盯哪些主题与来源。采集是否成功请来源健康页查看。"
      />

      <div className="card p-4 mb-6 text-sm text-[var(--muted)] leading-relaxed">
        <p>
          <strong className="text-[var(--text)]">关注列表</strong>管「盯什么」：主题、内置预设源、以及你粘贴进来的自定义源。
          <strong className="text-[var(--text)]"> 来源健康</strong>管「采得怎样」：上次成功、错误与重试。
        </p>
        <p className="mt-2">
          内置 {builtin.length} · 自定义 {custom.length}。
          查看运行状态请前往 <Link href="/sources" className="link">来源健康</Link>。
        </p>
      </div>

      {!loaded && <p className="text-sm text-[var(--muted)] mb-4" role="status">正在加载关注列表…</p>}
      {loadError && (
        <div className="card p-4 mb-4 text-sm">
          <p className="text-[var(--danger)] mb-2">{loadError}</p>
          <button type="button" className="btn touch-target" onClick={() => { setLoaded(false); load(); }}>重试</button>
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-[var(--accent)]" />
          <h2 className="text-sm font-semibold tracking-wide">主题</h2>
          <span className="text-xs text-[var(--faint)] mono">{topics.length}</span>
        </div>
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>主题</th>
                <th>来源</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => {
                const n = sources.filter((s) => s.topicId === t.id).length;
                const active = sources.filter((s) => s.topicId === t.id && s.status === 'active').length;
                return (
                  <tr key={t.id}>
                    <td className="font-medium">{t.name}</td>
                    <td className="mono text-[var(--muted)]">{active}/{n}</td>
                    <td className="space-x-1">
                      <button type="button" className="btn !py-1 !px-2 touch-target" onClick={() => patch(t.id, 'paused', 'topic')}>暂停全部</button>
                      <button type="button" className="btn !py-1 !px-2 touch-target" onClick={() => patch(t.id, 'active', 'topic')}>恢复</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {loaded && (
        <>
          <SourceTable
            title="内置来源"
            hint="预设采集清单，可暂停但建议保留"
            items={builtin}
            patch={patch}
            remove={remove}
          />
          <SourceTable
            title="自定义来源"
            hint="你添加的 GitHub / RSS / 网页"
            items={custom}
            patch={patch}
            remove={remove}
          />
        </>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-slate-600" />
          <h2 className="text-sm font-semibold tracking-wide">添加来源</h2>
        </div>
        <div className="card p-4 space-y-3">
          <input
            className="input mono"
            placeholder="粘贴 GitHub 仓库 / RSS / 官方页面 URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="来源网址"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="显示名称（可选）"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="显示名称"
            />
            <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)} aria-label="所属主题">
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" className="btn btn-primary touch-target" disabled={busy || url.length < 8} onClick={add}>
              {busy ? '检查中…' : '检查并添加'}
            </button>
            {msg && <span className="text-sm text-[var(--muted)]" role="status">{msg}</span>}
          </div>
          <p className="text-[11px] text-[var(--faint)]">
            识别规则：github.com/…/releases → GitHub 发布；github.com/owner/repo → 仓库；feed/rss/atom → RSS；其余按网页变更检测。
          </p>
        </div>
      </section>
    </main>
  );
}

function SourceTable({
  title, hint, items, patch, remove,
}: {
  title: string;
  hint: string;
  items: Item[];
  patch: (id: string, status: 'active' | 'paused') => void;
  remove: (id: string) => void;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="inline-block h-3.5 w-1 rounded bg-[var(--radar)]" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
        <span className="text-xs text-[var(--faint)]">{hint} · {items.length}</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>实体</th>
              <th>类别</th>
              <th>主题</th>
              <th>关注</th>
              <th>运行</th>
              <th>事件</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center text-[var(--faint)] py-6">暂无</td></tr>
            )}
            {items.map((s) => {
              const origin = sourceOrigin(s.id);
              const run = sourceRunKind(s);
              return (
                <tr key={s.id} className={s.status === 'paused' ? 'opacity-50' : ''}>
                  <td>
                    <div className="font-medium">{s.entityName ?? s.id}</div>
                    <a href={s.url} className="link text-[11px] mono" target="_blank" rel="noreferrer">{s.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>
                    <div className="text-[11px] text-[var(--faint)]">{s.type}</div>
                  </td>
                  <td><span className="badge badge-pending">{ORIGIN_LABEL[origin]}</span></td>
                  <td className="text-[var(--muted)]">{s.topicName ?? '—'}</td>
                  <td>
                    <span className={`status-dot text-xs ${s.status === 'paused' ? 'text-[var(--muted)]' : 'text-[var(--success)]'}`}>
                      {sourceWatchLabel(s.status)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-dot text-xs ${run === 'error' ? 'text-[var(--danger)]' : run === 'ok' ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
                      {sourceRunLabel(run)}
                    </span>
                  </td>
                  <td className="mono">{s.eventCount}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      className="btn !py-1 !px-2 touch-target"
                      onClick={() => patch(s.id, s.status === 'paused' ? 'active' : 'paused')}
                    >
                      {s.status === 'paused' ? '恢复' : '暂停'}
                    </button>
                    <button type="button" className="btn !py-1 !px-2 touch-target" onClick={() => remove(s.id)}>删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
