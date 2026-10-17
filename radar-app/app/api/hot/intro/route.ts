import { NextResponse } from 'next/server'
import { clip, hasCjk, resolveIntroZh } from '@/lib/hot/intro-zh'

export const dynamic = 'force-dynamic'

const ALLOWED = new Set(['github', 'hn', 'x', 'reddit'])

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams
  const source = (sp.get('source') || '').trim()
  const title = (sp.get('title') || '').trim()
  const url = (sp.get('url') || '').trim()
  const repo = (sp.get('repo') || '').trim()

  if (!ALLOWED.has(source)) {
    return NextResponse.json({ ok: false, error: '不支持的来源' }, { status: 400 })
  }
  if (!title || title.length > 500) {
    return NextResponse.json({ ok: false, error: '标题无效' }, { status: 400 })
  }

  // GitHub: enrich with repo description when possible
  if (source === 'github') {
    const name = repo || (title.includes('/') ? title : '')
    if (name && /^[\w.-]+\/[\w.-]+$/.test(name)) {
      return githubIntro(name, url)
    }
  }

  const cacheId = url || title
  const { summaryZh, summaryZhSource } = await resolveIntroZh({
    source,
    cacheId,
    text: title,
  })

  const original = clip(title, 80)
  return NextResponse.json({
    ok: true,
    source,
    title,
    url: url || null,
    summary: original,
    summaryKind: hasCjk(title) ? 'zh' : title ? 'en' : 'empty',
    summaryZh,
    summaryZhSource,
    language: null,
    stars: null,
    meta: null,
  })
}

async function githubIntro(repo: string, fallbackUrl: string) {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'hot10-ai-tech-radar',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })
    if (!res.ok) {
      const { summaryZh, summaryZhSource } = await resolveIntroZh({
        source: 'github',
        cacheId: repo,
        text: repo,
      })
      return NextResponse.json({
        ok: false,
        error: `GitHub ${res.status}`,
        source: 'github',
        full_name: repo,
        html_url: fallbackUrl || `https://github.com/${repo}`,
        summary: '暂无仓库描述',
        summaryKind: 'empty',
        summaryZh,
        summaryZhSource,
        language: null,
        stars: null,
        topics: [],
      })
    }
    const data = (await res.json()) as {
      full_name?: string
      description?: string | null
      language?: string | null
      stargazers_count?: number
      topics?: string[]
      html_url?: string
      homepage?: string | null
    }
    const raw = (data.description || '').trim()
    let summary = ''
    let summaryKind: 'zh' | 'en' | 'empty' = 'empty'
    if (!raw) {
      summary = '暂无仓库描述'
      summaryKind = 'empty'
    } else if (hasCjk(raw)) {
      summary = clip(raw, 80)
      summaryKind = 'zh'
    } else {
      summary = clip(raw, 80)
      summaryKind = 'en'
    }
    const { summaryZh, summaryZhSource } = await resolveIntroZh({
      source: 'github',
      cacheId: repo,
      text: raw || repo,
    })
    return NextResponse.json({
      ok: true,
      source: 'github',
      full_name: data.full_name || repo,
      html_url: data.html_url || fallbackUrl || `https://github.com/${repo}`,
      homepage: data.homepage || null,
      title: data.full_name || repo,
      url: data.html_url || fallbackUrl || `https://github.com/${repo}`,
      summary,
      summaryKind,
      summaryZh,
      summaryZhSource,
      language: data.language || null,
      stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
      topics: Array.isArray(data.topics) ? data.topics.slice(0, 12) : [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '拉取失败'
    return NextResponse.json({
      ok: false,
      error: message,
      source: 'github',
      full_name: repo,
      html_url: fallbackUrl || `https://github.com/${repo}`,
      summary: '暂无仓库描述',
      summaryKind: 'empty',
      summaryZh: null,
      summaryZhSource: 'none',
      language: null,
      stars: null,
      topics: [],
    })
  }
}
