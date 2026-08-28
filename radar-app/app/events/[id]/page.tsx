import { db } from '@/db/client';
import { event, scoreSnapshot, eventEvidence, entity, intelligenceCard } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { toBeijingDate } from '@/lib/time';
import Link from 'next/link';
import { FeedbackBar } from '@/components/FeedbackBar';
import { Bilingual } from '@/components/Bilingual';
import { getEventZh, translateEvents } from '@/modules/llm/translate';
import { getEventBriefing, organizeEvents } from '@/modules/briefing/service';
import { ACTOR_KIND_LABEL, PROJECT_KIND_LABEL } from '@/modules/briefing/types';
import { ACTION_LABEL, DIM_LABEL, TYPE_LABEL as SHARED_TYPE_LABEL, TIER_LABEL } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const DIMS = [
  { key: 'relevance', label: DIM_LABEL.relevance },
  { key: 'impact', label: DIM_LABEL.impact },
  { key: 'novelty', label: DIM_LABEL.novelty },
  { key: 'credibility', label: DIM_LABEL.credibility },
  { key: 'urgency', label: DIM_LABEL.urgency },
] as const;

function barColor(v: number): string {
  if (v >= 70) return 'var(--accent)';
  if (v >= 40) return '#64748b';
  return '#334155';
}

