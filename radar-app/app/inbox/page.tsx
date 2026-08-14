'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';

interface Item {
  feedbackId: string;
  eventId: string;
  action: string;
  reason: string | null;
  createdAt: string;
  title: string;
  type: string;
  occurredAt: string;
}

export default function InboxPage() {
  const [kind, setKind] = useState<'save' | 'later'>('save');
  const [items, setItems] = useState<Item[]>([]);

  async function load(next = kind) {
    const res = await fetch(`/api/inbox?kind=${next}`);
    const json = await res.json();
    setItems(json.data.items);
  }

  useEffect(() => { load(kind); }, [kind]);

  return (
    <main>
      <PageHeader
        title="Inbox"
        subtitle="收藏与稍后再看。来自卡片上的「收藏 / 稍后」反馈。"
      />
      <div className="tabs mb-4">
        <button type="button" className={`tab ${kind === 'save' ? 'active' : ''}`} onClick={() => setKind('save')}>收藏</button>
        <button type="button" className={`tab ${kind === 'later' ? 'active' : ''}`} onClick={() => setKind('later')}>稍后再看</button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <div className="card p-8 text-center text-sm text-[var(--faint)]">
            还没有{kind === 'save' ? '收藏' : '稍后'}条目。在 Today 卡片上点对应按钮即可。
          </div>
        )}
        {items.map((it) => (
          <Link key={it.feedbackId} href={`/events/${it.eventId}`} className="card card-hover p-4 block">
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-[var(--muted)] mt-1 flex gap-2">
              <span>{it.type}</span>
              <span className="mono">{it.occurredAt.slice(0, 10)}</span>
              <span className="mono text-[var(--faint)]">{it.createdAt.slice(0, 16).replace('T', ' ')}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
