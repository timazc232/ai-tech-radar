// Web Settings page backed config (§2 question: secrets manageable from UI).
// Resolution precedence: DB (Settings page) > .env.local/.env > defaults.
// Secrets are NEVER returned raw by the API — only masked previews.

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cfg, type LLMProvider } from './env';

export const SETTING_KEYS = [
  'github_token',
  'llm_provider',
  'deepseek_api_key',
  'anthropic_api_key',
  'openai_api_key',
  'openrouter_api_key',
  'x_bearer_token',
  'reddit_client_id',
  'reddit_client_secret',
  'llm_strong_model',
  'llm_cheap_model',
  'llm_daily_budget_yuan',
  'learning_paused',
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];

export function getSetting(key: SettingKey): string | null {
  const row = db().select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? null;
}

export function setSetting(key: SettingKey, value: string): void {
  if (value === '') {
    db().delete(appSettings).where(eq(appSettings.key, key)).run();
    return;
  }
  db().insert(appSettings).values({ key, value, updatedAt: new Date().toISOString() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date().toISOString() } })
    .run();
}

// ===== effective (resolved) values used at runtime =====

export function effectiveGitHubToken(): string {
  return getSetting('github_token') || cfg.githubToken;
}

export function effectiveSocialCredentials() {
  return {
    xBearerToken: getSetting('x_bearer_token') || process.env.X_BEARER_TOKEN || '',
    redditClientId: getSetting('reddit_client_id') || process.env.REDDIT_CLIENT_ID || '',
    redditClientSecret: getSetting('reddit_client_secret') || process.env.REDDIT_CLIENT_SECRET || '',
    redditUserAgent: process.env.REDDIT_USER_AGENT || 'ai-tech-radar/0.1 by local-user',
  };
}

export interface EffectiveLLM {
  provider: LLMProvider;
  apiKey: string;
  strongModel: string;
  cheapModel: string;
  budgetYuan: number;
}

export function effectiveLLM(): EffectiveLLM {
  const provider = (getSetting('llm_provider') || cfg.llm.provider) as LLMProvider;
  let apiKey = '';
  switch (provider) {
    case 'deepseek':
      apiKey = getSetting('deepseek_api_key') || process.env.DEEPSEEK_API_KEY || '';
      break;
    case 'anthropic':
      apiKey = getSetting('anthropic_api_key') || process.env.ANTHROPIC_API_KEY || '';
      break;
    case 'openai':
      apiKey = getSetting('openai_api_key') || process.env.OPENAI_API_KEY || '';
      break;
    case 'openrouter':
      apiKey = getSetting('openrouter_api_key') || process.env.OPENROUTER_API_KEY || '';
      break;
  }
  const budgetRaw = getSetting('llm_daily_budget_yuan');
  return {
    provider,
    apiKey,
    strongModel: getSetting('llm_strong_model') || cfg.llm.strongModel,
    cheapModel: getSetting('llm_cheap_model') || cfg.llm.cheapModel,
    budgetYuan: budgetRaw ? Number(budgetRaw) : cfg.llm.dailyBudgetYuan,
  };
}

// ===== masked view for the API (never returns raw secrets) =====

export function maskSecret(v: string): string {
  if (!v) return '';
  if (v.length <= 8) return '****';
  return `${v.slice(0, 4)}****${v.slice(-4)}`;
}

export interface SecretInfo {
  configured: boolean;
  source: 'settings' | 'env' | null;
  masked: string;
}

function secretInfo(dbValue: string | null, envValue: string): SecretInfo {
  if (dbValue) return { configured: true, source: 'settings', masked: maskSecret(dbValue) };
  if (envValue) return { configured: true, source: 'env', masked: maskSecret(envValue) };
  return { configured: false, source: null, masked: '' };
}

export function settingsView() {
  const llm = effectiveLLM();
  return {
    githubToken: secretInfo(getSetting('github_token'), cfg.githubToken),
    social: {
      xBearerToken: secretInfo(getSetting('x_bearer_token'), process.env.X_BEARER_TOKEN || ''),
      redditClientId: secretInfo(getSetting('reddit_client_id'), process.env.REDDIT_CLIENT_ID || ''),
      redditClientSecret: secretInfo(getSetting('reddit_client_secret'), process.env.REDDIT_CLIENT_SECRET || ''),
    },
    llm: {
      provider: llm.provider,
      apiKey: secretInfo(
        getSetting(`${llm.provider}_api_key` as SettingKey),
        process.env[`${llm.provider.toUpperCase()}_API_KEY`] ?? '',
      ),
      strongModel: llm.strongModel,
      cheapModel: llm.cheapModel,
      budgetYuan: llm.budgetYuan,
    },
    learningPaused: getSetting('learning_paused') === '1',
  };
}
