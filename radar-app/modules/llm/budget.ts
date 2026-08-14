import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '@/db/client';
import { costLedger } from '@/db/schema';
import { effectiveLLM } from '@/lib/settings';
import { log, redact } from '@/lib/logger';
import { toBeijingDate } from '@/lib/time';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Pricing {
  models: Record<string, { input_per_1m: number; output_per_1m: number; currency: string }>;
  fx_usd_to_cny: number;
}

let pricing: Pricing | null = null;
function loadPricing(): Pricing {
  if (pricing) return pricing;
  const p: Pricing = JSON.parse(readFileSync(join(__dirname, '..', '..', 'config', 'pricing.json'), 'utf8'));
  pricing = p;
  return p;
}

/** Compute cost in yuan for a model + token counts. Unknown models fall back to deepseek-chat rates. */
export function computeCostYuan(model: string, inputTokens: number, outputTokens: number): number {
  const p = loadPricing();
  const m = p.models[model] ?? p.models['deepseek-chat'];
  if (!m) return 0;
  const usd =
    (inputTokens / 1_000_000) * m.input_per_1m +
    (outputTokens / 1_000_000) * m.output_per_1m;
  return m.currency === 'USD' ? usd * p.fx_usd_to_cny : usd;
}

/** Spent yuan today (Beijing date window) for budget enforcement. */
export function spentToday(): number {
  const today = toBeijingDate(new Date());
  const rows = db().select().from(costLedger).all().filter((r) => r.date === today);
  return rows.reduce((sum, r) => sum + r.costYuan, 0);
}

/** Remaining budget in yuan (Settings page overrides env). */
export function remainingBudget(): number {
  return Math.max(0, effectiveLLM().budgetYuan - spentToday());
}

export class BudgetExceeded extends Error {
  constructor(public spent: number, public budget: number) {
    super(`LLM daily budget exceeded: spent ${spent.toFixed(2)} / budget ${budget}`);
    this.name = 'BudgetExceeded';
  }
}

/** Record a usage entry to the cost ledger. */
export function recordUsage(opts: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  purpose: 'score' | 'card' | 'analyze' | 'translate' | 'brief';
}): void {
  const cost = computeCostYuan(opts.model, opts.inputTokens, opts.outputTokens);
  db().insert(costLedger).values({
    id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: toBeijingDate(new Date()),
    model: opts.model,
    inputTokens: opts.inputTokens,
    outputTokens: opts.outputTokens,
    costYuan: cost,
    purpose: opts.purpose,
    createdAt: new Date().toISOString(),
  }).run();
  log.info(redact({ model: opts.model, in: opts.inputTokens, out: opts.outputTokens, costYuan: cost.toFixed(4) }), 'llm usage recorded');
}

/** Guard: throw if budget exhausted. Budget can be overridden (web Settings). */
export function assertBudget(budgetYuan: number = effectiveLLM().budgetYuan): void {
  const spent = spentToday();
  if (spent >= budgetYuan) {
    throw new BudgetExceeded(spent, budgetYuan);
  }
}
