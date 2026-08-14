import type { Event, ScoreDimensions, IntelligenceCard } from '@/modules/domain/schema';

/** Prompt templates for LLM scoring (v2) and card generation (T-15/T-16). */

export const SCORE_PROMPT_VERSION = 'score_v1';
export const CARD_PROMPT_VERSION = 'card_v1';

export function renderScorePrompt(event: Pick<Event, 'title' | 'type' | 'factsJson'>, ctx: { watchlist: string[] }): string {
  return `You are an AI tech intelligence analyst. Score this event on 5 dimensions (0-100 each).

Event:
- Title: ${event.title}
- Type: ${event.type}
- Facts: ${JSON.stringify(event.factsJson)}
- Watchlist context: ${ctx.watchlist.join(', ') || '(none)'}

Dimensions:
- relevance (0-100): how relevant to the user's AI engineering interests
- impact (0-100): magnitude of effect on practitioners
- novelty (0-100): how new/unexpected (high if first occurrence)
- credibility (0-100): source trustworthiness
- urgency (0-100): time-sensitivity (breaking changes = high)

Return ONLY JSON: {"relevance":N,"impact":N,"novelty":N,"credibility":N,"urgency":N}`;
}

export function renderCardPrompt(event: Pick<Event, 'title' | 'type' | 'factsJson'>, evidence: Array<{ quote: string; url: string }>): string {
  return `Generate a structured intelligence card for this AI event. At least one evidence quote is mandatory.

Event:
- Title: ${event.title}
- Type: ${event.type}
- Facts: ${JSON.stringify(event.factsJson)}

Evidence:
${evidence.map((e, i) => `[${i + 1}] "${e.quote}" (${e.url})`).join('\n')}

Return ONLY JSON:
{
  "whatHappened": "...",
  "whyItMatters": "...",
  "whatIsDifferent": "...",
  "technicalTake": "...",
  "recommendedAction": "skip|5min|15min|clone_test|watch",
  "confidence": 0.0-1.0
}`;
}

export function parseScoreResult(parsed: unknown): ScoreDimensions | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, number>;
  const dims = {
    relevance: clampInt(p.relevance),
    impact: clampInt(p.impact),
    novelty: clampInt(p.novelty),
    credibility: clampInt(p.credibility),
    urgency: clampInt(p.urgency),
  };
  if (Object.values(dims).some((v) => Number.isNaN(v))) return null;
  return dims;
}

export function parseCardResult(parsed: unknown, eventId: string, evidenceIds: string[]): IntelligenceCard | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (!p.whatHappened || !p.whyItMatters) return null;
  if (evidenceIds.length === 0) return null; // §5.1: no evidence -> reject
  return {
    id: `card_${eventId}`,
    eventId,
    whatHappened: String(p.whatHappened),
    whyItMatters: String(p.whyItMatters),
    whatIsDifferent: String(p.whatIsDifferent ?? ''),
    technicalTake: String(p.technicalTake ?? ''),
    recommendedAction: (p.recommendedAction as IntelligenceCard['recommendedAction']) ?? 'watch',
    evidenceIds,
    confidence: Number(p.confidence ?? 0.5),
    status: 'generated',
  };
}

function clampInt(n: unknown): number {
  const v = Number(n);
  if (Number.isNaN(v)) return NaN;
  return Math.max(0, Math.min(100, Math.round(v)));
}
