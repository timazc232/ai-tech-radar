'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { RunJobButton } from '@/components/RunJobButton';

interface Job {
  id: string;
  jobType: string;
  date: string | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  metrics: Record<string, number> | null;
  error: string | null;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cost, setCost] = useState<{ spentYuan: number; budgetYuan: number; date: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? '任务记录加载失败');
      const payload = json.data;
      if (Array.isArray(payload)) {
        setJobs(payload);
      } else {
        setJobs(payload.jobs ?? []);
        setCost(payload.cost ?? null);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const latest = jobs[0];
  const pct = cost && cost.budgetYuan > 0 ? Math.min(100, (cost.spentYuan / cost.budgetYuan) * 100) : 0;

  return (
    <main>
      <PageHeader
        title="任务与成本"
        subtitle="Daily Job 处理北京时间昨日数据 · 租约锁防重复 · 本地可直接手动跑"
        actions={
          <div className="flex gap-2">
            <RunJobButton primary label="运行 daily" onDone={load} />
            <RunJobButton lookbackDays={7} label="冷启动 7 天" onDone={load} />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <section className="card p-5">
          <h2 className="font-semibold mb-2">最近一次任务</h2>
          {loading ? (
            <p className="text-sm text-[var(--muted)]" role="status">正在读取任务记录…</p>
          ) : error ? (
            <div className="text-sm text-[var(--danger)]">加载失败：{error} <button type="button" className="link" onClick={load}>重试</button></div>
          ) : !latest ? (
            <p className="text-sm text-[var(--faint)]">还没有跑过。点右上角开始第一次扫描。</p>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className="badge badge-pending">{latest.jobType}</span>
                <span className={`status-dot text-xs ${latest.status === 'success' ? 'text-[var(--success)]' : latest.status === 'failed' ? 'text-[var(--danger)]' : 'text-amber-300'}`}>
                  {latest.status}
                </span>
                <span className="mono text-[var(--muted)] text-xs">{latest.date}</span>
              </div>
              <p className="text-xs text-[var(--muted)] mb-3">
                {latest.startedAt.replace('T', ' ').slice(0, 19)}
                {latest.finishedAt ? ` → ${latest.finishedAt.replace('T', ' ').slice(11, 19)}` : ' · 进行中'}
              </p>
              {latest.metrics && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {Object.entries(latest.metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="text-[var(--muted)]">{k}</dt>
                      <dd className="mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {latest.error && <p className="text-xs text-[var(--danger)] mt-2">{latest.error}</p>}
            </>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-2">LLM 成本（今日）</h2>
          {cost ? (
            <>
              <div className="text-2xl font-bold mono">
                ¥{cost.spentYuan.toFixed(2)}
                <span className="text-sm font-normal text-[var(--muted)]"> / {cost.budgetYuan.toFixed(0)}</span>
              </div>
              <div className="budgetbar"><span style={{ width: `${pct}%` }} /></div>
              <p className="text-xs text-[var(--faint)]">达上限后保留采集与规则评分，停止深度分析。</p>
            </>
          ) : (
            <p className="text-sm text-[var(--faint)]">暂无消耗。</p>
          )}
        </section>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block h-3.5 w-1 rounded bg-slate-600" />
        <h2 className="text-sm font-semibold tracking-wide">任务历史</h2>
      </div>
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>开始</th>
              <th>类型</th>
              <th>窗口</th>
              <th>状态</th>
              <th>扫描 / 入选 / 异常</th>
            </tr>
          </thead>
          <tbody>
            {!loading && !error && jobs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-[var(--faint)] py-6">暂无记录</td></tr>
            )}
            {loading && <tr><td colSpan={5} className="text-center text-[var(--muted)] py-6">加载中…</td></tr>}
            {error && <tr><td colSpan={5} className="text-center text-[var(--danger)] py-6">加载失败，请重试</td></tr>}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="mono text-[11px]">{j.startedAt.replace('T', ' ').slice(0, 19)}</td>
                <td>{j.jobType}</td>
                <td className="mono">{j.date ?? '—'}</td>
                <td>
                  <span className={`status-dot text-xs ${j.status === 'success' ? 'text-[var(--success)]' : j.status === 'failed' ? 'text-[var(--danger)]' : 'text-amber-300'}`}>
                    {j.status}
                  </span>
                </td>
                <td className="mono text-[11px] text-[var(--muted)]">
                  {j.metrics
                    ? `${j.metrics.scanned ?? 0} / ${(j.metrics.mustRead ?? 0) + (j.metrics.worthWatching ?? 0)} / ${j.metrics.sourceAnomalies ?? 0}`
                    : j.error ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
