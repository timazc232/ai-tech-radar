import { db, rawDb } from '@/db/client';
import { entity, event, eventBrief, eventEvidence, intelligenceCard } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LLMAdapter } from '@/modules/llm/adapter';
import { effectiveLLM } from '@/lib/settings';
import { log } from '@/lib/logger';
import { BudgetExceeded } from '@/modules/llm/budget';
import type { Fact } from '@/modules/domain/schema';
import { heuristicBriefing } from './heuristic';
import { parseBriefingResult, renderBriefingPrompt } from './parse';
import type { EventBriefing } from './types';

export type { EventBriefing } from './types';

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS event_brief (
  event_id TEXT PRIMARY KEY REFERENCES event(id),
  headline TEXT NOT NULL,
  headline_en TEXT,
  project_name TEXT NOT NULL,
  project_kind TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  version_label TEXT,
  change_points TEXT NOT NULL DEFAULT '[]',
  change_detail TEXT NOT NULL DEFAULT '',
  model TEXT,
  generated_at TEXT NOT NULL
);
`;

export function ensureBriefTable(): void {
  rawDb().exec(CREATE_SQL);
}

export function getEventBriefing(eventId: string): EventBriefing | null {
  ensureBriefTable();
  const row = db().select().from(eventBrief).where(eq(eventBrief.eventId, eventId)).get();
  if (!row) return null;
  return {
    headline: row.headline,
    headlineEn: row.headlineEn,
    projectName: row.projectName,
    projectKind: row.projectKind as EventBriefing['projectKind'],
    actorName: row.actorName,
    actorKind: row.actorKind as EventBriefing['actorKind'],
    versionLabel: row.versionLabel,
    changePoints: Array.isArray(row.changePoints) ? (row.changePoints as string[]) : [],
    changeDetail: row.changeDetail ?? '',
    model: row.model,
  };
}

function persistBrief(eventId: string, brief: EventBriefing): void {
  const now = new Date().toISOString();
  db().insert(eventBrief).values({
    eventId,
    headline: brief.headline,
    headlineEn: brief.headlineEn,
    projectName: brief.projectName,
    projectKind: brief.projectKind,
    actorName: brief.actorName,
    actorKind: brief.actorKind,
    versionLabel: brief.versionLabel,
    changePoints: brief.changePoints,
    changeDetail: brief.changeDetail,
    model: brief.model,
    generatedAt: now,
  }).onConflictDoUpdate({
    target: eventBrief.eventId,
    set: {
      headline: brief.headline,
      headlineEn: brief.headlineEn,
      projectName: brief.projectName,
      projectKind: brief.projectKind,
      actorName: brief.actorName,
      actorKind: brief.actorKind,
      versionLabel: brief.versionLabel,
      changePoints: brief.changePoints,
      changeDetail: brief.changeDetail,
      model: brief.model,
      generatedAt: now,
    },
  }).run();
}

function collectInput(eventId: string) {
  const ev = db().select().from(event).where(eq(event.id, eventId)).get();
  if (!ev) return null;
  const ent = db().select().from(entity).where(eq(entity.id, ev.entityId)).get();
  const evidence = db().select().from(eventEvidence).where(eq(eventEvidence.eventId, eventId)).all();
  const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, eventId)).get();
  const facts = (ev.factsJson as Fact[]) ?? [];
  return { ev, ent, evidence, card, facts };
}

export async function organizeEvents(eventIds: string[], opts: { force?: boolean } = {}): Promise<{
  organized: number;
  heuristic: number;
  skipped: number;
  failed: number;
  reason?: string;
}> {
  ensureBriefTable();
  const unique = [...new Set(eventIds)];
  const eff = effectiveLLM();
  const adapter = eff.apiKey ? new LLMAdapter() : null;

  let organized = 0;
  let heuristic = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of unique) {
    const existing = getEventBriefing(id);
    if (existing && !opts.force) {
      skipped++;
      continue;
    }
    const input = collectInput(id);
    if (!input) {
      skipped++;
      continue;
    }
    const base = heuristicBriefing({
      title: input.ev.title,
      eventType: input.ev.type,
      entityName: input.ent?.name ?? '',
      facts: input.facts,
    });

    if (!adapter) {
      persistBrief(id, base);
      heuristic++;
      continue;
    }

    try {
      const notes = input.facts.find((f) => f.key === 'notes')?.value ?? '';
      const res = await adapter.complete({
        model: eff.cheapModel,
        prompt: renderBriefingPrompt({
          title: input.ev.title,
          type: input.ev.type,
          entityName: input.ent?.name ?? '',
          facts: input.facts.filter((f) => f.key !== 'notes').concat(notes ? [{ key: 'notes', value: notes.slice(0, 1800) }] : []),
          evidence: [
            ...input.evidence.map((e) => ({ quote: e.quote, url: e.url })),
            ...(input.card ? [{ quote: input.card.whatHappened, url: 'card' }] : []),
          ],
        }),
        maxTokens: 1400,
        purpose: 'brief',
      });
      const parsed = parseBriefingResult(res.parsed, { ...base, model: res.model });
      if (!parsed) {
        persistBrief(id, base);
        heuristic++;
        continue;
      }
      persistBrief(id, { ...parsed, model: res.model });
      organized++;
    } catch (err) {
      if (err instanceof BudgetExceeded) {
        persistBrief(id, base);
        return { organized, heuristic: heuristic + 1, skipped: skipped + unique.length - organized - heuristic - skipped - failed - 1, failed, reason: 'budget' };
      }
      persistBrief(id, base);
      failed++;
      log.warn({ event: id, err: (err as Error).message }, 'briefing llm failed, stored heuristic');
    }
  }

  log.info({ organized, heuristic, skipped, failed }, 'event briefing done');
  return { organized, heuristic, skipped, failed };
}
