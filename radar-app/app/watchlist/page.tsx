'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';

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
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch('/api/watchlist');
      const json = await res.json();
      setSources(json.data.sources);
      setTopics(json.data.topics);
      if (!topicId && json.data.topics[0]) setTopicId(json.data.topics[0].id);
    } finally {
      setLoading(false);
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

  const typeCount = (t: string) => sources.filter((s) => s.type.startsWith(t)).length;

  return (
    <main>
      <PageHeader
        title="关注来源"
        subtitle="这里管理内置源与自定义源；运行健康和错误诊断统一在“来源健康”查看。"
        actions={<Link href="/sources" className="btn">查看来源健康</Link>}
      />

      <div className="card p-4 mb-6 text-sm text-[var(--muted)]">
        已内置 GitHub、官方公告、Hacker News、Linux.do、Lobsters，以及可选的 X / Reddit。你在这里新增或暂停来源，不需要维护另一份独立列表。
      </div>

      {loading && <div className="card p-6 mb-6 text-center text-sm text-[var(--muted)]" role="status">正在读取来源…</div>}

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-[var(--accent)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">Topics</h2>
          <span className="text-xs text-[var(--faint)] mono">{topics.length}</span>
        </div>
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Topic</th>
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
                      <button type="button" className="btn !py-1 !px-2" onClick={() => patch(t.id, 'paused', 'topic')}>暂停全部</button>
                      <button type="button" className="btn !py-1 !px-2" onClick={() => patch(t.id, 'active', 'topic')}>恢复</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-[var(--radar)]" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">来源</h2>
          <span className="text-xs text-[var(--faint)] mono">
            {sources.length} · GitHub {typeCount('github')} · RSS {typeCount('rss')} · 网页 {typeCount('web')} · 社区 API {typeCount('api')}
          </span>
        </div>
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>实体</th>
                <th>类型</th>
                <th>Topic</th>
                <th>状态</th>
                <th>事件</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className={s.status === 'paused' ? 'opacity-50' : ''}>
                  <td>
                    <div className="font-medium">{s.entityName ?? s.id}</div>
                    <a href={s.url} className="link text-[11px] mono" target="_blank" rel="noreferrer">{s.url.replace(/^https?:\/\//, '').slice(0, 48)}</a>
                  </td>
                  <td><span className="badge badge-pending">{s.type}</span></td>
                  <td className="text-[var(--muted)]">{s.topicName ?? '—'}</td>
                  <td>
                    <span className={`status-dot text-xs ${s.status === 'error' ? 'text-[var(--danger)]' : s.status === 'paused' ? 'text-[var(--muted)]' : 'text-[var(--success)]'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="mono">{s.eventCount}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    <button
                      type="button"
                      className="btn !py-1 !px-2"
                      onClick={() => patch(s.id, s.status === 'paused' ? 'active' : 'paused')}
                    >
                      {s.status === 'paused' ? '恢复' : '暂停'}
                    </button>
                    <button type="button" className="btn !py-1 !px-2" onClick={() => remove(s.id)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-slate-600" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">添加来源</h2>
        </div>
        <div className="card p-4 space-y-3">
          <input
            className="input mono"
            placeholder="粘贴 GitHub Repo / RSS / 官方页面 URL…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="显示名称（可选）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select className="select" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-primary" disabled={busy || url.length < 8} onClick={add}>
              {busy ? '检查中…' : '检查并添加'}
            </button>
            {msg && <span className="text-sm text-[var(--muted)]">{msg}</span>}
          </div>
          <p className="text-[11px] text-[var(--faint)]">
            识别规则：github.com/…/releases → GitHub Release；github.com/owner/repo → Repo；feed/rss/atom → RSS；其余按网页变更检测。
          </p>
        </div>
      </section>
    </main>
  );
}
