import { getBriefForDate, listBriefDates, prepareDisplayEvents } from '@/modules/pipeline/brief';
import { dataWindow, shiftBeijingDate, windowLabel, type Freshness } from '@/lib/time';
import { EventCard } from '@/components/EventCard';
import { RunJobButton } from '@/components/RunJobButton';
import { db } from '@/db/client';
import { source } from '@/db/schema';
import { effectiveGitHubToken } from '@/lib/settings';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const maxDuration = 180;

function freshnessLabel(f: Freshness): { text: string; cls: string } {
  switch (f) {
    case 'fresh': return { text: 'fresh', cls: 'badge-fresh' };
    case 'stale': return { text: 'stale', cls: 'badge-stale' };
    case 'pending': return { text: 'pending', cls: 'badge-pending' };
  }
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const yesterday = dataWindow().date;
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : yesterday;
  const { brief, window: win, freshness } = getBriefForDate(date);
  const fl = freshnessLabel(freshness);
  const dates = listBriefDates();
  const isYesterday = date === yesterday;
  const githubOk = Boolean(effectiveGitHubToken());
  const sourceCount = db().select().from(source).all().length;

  const header = (
    <header className="mb-7">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="serif text-2xl font-semibold tracking-tight">Today</h1>
          <p className="text-xs text-[var(--muted)] mt-1">官方公告 + 仓库发布 · 默认看近 7 天</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${fl.cls}`}>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {fl.text}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
        <span>窗口 <span className="text-[var(--text)] mono">{windowLabel(win.date)}</span></span>
        <span className="text-[var(--faint)]">·</span>
        <Link href={`/?date=${shiftBeijingDate(date, -1)}`} className="link">前一天</Link>
        {!isYesterday && (
          <Link href={`/?date=${shiftBeijingDate(date, 1)}`} className="link">后一天</Link>
        )}
        {dates.length > 0 && (
          <span className="text-[var(--faint)]">
            已有 {dates.length} 份简报
          </span>
        )}
      </div>
    </header>
  );

  if (!brief) {
    return (
      <main>
        {header}
        <div className="card p-8 text-center">
          <div className="text-[var(--muted)] mb-2">
            {isYesterday ? '今日简报尚未生成' : `${date} 没有简报`}
          </div>
          <p className="text-sm text-[var(--faint)] mb-5">
            {sourceCount} 个来源
            {githubOk ? ' · GitHub Token 已配置' : ' · 尚未配置 GitHub Token'}
          </p>
          {isYesterday && (
            <div className="flex items-start justify-center gap-3 flex-wrap">
              <RunJobButton primary lookbackDays={7} label="扫描近 7 天" />
            </div>
          )}
          {dates.length > 0 && (
            <p className="text-xs text-[var(--muted)] mt-4">
              历史简报：{dates.slice(0, 7).map((d, i) => (
                <span key={d}>
                  {i > 0 ? ' · ' : ''}
                  <Link href={`/?date=${d}`} className="link mono">{d}</Link>
                </span>
              ))}
            </p>
          )}
          {!githubOk && (
            <p className="text-xs text-[var(--faint)] mt-4">
              GitHub 采集需要 Token，请先到 <Link href="/settings" className="link">Settings</Link> 填写。
            </p>
          )}
        </div>
      </main>
    );
  }

  const metrics = brief.metrics as { scanned: number; candidates: number; recommended: number; filtered: number; sourceAnomalies: number };
  const items = await prepareDisplayEvents(brief.selectedEventIds as string[]);
  const mustItems = items.filter((i) => i.total >= 80);
  const worthItems = items.filter((i) => i.total >= 65 && i.total < 80);

  return (
    <main>
      {header}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        <Metric label="扫描" value={metrics.scanned} />
        <Metric label="候选" value={metrics.candidates} />
        <Metric label="入选" value={metrics.recommended} accent />
        <Metric label="过滤" value={metrics.filtered} />
        <AnomalyMetric count={metrics.sourceAnomalies} />
      </div>

      {isYesterday && items.length === 0 && (
        <div className="card p-5 mb-6 text-sm text-[var(--muted)] text-center">
          这一窗没有达到阈值的事件。可以
          <span className="inline-block mx-1 align-middle"><RunJobButton lookbackDays={7} label="再扫近 7 天" /></span>
        </div>
      )}

      <Section title="Must Read" count={mustItems.length} tier="must">
        {mustItems.length === 0 ? (
          <EmptyHint text="本日无 Must Read 事件（total ≥ 80）" />
        ) : (
          <div className="space-y-3">
            {mustItems.map((i) => (
              <EventCard key={i.id} event={i} tier="must" />
            ))}
          </div>
        )}
      </Section>

      <Section title="Worth Watching" count={worthItems.length} tier="worth">
        {worthItems.length === 0 ? (
          <EmptyHint text="本日无 Worth Watching 事件（65 ≤ total &lt; 80）" />
        ) : (
          <div className="space-y-3">
            {worthItems.map((i) => (
              <EventCard key={i.id} event={i} tier="worth" />
            ))}
          </div>
        )}
      </Section>
    </main>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="card p-3.5 text-center">
      <div className={`text-2xl font-bold mono ${accent ? 'text-[var(--accent)]' : ''}`}>{value}</div>
      <div className="text-[11px] text-[var(--muted)] mt-0.5">{label}</div>
    </div>
  );
}

function AnomalyMetric({ count }: { count: number }) {
  if (count > 0) {
    return (
      <Link
        href="/sources"
        className="card card-hover block p-3.5 text-center"
        style={{ borderColor: 'rgba(251, 191, 36, 0.35)' }}
        title="查看 Source Health"
      >
        <div className="text-2xl font-bold mono text-amber-400">{count}</div>
        <div className="text-[11px] text-[var(--muted)] mt-0.5">来源异常</div>
      </Link>
    );
  }
  return (
    <Link href="/sources" className="card card-hover block p-3.5 text-center">
      <div className="text-2xl font-bold mono text-[var(--success)]">✓</div>
      <div className="text-[11px] text-[var(--muted)] mt-0.5">源健康</div>
    </Link>
  );
}

function Section({ title, count, children }: { title: string; count: number; tier: 'must' | 'worth'; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="flex items-baseline gap-2 mb-3 pb-2 border-b border-[var(--border)]">
        <h2 className="serif text-lg font-semibold">{title}</h2>
        <span className="text-xs text-[var(--faint)]">{count}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="card p-5 text-sm text-[var(--faint)] text-center" dangerouslySetInnerHTML={{ __html: text }} />
  );
}
