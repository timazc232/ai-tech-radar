import { db } from '@/db/client';
import { entity, event, topic } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { dataWindow, lookbackWindow } from '@/lib/time';

export interface TopicTrend {
  id: string;
  name: string;
  d7: number;
  d7prev: number;
  d30: number;
  trend: 'up' | 'flat';
  events: Array<{ id: string; title: string; occurredAt: string }>;
}

/** P1 Radar: per-topic 7/30-day counts. Up = d7≥3 and ≥1.5× previous week. */
export function topicTrends(): TopicTrend[] {
  const w7 = lookbackWindow(7);
  const w7prev = {
    start: new Date(new Date(w7.start).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: w7.start,
  };
  const w30 = lookbackWindow(30);

  const topics = db().select().from(topic).all();
  const events = db().select().from(event).all();

  return topics.map((t) => {
    const related = events.filter((ev) => {
      const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
      return ent?.topicId === t.id;
    });
    const inRange = (start: string, end: string) =>
      related.filter((ev) => ev.occurredAt >= start && ev.occurredAt < end);
    const last7 = inRange(w7.start, w7.end);
    const prev7 = inRange(w7prev.start, w7prev.end);
    const last30 = inRange(w30.start, w30.end);
    const up = last7.length >= 3 && last7.length >= prev7.length * 1.5;
    return {
      id: t.id,
      name: t.name,
      d7: last7.length,
      d7prev: prev7.length,
      d30: last30.length,
      trend: up ? 'up' as const : 'flat' as const,
      events: last7
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
        .slice(0, 8)
        .map((ev) => ({ id: ev.id, title: ev.title, occurredAt: ev.occurredAt })),
    };
  }).sort((a, b) => b.d7 - a.d7 || b.d30 - a.d30);
}

export function radarMeta() {
  return { windowDate: dataWindow().date };
}
