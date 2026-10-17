import { db } from '@/db/client';
import { entity, source } from '@/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { RunJobButton } from '@/components/RunJobButton';
import {
  ORIGIN_LABEL,
  sourceOrigin,
  sourceRunKind,
  sourceRunLabel,
  sourceWatchLabel,
} from '@/lib/ui';

export const dynamic = 'force-dynamic';

export default function SourcesPage() {
  const sources = db().select().from(source).all().map((s) => {
    const ent = s.entityId ? db().select().from(entity).where(eq(entity.id, s.entityId)).get() : null;
    const origin = sourceOrigin(s.id);
    const run = sourceRunKind({
      status: s.status ?? 'active',
      lastFetchedAt: s.lastFetchedAt,
      lastError: s.lastError,
    });
    return {
      ...s,
      entityName: ent?.name ?? s.id,
      origin,
      run,
      watchLabel: sourceWatchLabel(s.status ?? 'active'),
      runLabel: sourceRunLabel(run),
    };
  });
  const summary = {
    total: sources.length,
    builtin: sources.filter((s) => s.origin === 'builtin').length,
    custom: sources.filter((s) => s.origin === 'custom').length,
    active: sources.filter((s) => s.status === 'active').length,
    error: sources.filter((s) => s.status === 'error').length,
    paused: sources.filter((s) => s.status === 'paused').length,
  };

  return (
    <main>
      <PageHeader
        title="来源健康"
        subtitle="查看采集是否成功。增删与暂停请来「关注」页；本页只反映运行状态。"
        actions={<RunJobButton label="重试扫描" />}
      />

      <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
        <strong className="text-[var(--text)]">内置源</strong>来自预设清单，
        <strong className="text-[var(--text)]">自定义源</strong>是你在关注列表里添加的。
        「关注中 / 已暂停」是订阅意图，「已采集 / 失败」是最近一次扫描结果。
        管理入口：<Link href="/watchlist" className="link">关注列表</Link>
        {' · '}
        <Link href="/jobs" className="link">任务记录</Link>。
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat n={summary.total} l="全部" />
        <Stat n={summary.builtin} l="内置" />
        <Stat n={summary.custom} l="自定义" />
        <Stat n={summary.error} l="采集失败" err={summary.error > 0} />
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>来源</th>
              <th>类别</th>
              <th>关注</th>
              <th>运行</th>
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
                  <div className="text-[11px] text-[var(--faint)] mt-0.5">{s.type}</div>
                </td>
                <td>
                  <span className="badge badge-pending">{ORIGIN_LABEL[s.origin]}</span>
                </td>
                <td>
                  <span className={`status-dot text-xs ${s.status === 'paused' ? 'text-[var(--muted)]' : 'text-[var(--success)]'}`}>
                    {s.watchLabel}
                  </span>
                </td>
                <td>
                  <span className={`status-dot text-xs ${s.run === 'error' ? 'text-[var(--danger)]' : s.run === 'ok' ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}>
                    {s.runLabel}
                  </span>
                </td>
                <td className="mono text-[11px] text-[var(--muted)]">{s.lastFetchedAt ? s.lastFetchedAt.slice(0, 16).replace('T', ' ') : '—'}</td>
                <td className="text-[11px] text-[var(--danger)] max-w-[220px] truncate" title={s.lastError ?? ''}>{s.lastError ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
