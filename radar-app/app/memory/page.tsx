'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

type Tab = 'interest' | 'entity' | 'research' | 'feedback';

interface Mem {
  id: string;
  type: Tab;
  content: Record<string, unknown>;
  confidence: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TABS: Array<[Tab, string]> = [
  ['interest', '兴趣'],
  ['entity', '实体'],
  ['research', '研究'],
  ['feedback', '反馈'],
];

export default function MemoryPage() {
  const [tab, setTab] = useState<Tab>('interest');
  const [items, setItems] = useState<Mem[]>([]);
  const [paused, setPaused] = useState(false);
  const [researchName, setResearchName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function load(next = tab) {
    const res = await fetch(`/api/memories?type=${next}`);
    const json = await res.json();
    setItems(json.data.memories);
    setPaused(json.data.learningPaused);
  }

  useEffect(() => { load(tab); }, [tab]);

  async function toggleLearning() {
    await fetch('/api/memories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learningPaused: !paused }),
    });
    await load();
  }

  async function forget(id: string) {
    if (!confirm('删除这条记忆？反馈类会回滚对应权重。')) return;
    const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
    const json = await res.json();
    setMsg(json.data?.rolledBack ? '已删除并回滚权重' : '已删除');
    await load();
  }

  async function setStatus(id: string, status: string) {
    await fetch(`/api/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function addResearch() {
    const name = researchName.trim();
    if (!name) return;
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'research',
        content: { name, weight: 1.0 },
        expiresAt: expires,
        confidence: 0.8,
      }),
    });
    setResearchName('');
    setTab('research');
    await load('research');
  }

  return (
    <main>
      <PageHeader
        title="记忆"
        subtitle="系统记住的偏好与反馈 · 可见 / 可编辑 / 可删除。删除后立即停止参与排序。"
        actions={
          <button type="button" className="btn" onClick={toggleLearning}>
            {paused ? '恢复学习' : '暂停学习'}
          </button>
        }
      />
      {paused && (
        <div className="card p-3 mb-4 text-sm text-amber-300">
          自动学习已暂停：反馈仍会记录，但不再调整权重。
        </div>
      )}

      <div className="tabs mb-4">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {msg && <p className="text-xs text-[var(--radar)] mb-3 mono">{msg}</p>}

      {tab === 'research' && (
        <div className="card p-3 mb-4 flex gap-2">
          <input
            className="input"
            placeholder="正在研究的主题，例如 MCP auth"
            value={researchName}
            onChange={(e) => setResearchName(e.target.value)}
          />
          <button type="button" className="btn btn-primary shrink-0" onClick={addResearch}>添加研究主题</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>{tab === 'feedback' ? '事件' : '内容'}</th>
              <th>{tab === 'feedback' ? '动作' : '权重 / 状态'}</th>
              <th>更新</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={4} className="text-center text-[var(--faint)] py-6">暂无此类记忆</td></tr>
            )}
            {items.map((m) => {
              const c = m.content;
              const title = String(c.name ?? c.eventTitle ?? c.topicId ?? m.id);
              const action = String(c.action ?? '');
              const effect = String(c.effect ?? '');
              const weight = typeof c.weight === 'number' ? c.weight : null;
              return (
                <tr key={m.id} className={m.status !== 'active' ? 'opacity-50' : ''}>
                  <td>
                    {c.eventId ? (
                      <Link href={`/events/${c.eventId}`} className="link">{title}</Link>
                    ) : (
                      <span className="font-medium">{title}</span>
                    )}
                    {c.reason ? <div className="text-[11px] text-[var(--faint)]">{String(c.reason)}</div> : null}
                    {effect ? <div className="text-[11px] text-[var(--muted)]">{effect}</div> : null}
                  </td>
                  <td>
                    {action && <span className="badge badge-pending">{action}</span>}
                    {weight !== null && (
                      <span className="inline-flex items-center gap-2">
                        <span className="weightbar"><span style={{ width: `${Math.min(100, weight * 100)}%` }} /></span>
                        <span className="mono text-xs">{weight.toFixed(2)}</span>
                      </span>
                    )}
                    <div className="text-[11px] text-[var(--faint)] mt-0.5">{m.status === 'active' ? '生效中' : m.status === 'paused' ? '已暂停' : m.status}</div>
                  </td>
                  <td className="mono text-[11px] text-[var(--muted)]">{m.updatedAt.slice(0, 10)}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    {m.status === 'active' ? (
                      <button type="button" className="btn !py-1 !px-2" onClick={() => setStatus(m.id, 'paused')}>暂停</button>
                    ) : (
                      <button type="button" className="btn !py-1 !px-2" onClick={() => setStatus(m.id, 'active')}>恢复</button>
                    )}
                    <button type="button" className="btn !py-1 !px-2" onClick={() => forget(m.id)}>删除</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
