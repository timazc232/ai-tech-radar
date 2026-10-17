import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function hasCjk(text: string): boolean {
  return /[\u3400-\u9fff]/.test(text)
}

function clip(text: string, n = 80): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= n) return t
  return `${t.slice(0, n - 1)}…`
}

export async function GET(req: Request) {
  const repo = new URL(req.url).searchParams.get('repo')?.trim() || ''
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ ok: false, error: '仓库名无效' }, { status: 400 })
  }

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
      return NextResponse.json(
        { ok: false, error: `GitHub ${res.status}`, full_name: repo, html_url: `https://github.com/${repo}` },
        { status: 200 },
      )
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
      summary = clip(raw)
      summaryKind = 'zh'
    } else {
      summary = clip(raw)
      summaryKind = 'en'
    }
    return NextResponse.json({
      ok: true,
      full_name: data.full_name || repo,
      html_url: data.html_url || `https://github.com/${repo}`,
      homepage: data.homepage || null,
      summary,
      summaryKind,
      language: data.language || null,
      stars: typeof data.stargazers_count === 'number' ? data.stargazers_count : null,
      topics: Array.isArray(data.topics) ? data.topics.slice(0, 12) : [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '拉取失败'
    return NextResponse.json(
      { ok: false, error: message, full_name: repo, html_url: `https://github.com/${repo}` },
      { status: 200 },
    )
  }
}
