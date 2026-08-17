import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { settingsView, setSetting, type SettingKey } from '@/lib/settings';

export const dynamic = 'force-dynamic';

/** GET /api/settings -- masked view only, secrets are never returned raw. */
export async function GET() {
  return NextResponse.json({ data: settingsView() });
}

const Body = z.object({
  githubToken: z.string().optional(),
  xBearerToken: z.string().optional(),
  redditClientId: z.string().optional(),
  redditClientSecret: z.string().optional(),
  llmProvider: z.enum(['deepseek', 'anthropic', 'openai', 'openrouter']).optional(),
  deepseekApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openrouterApiKey: z.string().optional(),
  strongModel: z.string().max(100).optional(),
  cheapModel: z.string().max(100).optional(),
  budgetYuan: z.number().min(0).max(1000).optional(),
});

const FIELD_TO_KEY: Record<string, SettingKey> = {
  githubToken: 'github_token',
  xBearerToken: 'x_bearer_token',
  redditClientId: 'reddit_client_id',
  redditClientSecret: 'reddit_client_secret',
  llmProvider: 'llm_provider',
  deepseekApiKey: 'deepseek_api_key',
  anthropicApiKey: 'anthropic_api_key',
  openaiApiKey: 'openai_api_key',
  openrouterApiKey: 'openrouter_api_key',
  strongModel: 'llm_strong_model',
  cheapModel: 'llm_cheap_model',
  budgetYuan: 'llm_daily_budget_yuan',
};

/**
 * PUT /api/settings -- upsert settings. Field omitted = unchanged;
 * empty string = clear; otherwise stored (DB takes precedence over .env).
 * Note: single-user localhost-first app; protect with ADMIN_TOKEN/reverse proxy
 * when exposing remotely (§11.5).
 */
export async function PUT(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.message, requestId: 'settings' } },
      { status: 400 },
    );
  }

  const updated: string[] = [];
  for (const [field, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    const key = FIELD_TO_KEY[field];
    if (!key) continue;
    setSetting(key, String(value));
    updated.push(field);
  }

  return NextResponse.json({ data: { updated, settings: settingsView() } });
}