const TYPE_LABEL = SHARED_TYPE_LABEL;

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ev = db().select().from(event).where(eq(event.id, id)).get();
  if (!ev) {
    return (
      <main>
        <p className="text-[var(--muted)]">事件不存在。</p>
        <Link href="/" className="link text-sm">← 返回</Link>
      </main>
    );
  }
  const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
  const scores = db().select().from(scoreSnapshot).where(eq(scoreSnapshot.eventId, id)).all();
  const latestScore = scores.at(-1);
  const evidence = db().select().from(eventEvidence).where(eq(eventEvidence.eventId, id)).all();
  const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, id)).get();
  if (!getEventBriefing(id)) await organizeEvents([id]);
  if (!getEventZh(id)?.titleZh) await translateEvents([id]);
  const zh = getEventZh(id);
  const briefing = getEventBriefing(id);
  const facts = (ev.factsJson as Array<{ key: string; value: string; before?: string; after?: string }>) ?? [];

  const total = latestScore ? Math.round(latestScore.total) : 0;
  const tier = total >= 80 ? 'must' : total >= 65 ? 'worth' : 'filtered';
  const tierLabel = total >= 80 ? TIER_LABEL.must : total >= 65 ? TIER_LABEL.worth : '已过滤';

  return (
    <main>
      <Link href="/" className="link text-sm inline-flex items-center gap-1">← 返回今日简报</Link>

      <header className="mt-3 mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-2 flex-wrap">
          <span className="badge badge-pending !py-0 !px-1.5 !text-[10px]">{TYPE_LABEL[ev.type] ?? ev.type}</span>
          <span className="mono">{toBeijingDate(ev.occurredAt)}</span>
          {ev.backfill ? <span className="badge badge-stale !py-0 !px-1.5 !text-[10px]">回填</span> : null}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="serif text-2xl font-semibold leading-snug">{briefing?.headline || zh?.titleZh || ev.title}</h1>
            {briefing?.headline && briefing.headline !== ev.title && (
              <p className="text-xs text-[var(--faint)] mt-1">原始标题：{ev.title}</p>
            )}
          </div>
          {latestScore && (
            <div className="text-right shrink-0">
              <div className={`text-3xl font-bold mono leading-none ${tier === 'must' ? 'text-[var(--accent)]' : ''}`}>{total}</div>
              <div className="text-[10px] text-[var(--faint)] mt-1 uppercase tracking-wider">{tierLabel}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {briefing ? (
            <>
              <span className="meta-chip">
                <span className="meta-k">{ACTOR_KIND_LABEL[briefing.actorKind]}</span>
                {briefing.actorName}
              </span>
              <span className="meta-chip">
                <span className="meta-k">{PROJECT_KIND_LABEL[briefing.projectKind]}</span>
                {briefing.projectName}
              </span>
              {briefing.versionLabel && <span className="meta-chip mono">{briefing.versionLabel}</span>}
            </>
          ) : (
            <span className="meta-chip">{ent?.name ?? '—'}</span>
          )}
        </div>
      </header>

      {briefing && (briefing.changeDetail || briefing.changePoints.length > 0) && (
        <section className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block h-3.5 w-1 rounded bg-[var(--radar)]" />
            <h2 className="font-semibold">更新说明</h2>
          </div>
          {briefing.changePoints.length > 0 && (
            <ul className="change-list mb-4">
              {briefing.changePoints.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          )}
          {briefing.changeDetail && (
            <div className="change-detail">{briefing.changeDetail}</div>
          )}
        </section>
      )}

      {card && (
        <section className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block h-3.5 w-1 rounded bg-[var(--radar)]" />
            <h2 className="font-semibold">情报卡片</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <CardField label="发生了什么" value={card.whatHappened} zh={zh?.whatZh} />
            <CardField label="为什么重要" value={card.whyItMatters} zh={zh?.whyZh} />
            <CardField label="有什么不同" value={card.whatIsDifferent} zh={zh?.differenceZh} />
            <CardField label="技术要点" value={card.technicalTake} zh={zh?.takeZh} />
          </dl>
          <div className="mt-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="text-[11px] text-[var(--faint)] uppercase tracking-wider mb-1">建议行动</div>
            <div className="text-sm text-[var(--accent)]">{ACTION_LABEL[card.recommendedAction] ?? card.recommendedAction}</div>
          </div>
        </section>
      )}

      {latestScore && (
        <section className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3.5 w-1 rounded bg-[var(--accent)]" />
              <h2 className="font-semibold">评分</h2>
            </div>
            <span className="text-xs text-[var(--faint)] mono">
              {latestScore.scorer} v{latestScore.version}{latestScore.model ? ` · ${latestScore.model}` : ''}
            </span>
          </div>
          <div className="space-y-2.5">
            {DIMS.map((d) => {
              const dims = latestScore.dimensions as Record<string, number>;
              const v = Math.round(dims[d.key] ?? 0);
              return (
                <div key={d.key} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)] w-20 shrink-0">{d.label}</span>
                  <div className="dim-bar flex-1"><span style={{ width: `${v}%`, background: barColor(v) }} /></div>
                  <span className="mono text-xs text-[var(--text)] w-8 text-right">{v}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {facts.length > 0 && (
        <section className="card p-5 mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block h-3.5 w-1 rounded bg-slate-600" />
            <h2 className="font-semibold">事实</h2>
          </div>
          <dl className="text-sm space-y-1.5">
            {facts.map((f, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span className="text-[var(--muted)] shrink-0">{f.key}</span>
                <span className="mono text-xs text-[var(--text)] text-right truncate" title={f.value}>{f.value.slice(0, 80)}</span>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-[var(--accent)]" />
          <h2 className="font-semibold">反馈</h2>
        </div>
        <FeedbackBar eventId={id} />
        <p className="text-[11px] text-[var(--faint)] mt-3">反馈写入 Memory，并在下一次评分中调整权重（可在 Memory 页撤销）。</p>
      </section>

      <section className="card p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block h-3.5 w-1 rounded bg-slate-600" />
          <h2 className="font-semibold">证据</h2>
          <span className="text-xs text-[var(--faint)] mono">{evidence.length}</span>
        </div>
        {evidence.length === 0 ? (
          <p className="text-sm text-[var(--faint)]">暂无证据链接。</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {evidence.map((e) => (
              <li key={e.id}>
                <blockquote className="border-l-2 border-[var(--border)] pl-3 italic text-[var(--muted)]">
                  <Bilingual original={e.quote} zh={zh?.quotesZh?.[e.id]} as="span" />
                </blockquote>
                <a href={e.url} className="link text-xs mt-1 inline-block mono" target="_blank" rel="noreferrer">{e.url}</a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function CardField({ label, value, zh }: { label: string; value: string; zh?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] text-[var(--faint)] uppercase tracking-wider mb-0.5">{label}</dt>
      <dd className="text-[var(--text)] leading-relaxed">
        <Bilingual original={value} zh={zh} as="span" />
      </dd>
    </div>
  );
}
