import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { cfg, llmApiKey } from '@/lib/env'

export function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text)
}

export function clip(text: string, n = 72): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= n) return t
  return `${t.slice(0, n - 1)}…`
}

export function introCacheKey(source: string, idOrUrl: string): string {
  const raw = `${source}|${idOrUrl}`.toLowerCase()
  return createHash('sha1').update(raw).digest('hex').slice(0, 24)
}

type CacheFile = Record<string, { zh: string; at: string; src?: string }>

const mem = new Map<string, string>()
let fileLoaded = false

function cachePath(): string {
  const base = cfg.databasePath.includes('/')
    ? resolve(dirname(cfg.databasePath), 'hot', 'intro-zh.json')
    : resolve(process.cwd(), 'data', 'hot', 'intro-zh.json')
  return base
}

function loadFile(): void {
  if (fileLoaded) return
  fileLoaded = true
  try {
    const p = cachePath()
    if (!existsSync(p)) return
    const raw = JSON.parse(readFileSync(p, 'utf8')) as CacheFile
    for (const [k, v] of Object.entries(raw)) {
      if (v?.zh) mem.set(k, v.zh)
    }
  } catch {
    /* ignore */
  }
}

function persist(key: string, zh: string, src: string): void {
  mem.set(key, zh)
  try {
    const p = cachePath()
    mkdirSync(dirname(p), { recursive: true })
    let data: CacheFile = {}
    if (existsSync(p)) {
      try {
        data = JSON.parse(readFileSync(p, 'utf8')) as CacheFile
      } catch {
        data = {}
      }
    }
    data[key] = { zh, at: new Date().toISOString(), src: src.slice(0, 240) }
    writeFileSync(p, JSON.stringify(data, null, 2), 'utf8')
  } catch {
    /* best-effort */
  }
}

export function getCachedZh(key: string): string | null {
  loadFile()
  return mem.get(key) || null
}

function endpointForProvider(): { url: string; headers: Record<string, string>; model: string } | null {
  const key = llmApiKey()
  if (!key) return null
  const model = cfg.llm.cheapModel
  switch (cfg.llm.provider) {
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        model,
      }
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        model,
      }
    case 'openrouter':
      return {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        model,
      }
    default:
      return {
        url: 'https://api.deepseek.com/chat/completions',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        model,
      }
  }
}

async function callLlm(prompt: string): Promise<string | null> {
  const ep = endpointForProvider()
  if (!ep) return null
  try {
    const isAnthropic = cfg.llm.provider === 'anthropic'
    // Flash/Pro use reasoning_tokens; keep headroom so content is not truncated empty.
    const maxTokens = isAnthropic ? 120 : 512
    const body = isAnthropic
      ? { model: ep.model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }
      : {
          model: ep.model,
          max_tokens: maxTokens,
          temperature: 0.2,
          messages: [{ role: 'user', content: prompt }],
        }
    const res = await fetch(ep.url, {
      method: 'POST',
      headers: ep.headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Record<string, unknown>
    if (isAnthropic) {
      const content = data.content as Array<{ text?: string }> | undefined
      return content?.map((c) => c.text ?? '').join('').trim() || null
    }
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined
    return choices?.[0]?.message?.content?.trim() || null
  } catch {
    return null
  }
}

const SOURCE_HINT: Record<string, string> = {
  github: 'GitHub 仓库',
  hn: 'Hacker News 帖子',
  x: 'X（Twitter）热门话题',
  reddit: 'Reddit 帖子',
}

/**
 * Resolve ≤80-char Chinese one-liner from title/description.
 * Prefer CJK; else cache; else AI; else null.
 */
export async function resolveIntroZh(opts: {
  source: string
  cacheId: string
  text: string
}): Promise<{ summaryZh: string | null; summaryZhSource: 'cjk' | 'cache' | 'ai' | 'none' }> {
  const raw = opts.text.trim()
  if (!raw) return { summaryZh: null, summaryZhSource: 'none' }
  if (hasCjk(raw)) {
    return { summaryZh: clip(raw, 80), summaryZhSource: 'cjk' }
  }
  const key = introCacheKey(opts.source, opts.cacheId)
  const cached = getCachedZh(key)
  if (cached) return { summaryZh: clip(cached, 80), summaryZhSource: 'cache' }

  const hint = SOURCE_HINT[opts.source] || '热榜条目'
  const prompt = `把下面${hint}的英文标题/简介译成一句简体中文介绍，最多 70 个汉字，不要引号、不要解释、不要加来源名：\n${raw.slice(0, 400)}`
  const out = await callLlm(prompt)
  if (out && hasCjk(out)) {
    const zh = clip(out.replace(/^["「『]|["」』]$/g, ''), 80)
    persist(key, zh, raw)
    return { summaryZh: zh, summaryZhSource: 'ai' }
  }
  return { summaryZh: null, summaryZhSource: 'none' }
}
