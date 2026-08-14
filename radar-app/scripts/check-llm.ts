// Quick sanity check: settings resolution + adapter graceful degradation (no key).
import { LLMAdapter } from '../modules/llm/adapter';
import { effectiveLLM } from '../lib/settings';
import { closeDb } from '../db/client';

async function main() {
  const eff = effectiveLLM();
  console.log('RESOLVED:', JSON.stringify({
    provider: eff.provider, hasKey: !!eff.apiKey,
    strong: eff.strongModel, cheap: eff.cheapModel, budget: eff.budgetYuan,
  }));
  const a = new LLMAdapter();
  const r = await a.complete({ prompt: 'test', purpose: 'score' });
  const degradedOk = eff.apiKey ? 'skipped(has key)' : (r.text === '' && r.inputTokens === 0);
  console.log('ADAPTER_DEGRADED_OK:', degradedOk, '| model:', r.model);
  closeDb();
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
