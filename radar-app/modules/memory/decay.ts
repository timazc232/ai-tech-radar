import type { Memory } from '@/modules/domain/schema';
import {
  INTEREST_DECAY_DAYS, INTEREST_REGRESSION_RATE,
  RESEARCH_FULL_DAYS, RESEARCH_DECAY_DAYS,
} from '@/modules/domain/enums';

/** Days between two ISO timestamps (b - a), floored. */
export function daysBetween(aIso: string, bIso: string | Date): number {
  const a = new Date(aIso).getTime();
  const b = (typeof bIso === 'string' ? new Date(bIso) : bIso).getTime();
  return Math.floor((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * §8.2 Interest memory decay: 90 days without feedback -> linear regression to base (0.001/day).
 */
export function decayInterest(mem: Memory, now: Date = new Date()): Memory {
  if (mem.type !== 'interest' || mem.status !== 'active') return mem;
  const lastFb = (mem.content.lastFeedbackAt as string) ?? mem.updatedAt;
  const daysSince = daysBetween(lastFb, now);
  if (daysSince <= INTEREST_DECAY_DAYS) return mem;

  const regressDays = daysSince - INTEREST_DECAY_DAYS;
  const base = (mem.content.base as number) ?? 0.3;
  const current = (mem.content.weight as number) ?? 0.5;
  const regressed = Math.max(base, current - INTEREST_REGRESSION_RATE * regressDays);
  if (regressed === current) return mem;
  return {
    ...mem,
    content: { ...mem.content, weight: regressed },
    updatedAt: now.toISOString(),
  };
}

/**
 * §8.2 Research memory decay: 30 days full -> 15 days linear decay -> auto-pause.
 */
export function decayResearch(mem: Memory, now: Date = new Date()): Memory {
  if (mem.type !== 'research' || mem.status !== 'active') return mem;
  const age = daysBetween(mem.createdAt, now);
  if (age <= RESEARCH_FULL_DAYS) return mem; // full weight
  if (age > RESEARCH_FULL_DAYS + RESEARCH_DECAY_DAYS) {
    return { ...mem, status: 'paused', updatedAt: now.toISOString() };
  }
  const decayProgress = (age - RESEARCH_FULL_DAYS) / RESEARCH_DECAY_DAYS;
  const current = (mem.content.weight as number) ?? 1.0;
  const decayed = current * (1 - decayProgress);
  return {
    ...mem,
    content: { ...mem.content, weight: decayed },
    updatedAt: now.toISOString(),
  };
}

/** Apply both decay types based on memory type. */
export function decayMemory(mem: Memory, now: Date = new Date()): Memory {
  if (mem.type === 'interest') return decayInterest(mem, now);
  if (mem.type === 'research') return decayResearch(mem, now);
  return mem;
}
