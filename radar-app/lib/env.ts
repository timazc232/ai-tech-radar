// Centralized config. Plain object (no eager validation) so it never throws on import.
// Required vars are validated at point of use (e.g. GitHub collector checks token presence).
//
// Also loads .env.local / .env for non-Next contexts (worker CLI via tsx),
// since tsx does not load dotenv files itself. Real env vars always win.

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(): void {
  for (const f of ['.env.local', '.env']) {
    const p = resolve(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (/^\s*(#|$)/.test(line)) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const [, key, raw] = m;
      if (process.env[key] !== undefined && process.env[key] !== '') continue;
      process.env[key] = raw.replace(/^["']|["']$/g, '').trim();
    }
  }
}
loadEnvFile();

export type LLMProvider = 'anthropic' | 'deepseek' | 'openai' | 'openrouter';

export const cfg = {
  githubToken: process.env.GITHUB_TOKEN ?? '',
  databasePath: process.env.DATABASE_PATH ?? './data/radar.db',
  timezone: process.env.TIMEZONE ?? 'Asia/Shanghai',
  llm: {
    provider: (process.env.LLM_PROVIDER ?? 'deepseek') as LLMProvider,
    strongModel: process.env.LLM_STRONG_MODEL ?? 'deepseek-chat',
    cheapModel: process.env.LLM_CHEAP_MODEL ?? 'deepseek-chat',
    dailyBudgetYuan: Number(process.env.LLM_DAILY_BUDGET_YUAN ?? 10),
  },
  adminToken: process.env.ADMIN_TOKEN,
  bindHost: process.env.BIND_HOST ?? '127.0.0.1',
};

/** Resolve the API key for the configured provider. */
export function llmApiKey(): string {
  switch (cfg.llm.provider) {
    case 'deepseek':
      return process.env.DEEPSEEK_API_KEY ?? '';
    case 'openai':
      return process.env.OPENAI_API_KEY ?? '';
    case 'openrouter':
      return process.env.OPENROUTER_API_KEY ?? '';
    default:
      return process.env.ANTHROPIC_API_KEY ?? '';
  }
}

/** Assert a required secret is present at runtime (call at the point of use). */
export function requireGitHubToken(): string {
  if (!cfg.githubToken) {
    throw new Error('GITHUB_TOKEN is required. Set it in .env.local');
  }
  return cfg.githubToken;
}
