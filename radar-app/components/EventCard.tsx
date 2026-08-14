import { FeedbackBar } from './FeedbackBar';
import { Bilingual } from './Bilingual';
import {
  ACTOR_KIND_LABEL, type EventBriefing,
} from '@/modules/briefing/types';

interface EventCardData {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
  entityName: string;
  total: number;
  dimensions: { relevance: number; impact: number; novelty: number; credibility: number; urgency: number };
  why?: string;
  action?: string;
  titleZh?: string | null;
  whyZh?: string | null;
  briefing?: EventBriefing | null;
}

const ACTION_LABEL: Record<string, string> = {
  skip: '跳过',
  '5min': '5 min 阅读',
  '15min': '15 min 深读',
  clone_test: 'Clone & Test',
  watch: 'Watch',
};

const TYPE_LABEL: Record<string, string> = {
  release: '发布', breaking_change: '破坏性变更', pricing_change: '定价',
  research: '研究', security_advisory: '安全', announcement: '公告', docs_change: '文档',
};

export function EventCard({ event, tier }: { event: EventCardData; tier: 'must' | 'worth' }) {
  const score = Math.round(event.total);
  const b = event.briefing;
  const displayTitle = b?.headline || event.titleZh || event.title;
  const showOriginal = b?.headline && b.headline !== event.title;

  return (
    <article className={`card p-5 ${tier === 'must' ? 'tier-must' : 'tier-worth'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-[var(--muted)] mb-1.5 flex-wrap">
            {b ? (
              <>
                <span>{ACTOR_KIND_LABEL[b.actorKind]} {b.actorName}</span>
                <span className="text-[var(--border)]">/</span>
                <span>{b.projectName}</span>
                {b.versionLabel && <span className="mono">{b.versionLabel}</span>}
              </>
            ) : (
              <span>{event.entityName}</span>
            )}
            <span className="text-[var(--border)]">/</span>
            <span>{TYPE_LABEL[event.type] ?? event.type}</span>
            <span className="mono text-[var(--faint)]">{event.occurredAt.slice(0, 10)}</span>
          </div>
          <a href={`/events/${event.id}`} className="serif text-[1.15rem] font-semibold leading-snug text-[var(--text)] hover:underline">
            {displayTitle}
          </a>
          {showOriginal && (
            <div className="text-[11px] text-[var(--faint)] mt-1">原始标题 {event.title}</div>
          )}
        </div>
        <div className={`score-badge ${tier === 'must' ? 'score-badge-must' : 'score-badge-worth'}`} title="综合分">
          <span className="num">{score}</span>
        </div>
      </div>

      {b && b.changePoints.length > 0 && (
        <ul className="change-list mt-3">
          {b.changePoints.slice(0, 4).map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}

      {event.why && (
        <div className="why-box mt-3">
          <span className="why-box-k">为什么重要</span>
          <Bilingual original={event.why} zh={event.whyZh} as="span" />
        </div>
      )}

      {event.action && (
        <div className="mt-2 text-[12px] text-[var(--muted)]">
          建议 {ACTION_LABEL[event.action] ?? event.action}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--border-soft)]">
        <FeedbackBar eventId={event.id} compact />
      </div>
    </article>
  );
}
