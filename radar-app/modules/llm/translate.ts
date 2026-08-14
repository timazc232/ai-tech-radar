import { db, rawDb } from '@/db/client';
import { event, eventEvidence, eventI18n, intelligenceCard } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LLMAdapter } from './adapter';
import { effectiveLLM } from '@/lib/settings';
import { log } from '@/lib/logger';
import { BudgetExceeded } from './budget';
import { isMostlyChinese } from '@/lib/i18n';

export { isMostlyChinese, differsFromOriginal } from '@/lib/i18n';

export interface EventZh {
  titleZh?: string | null;
  whatZh?: string | null;
  whyZh?: string | null;
  differenceZh?: string | null;
  takeZh?: string | null;
  quotesZh?: Record<string, string>;
}

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS event_i18n (
  event_id TEXT PRIMARY KEY REFERENCES event(id),
  title_zh TEXT,
  what_zh TEXT,
  why_zh TEXT,
  difference_zh TEXT,
  take_zh TEXT,
  quotes_zh TEXT DEFAULT '{}',
  model TEXT,
  generated_at TEXT NOT NULL
);
`;

export function ensureI18nTable(): void {
  rawDb().exec(CREATE_SQL);
}

export function getEventZh(eventId: string): EventZh | null {
  ensureI18nTable();
  const row = db().select().from(eventI18n).where(eq(eventI18n.eventId, eventId)).get();
  if (!row) return null;
  return {
    titleZh: row.titleZh,
    whatZh: row.whatZh,
    whyZh: row.whyZh,
    differenceZh: row.differenceZh,
    takeZh: row.takeZh,
    quotesZh: (row.quotesZh as Record<string, string> | null) ?? {},
  };
}

export interface TranslatePayload {
  title: string;
  whatHappened?: string;
  whyItMatters?: string;
  whatIsDifferent?: string;
  technicalTake?: string;
  quotes: Record<string, string>;
}

export function buildTranslatePrompt(payload: TranslatePayload): string {
  return `将以下 AI 技术事件字段译为简体中文。
规则：
- 保留产品名、仓库名、版本号、CVE、URL、命令原样
- 不要解释、不要增删事实
- 已是中文的字段原样返回
- 只输出 JSON，键名与输入完全一致

输入：
${JSON.stringify(payload, null, 2)}`;
}

export function parseTranslateResult(parsed: unknown, keys: TranslatePayload): TranslatePayload | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  const quotesIn = keys.quotes;
  const quotesOut: Record<string, string> = {};
  const rawQuotes = p.quotes;
  if (rawQuotes && typeof rawQuotes === 'object') {
    for (const id of Object.keys(quotesIn)) {
      const v = (rawQuotes as Record<string, unknown>)[id];
      if (typeof v === 'string' && v.trim()) quotesOut[id] = v.trim();
    }
  }
  return {
    title: pickStr(p.title, keys.title),
    whatHappened: keys.whatHappened ? pickStr(p.whatHappened, keys.whatHappened) : undefined,
    whyItMatters: keys.whyItMatters ? pickStr(p.whyItMatters, keys.whyItMatters) : undefined,
    whatIsDifferent: keys.whatIsDifferent ? pickStr(p.whatIsDifferent, keys.whatIsDifferent) : undefined,
    technicalTake: keys.technicalTake ? pickStr(p.technicalTake, keys.technicalTake) : undefined,
    quotes: quotesOut,
  };
}

function pickStr(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v.trim() : fallback;
}

function collectPayload(eventId: string): TranslatePayload | null {
  const ev = db().select().from(event).where(eq(event.id, eventId)).get();
  if (!ev) return null;
  const card = db().select().from(intelligenceCard).where(eq(intelligenceCard.eventId, eventId)).get();
  const evidence = db().select().from(eventEvidence).where(eq(eventEvidence.eventId, eventId)).all();
  const quotes: Record<string, string> = {};
  for (const e of evidence) {
    if (e.quote && !isMostlyChinese(e.quote)) quotes[e.id] = e.quote;
  }
  return {
    title: ev.title,
    whatHappened: card?.whatHappened || undefined,
    whyItMatters: card?.whyItMatters || undefined,
    whatIsDifferent: card?.whatIsDifferent || undefined,
    technicalTake: card?.technicalTake || undefined,
    quotes,
  };
}

function persistZh(eventId: string, zh: TranslatePayload, model: string): void {
  const now = new Date().toISOString();
  db().insert(eventI18n).values({
    eventId,
    titleZh: zh.title,
    whatZh: zh.whatHappened ?? null,
    whyZh: zh.whyItMatters ?? null,
    differenceZh: zh.whatIsDifferent ?? null,
    takeZh: zh.technicalTake ?? null,
    quotesZh: zh.quotes,
    model,
    generatedAt: now,
  }).onConflictDoUpdate({
    target: eventI18n.eventId,
    set: {
      titleZh: zh.title,
      whatZh: zh.whatHappened ?? null,
      whyZh: zh.whyItMatters ?? null,
      differenceZh: zh.whatIsDifferent ?? null,
      takeZh: zh.technicalTake ?? null,
      quotesZh: zh.quotes,
      model,
      generatedAt: now,
    },
  }).run();
}

export async function translateEvents(eventIds: string[]): Promise<{
  translated: number;
  skipped: number;
  failed: number;
  reason?: string;
}> {
  ensureI18nTable();
  const unique = [...new Set(eventIds)];
  const eff = effectiveLLM();
  if (!eff.apiKey) {
    return { translated: 0, skipped: unique.length, failed: 0, reason: 'no_api_key' };
  }

  const adapter = new LLMAdapter();
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const id of unique) {
    const existing = getEventZh(id);
    const payload = collectPayload(id);
    if (!payload) {
      skipped++;
      continue;
    }
    const needs =
      !existing?.titleZh
      || (payload.whyItMatters && !existing.whyZh)
      || (payload.whatHappened && !existing.whatZh);
    if (!needs && existing) {
      skipped++;
      continue;
    }
    if (isMostlyChinese(payload.title) && !payload.whyItMatters && Object.keys(payload.quotes).length === 0) {
      persistZh(id, payload, 'passthrough');
      skipped++;
      continue;
    }

    try {
      const res = await adapter.complete({
        model: eff.cheapModel,
        prompt: buildTranslatePrompt(payload),
        maxTokens: 1200,
        purpose: 'translate',
      });
      const parsed = parseTranslateResult(res.parsed, payload);
      if (!parsed) {
        failed++;
        log.warn({ event: id }, 'translate parse failed');
        continue;
      }
      persistZh(id, parsed, res.model);
      translated++;
    } catch (err) {
      if (err instanceof BudgetExceeded) {
        log.warn({ event: id }, 'translate stopped: budget exceeded');
        return { translated, skipped: skipped + (unique.length - translated - skipped - failed - 1), failed, reason: 'budget' };
      }
      failed++;
      log.warn({ event: id, err: (err as Error).message }, 'translate failed');
    }
  }

  log.info({ translated, skipped, failed }, 'translate batch done');
  return { translated, skipped, failed };
}
