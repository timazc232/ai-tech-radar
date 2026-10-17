'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { RunJobButton } from '@/components/RunJobButton';
import { JOB_STATUS_LABEL, isJobInFlight, jobTypeLabel, jobView } from '@/lib/ui';

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
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? `加载失败（${res.status}）`);
      const payload = json.data;
      if (Array.isArray(payload)) {
        setJobs(payload);
      } else {
        setJobs(payload.jobs ?? []);
        setCost(payload.cost ?? null);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { load(); }, []);

  const latest = jobs[0];
  const inFlight = jobs.some((j) => isJobInFlight(j.status));

  useEffect(() => {
    if (!inFlight) return;
    const t = window.setInterval(() => { load(); }, 2500);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlight]);

  const view = jobView({ loaded, error, latestStatus: latest?.status ?? null });
  const pct = cost && cost.budgetYuan > 0 ? Math.min(100, (cost.spentYuan / cost.budgetYuan) * 100) : 0;

  return (
    <main>
      <PageHeader
        title="任务与成本"
        subtitle="每日任务处理北京时间昨日数据 · 租约锁防重复 · 可在本机手动运行"
        actions={
          <div className="flex gap-2 flex-wrap">
            <RunJobButton primary label="运行每日扫描" onDone={load} />
            <RunJobButton lookbackDays={7} label="冷启动 7 天" onDone={load} />
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <section className="card p-5" aria-busy={!loaded || inFlight} aria-live="polite">
          <h2 className="font-semibold mb-2">最近一次任务</h2>
          {view === 'loading' && (
            <p className="text-sm text-[var(--muted)]">正在加载任务记录…</p>
          )}
          {view === 'error' && (
            <div>
              <p className="text-sm text-[var(--danger)] mb-3">{error}</p>
              <button type="button" className="btn touch-target" onClick={() => { setLoaded(false); load(); }}>重新加载</button>
            </div>
          )}
          {view === 'empty' && (
            <p className="text-sm text-[var(--faint)]">还没有跑过任务。点右上角开始第一次扫描。</p>
          )}
          {view === 'running' && latest && (
            <JobSummary job={latest} extra="正在执行，完成后会自动刷新。" />
          )}
          {view === 'failed' && latest && (
            <div>
              <JobSummary job={latest} />
              <p className="text-sm text-[var(--danger)] mt-2">{latest.error ?? '任务失败'}</p>
              <p className="text-xs text-[var(--muted)] mt-2 mb-3">可点右上角重新运行，或直接再扫近 7 天。</p>
              <RunJobButton lookbackDays={7} label="重试扫描" onDone={load} />
            </div>
          )}
          {view === 'success' && latest && <JobSummary job={latest} />}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-2">LLM 成本（今日）</h2>
          {!loaded ? (
            <p className="text-sm text-[var(--muted)]">正在加载成本…</p>
          ) : cost ? (
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
        <h2 className="text-sm font-semibold tracking-wide">运行记录</h2>
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
            {!loaded && (
              <tr><td colSpan={5} className="text-center text-[var(--muted)] py-6">正在加载…</td></tr>
            )}
            {loaded && jobs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-[var(--faint)] py-6">暂无记录</td></tr>
            )}
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="mono text-[11px]">{j.startedAt.replace('T', ' ').slice(0, 19)}</td>
                <td>{jobTypeLabel(j.jobType)}</td>
                <td className="mono">{j.date ?? '—'}</td>
                <td>
                  <span className={`status-dot text-xs ${j.status === 'success' ? 'text-[var(--success)]' : j.status === 'failed' || j.status === 'lease_expired' ? 'text-[var(--danger)]' : 'text-amber-700'}`}>
                    {JOB_STATUS_LABEL[j.status] ?? j.status}
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

function JobSummary({ job, extra }: { job: Job; extra?: string }) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm mb-2 flex-wrap">
        <span className="badge badge-pending">{jobTypeLabel(job.jobType)}</span>
        <span className={`status-dot text-xs ${job.status === 'success' ? 'text-[var(--success)]' : job.status === 'failed' || job.status === 'lease_expired' ? 'text-[var(--danger)]' : 'text-amber-700'}`}>
          {JOB_STATUS_LABEL[job.status] ?? job.status}
        </span>
        <span className="mono text-[var(--muted)] text-xs">{job.date}</span>
      </div>
      <p className="text-xs text-[var(--muted)] mb-3">
        {job.startedAt.replace('T', ' ').slice(0, 19)}
        {job.finishedAt ? ` → ${job.finishedAt.replace('T', ' ').slice(11, 19)}` : ' · 进行中'}
      </p>
      {extra && <p className="text-xs text-[var(--muted)] mb-3">{extra}</p>}
      {job.metrics && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {Object.entries(job.metrics).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="mono">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
