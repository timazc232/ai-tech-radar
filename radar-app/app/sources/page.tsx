import { db } from '@/db/client';
import { entity, source } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { RunJobButton } from '@/components/RunJobButton';

export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  const sources = db().select().from(source).all().map((s) => {
    const ent = s.entityId ? db().select().from(entity).where(eq(entity.id, s.entityId)).get() : null;
    return { ...s, entityName: ent?.name ?? s.id };
  });
  const summary = {
    total: sources.length,
    active: sources.filter((s) => s.status === 'active').length,
    error: sources.filter((s) => s.status === 'error').length,
    paused: sources.filter((s) => s.status === 'paused').length,
  };

  return (
    <main>
      <PageHeader
        title="来源健康"
        subtitle={`${summary.total} 个来源 · 单来源失败不阻塞整批 · 失败来源下次扫描自动重试`}
        actions={<div className="flex gap-2"><Link href="/watchlist" className="btn">管理来源</Link><RunJobButton label="重试扫描" /></div>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat n={summary.total} l="全部" />
        <Stat n={summary.active} l="健康" ok />
        <Stat n={summary.paused} l="暂停" />
        <Stat n={summary.error} l="失败" err={summary.error > 0} />
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>来源</th>
              <th>类型</th>
              <th>状态</th>
              <th>上次成功</th>
              <th>错误</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  <div className="font-medium">{s.entityName}</div>
                  <a href={s.url} className="link text-[11px] mono" target="_blank" rel="noreferrer">
                    {s.url.replace(/^https?:\/\//, '').slice(0, 56)}
                  </a>
                </td>
                <td><span className="badge badge-pending">{s.type}</span></td>
                <td>
                  <span className={`status-dot text-xs ${s.status === 'error' ? 'text-[var(--danger)]' : s.status === 'paused' ? 'text-[var(--muted)]' : 'text-[var(--success)]'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="mono text-[11px] text-[var(--muted)]">{s.lastFetchedAt ? s.lastFetchedAt.slice(0, 16).replace('T', ' ') : '—'}</td>
                <td className="text-[11px] text-[var(--danger)] max-w-[220px] truncate" title={s.lastError ?? ''}>{s.lastError ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-[var(--faint)] mt-3">
        这里查看全部内置源和自定义源的运行健康；增删与暂停请到 <Link href="/watchlist" className="link">关注来源</Link>。任务记录见 <Link href="/jobs" className="link">任务记录</Link>。
      </p>
    </main>
  );
}

function Stat({ n, l, ok, err }: { n: number; l: string; ok?: boolean; err?: boolean }) {
  return (
    <div className="card p-3.5 text-center">
      <div className={`text-2xl font-bold mono ${ok ? 'text-[var(--success)]' : err ? 'text-[var(--danger)]' : ''}`}>{n}</div>
      <div className="text-[11px] text-[var(--muted)] mt-0.5">{l}</div>
    </div>
  );
}
