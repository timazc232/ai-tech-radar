import type { LLMProvider } from '@/lib/env';
import { effectiveLLM } from '@/lib/settings';
import { log, redact } from '@/lib/logger';
import { assertBudget, recordUsage } from './budget';

export interface LLMCompleteOptions {
  model?: string;
  prompt: string;
  schema?: Record<string, unknown>; // JSON schema hint for structured output
  maxTokens?: number;
  purpose?: 'score' | 'card' | 'analyze' | 'translate' | 'brief';
}

export interface LLMResult {
  text: string;
  parsed?: unknown;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * LLM Adapter (§5.8, T-13): provider switching + budget + retry + structured output.
 * Providers:
 *  - deepseek   : https://api.deepseek.com (OpenAI-compatible chat/completions)
 *  - anthropic  : https://api.anthropic.com/v1/messages
 *  - openai / openrouter : OpenAI-compatible chat/completions
 */
export class LLMAdapter {
  // provider override is optional; defaults resolve from Settings/env at call time
  constructor(private providerOverride?: LLMProvider) {}

  async complete(opts: LLMCompleteOptions): Promise<LLMResult> {
    const eff = effectiveLLM();
    this.provider = this.providerOverride ?? eff.provider;
    const model = opts.model ?? eff.cheapModel;
    assertBudget(eff.budgetYuan);

    if (!eff.apiKey) {
      log.warn({ provider: this.provider, model, reason: 'no api key' }, 'llm degraded to stub');
      return { text: '', parsed: null, inputTokens: 0, outputTokens: 0, model };
    }

    return this.callProvider(opts, model, eff.apiKey);
  }

  private provider: LLMProvider = 'deepseek';

  private async callProvider(opts: LLMCompleteOptions, model: string, apiKey: string, attempt = 1): Promise<LLMResult> {
    try {
      const resp = await fetch(this.endpoint(), {
        method: 'POST',
        headers: this.headers(apiKey),
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify(this.buildBody(opts, model)),
      });

      if (!resp.ok) {
        if (resp.status >= 500 && attempt < 3) {
          await sleep(2 ** attempt * 500);
          return this.callProvider(opts, model, apiKey, attempt + 1);
        }
        throw new Error(`llm ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
      }

      const data = (await resp.json()) as Record<string, unknown>;
      const result = this.parseResponse(data, model);
      recordUsage({
        model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        purpose: opts.purpose ?? 'score',
      });
      return result;
    } catch (err) {
      if (attempt < 3 && (err as Error).name !== 'BudgetExceeded') {
        await sleep(2 ** attempt * 500);
        return this.callProvider(opts, model, apiKey, attempt + 1);
      }
      log.error(redact({ provider: this.provider, err: (err as Error).message }), 'llm call failed');
      throw err;
    }
  }

  private endpoint(): string {
    switch (this.provider) {
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      case 'deepseek':
        return 'https://api.deepseek.com/chat/completions';
      case 'openai':
        return 'https://api.openai.com/v1/chat/completions';
      default:
        return 'https://openrouter.ai/api/v1/chat/completions';
    }
  }

  private headers(apiKey: string): Record<string, string> {
    const base: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    if (this.provider === 'anthropic') {
      base['x-api-key'] = apiKey;
      base['anthropic-version'] = '2023-06-01';
    }
    return base;
  }

  private buildBody(opts: LLMCompleteOptions, model: string): Record<string, unknown> {
    if (this.provider === 'anthropic') {
      return {
        model,
        max_tokens: opts.maxTokens ?? 1024,
        messages: [{ role: 'user', content: opts.prompt }],
      };
    }
    // OpenAI-compatible: deepseek / openai / openrouter
    return {
      model,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: 0.2,
      messages: [{ role: 'user', content: opts.prompt }],
    };
  }

  private parseResponse(data: Record<string, unknown>, model: string): LLMResult {
    let text = '';
    let inputTokens = 0;
    let outputTokens = 0;

    if (this.provider === 'anthropic') {
      // { content: [{ type: 'text', text }], usage: { input_tokens, output_tokens } }
      const content = data.content as Array<{ text?: string }> | undefined;
      text = content?.map((c) => c.text ?? '').join('') ?? '';
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      inputTokens = usage?.input_tokens ?? 0;
      outputTokens = usage?.output_tokens ?? 0;
    } else {
      // OpenAI-compatible: { choices: [{ message: { content } }], usage: { prompt_tokens, completion_tokens } }
      const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
      text = choices?.[0]?.message?.content ?? '';
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      inputTokens = usage?.prompt_tokens ?? 0;
      outputTokens = usage?.completion_tokens ?? 0;
    }

    return { text, parsed: tryParse(text), inputTokens, outputTokens, model };
  }
}

function tryParse(text: string): unknown {
  // strip possible markdown code fences around JSON
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
