// LLM v2 enhancement for the daily pipeline (Week 2 slice, wired into first-slice run):
//  - v2 score (LLM dimensions) -> score_snapshot v2
//  - intelligence card -> intelligence_card
// Graceful: no key or any failure -> keep rules (v1) score, pipeline never breaks.

import { db } from '@/db/client';
import { event, eventEvidence, intelligenceCard, scoreSnapshot } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { LLMAdapter } from './adapter';
import { parseCardResult, parseScoreResult, renderCardPrompt, renderScorePrompt } from './prompts';
import { weightedTotal } from '@/modules/scoring/rules';
import { effectiveLLM } from '@/lib/settings';
import { deterministicId } from '@/lib/hash';
import { log } from '@/lib/logger';
import type { ScoredEvent } from '@/modules/scoring/select';
import type { Event as DomainEvent, Fact } from '@/modules/domain/schema';

/** Cap LLM calls per run to bound cost (rules score covers the rest). */
export const LLM_MAX_PER_RUN = 8;

export async function llmEnhance(scored: ScoredEvent[]): Promise<ScoredEvent[]> {
  const eff = effectiveLLM();
  if (!eff.apiKey) return scored;

  const adapter = new LLMAdapter();
  const head = scored.slice(0, LLM_MAX_PER_RUN);
  const tail = scored.slice(LLM_MAX_PER_RUN);
  const out: ScoredEvent[] = [];

  for (const s of head) {
    let current = s;
    try {
      const ev = db().select().from(event).where(eq(event.id, s.eventId)).get();
      if (!ev) {
        out.push(s);
        continue;
      }
      const facts = (ev.factsJson as Fact[]) ?? [];

      // 1) v2 score
      const scoreRes = await adapter.complete({
        model: eff.cheapModel,
        prompt: renderScorePrompt({ title: ev.title, type: ev.type as DomainEvent['type'], factsJson: facts }, { watchlist: [] }),
        purpose: 'score',
      });
      const dims = scoreRes.parsed ? parseScoreResult(scoreRes.parsed) : null;
      if (dims) {
        dims.novelty = s.dimensions.novelty; // keep FTS-assessed novelty
        const total = weightedTotal(dims);
        const nowScore = new Date().toISOString();
        // onConflictDoUpdate: re-scoring the same event refreshes its v2 snapshot
        // instead of throwing UNIQUE constraint failed: score_snapshot.id
        db().insert(scoreSnapshot).values({
          id: deterministicId('sc', s.eventId, 'v2'),
          eventId: s.eventId,
          profileId: 'local',
          dimensions: dims,
          total,
          scorer: 'llm',
          version: 2,
          weightDiff: {},
          model: eff.cheapModel,
          promptVersion: 'score_v1',
          generatedAt: nowScore,
        }).onConflictDoUpdate({
          target: scoreSnapshot.id,
          set: {
            dimensions: dims,
            total,
            model: eff.cheapModel,
            promptVersion: 'score_v1',
            generatedAt: nowScore,
          },
        }).run();
        current = { ...s, dimensions: dims, total };
        log.info({ event: s.eventId, v1: s.total, v2: total }, 'llm v2 score applied');
      }

      // 2) intelligence card (requires >=1 evidence)
      const evidence = db().select().from(eventEvidence).where(eq(eventEvidence.eventId, s.eventId)).all();
      const cardRes = await adapter.complete({
        model: eff.strongModel,
        prompt: renderCardPrompt(
          { title: ev.title, type: ev.type as DomainEvent['type'], factsJson: facts },
          evidence.map((e) => ({ quote: e.quote, url: e.url })),
        ),
        purpose: 'card',
      });
      const card = cardRes.parsed ? parseCardResult(cardRes.parsed, s.eventId, evidence.map((e) => e.id)) : null;
      if (card) {
        const now = new Date().toISOString();
        db().insert(intelligenceCard).values({ ...card, generatedAt: now })
          .onConflictDoUpdate({ target: intelligenceCard.id, set: { ...card, generatedAt: now } })
          .run();
        log.info({ event: s.eventId, action: card.recommendedAction }, 'intelligence card generated');
      }
    } catch (err) {
      log.warn({ event: s.eventId, err: (err as Error).message }, 'llm enhance failed, keep rules score');
    }
    out.push(current);
  }

  return [...out, ...tail];
}
