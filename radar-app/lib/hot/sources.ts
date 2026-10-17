const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

export type HotKind = 'post' | 'topic'

export type HotSourceMeta = {
  id: string
  name: string
  kind: HotKind
}

export type HotItem = {
  rank: number
  title: string
  heat: string | null
  url: string
}

export const SOURCES: HotSourceMeta[] = [
  { id: 'github', name: 'GitHub', kind: 'post' },
  { id: 'hn', name: 'Hacker News', kind: 'post' },
  { id: 'reddit', name: 'Reddit', kind: 'post' },
  { id: 'v2ex', name: 'V2EX', kind: 'post' },
  { id: 'x', name: 'X', kind: 'topic' },
  { id: 'weibo', name: '微博', kind: 'post' },
  { id: 'zhihu', name: '知乎', kind: 'post' },
  { id: 'juejin', name: '掘金', kind: 'post' },
]

async function getText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html,application/json', ...headers },
    signal: AbortSignal.timeout(14000),
    redirect: 'follow',
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }
  return text
}

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function top(items: Array<{ title?: string | null; heat?: string | null; url?: string | null }>, n = 10): HotItem[] {
  return items
    .filter((it) => it && it.title && it.url)
    .slice(0, n)
    .map((it, i) => ({
      rank: i + 1,
      title: String(it.title).trim(),
      heat: it.heat ? String(it.heat).trim() : null,
      url: String(it.url),
    }))
}

async function fetchGithub(): Promise<HotItem[]> {
  const html = await getText('https://github.com/trending?since=daily')
  const articles = [...html.matchAll(/<article class="Box-row">([\s\S]*?)<\/article>/g)]
  const items = articles.map((m) => {
    const block = m[1]
    const href = block.match(/<h2[\s\S]*?href="(\/[^"]+)"/)
    if (!href) return null
    const path = href[1].split('?')[0]
    const text = strip(block)
    const today = text.match(/([\d,]+)\s+stars today/i)
    return {
      title: path.replace(/^\//, ''),
      heat: today ? `${today[1]} stars today` : null,
      url: `https://github.com${path}`,
    }
  })
  return top(items.filter(Boolean) as Array<{ title: string; heat: string | null; url: string }>)
}

async function fetchHn(): Promise<HotItem[]> {
  const ids = JSON.parse(await getText('https://hacker-news.firebaseio.com/v0/topstories.json')) as number[]
  const stories = await Promise.all(
    ids.slice(0, 10).map(async (id) => {
      const raw = await getText(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
      return JSON.parse(raw) as { title?: string; score?: number; url?: string; id: number }
    }),
  )
  return top(
    stories.map((s) => ({
      title: s.title,
      heat: typeof s.score === 'number' ? `${s.score} 分` : null,
      url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
    })),
  )
}

async function fetchReddit(): Promise<HotItem[]> {
  const urls = [
    'https://www.reddit.com/r/popular/hot.json?limit=10&raw_json=1',
    'https://old.reddit.com/r/popular/hot.json?limit=10&raw_json=1',
  ]
  let lastErr: Error | null = null
  for (const endpoint of urls) {
    try {
      const raw = await getText(endpoint, {
        Accept: 'application/json',
      })
      if (raw.trim().startsWith('<')) throw new Error('Reddit 返回了网页而不是 JSON')
      const json = JSON.parse(raw) as {
        data?: { children?: Array<{ data?: { title?: string; score?: number; permalink?: string; url?: string } }> }
      }
      const children = json?.data?.children || []
      const items = top(
        children.map((c) => {
          const d = c.data || {}
          return {
            title: d.title,
            heat: typeof d.score === 'number' ? `${d.score} 分` : null,
            url: d.permalink ? `https://www.reddit.com${d.permalink}` : d.url,
          }
        }),
      )
      if (items.length) return items
      throw new Error('空榜')
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e))
    }
  }
  throw lastErr || new Error('Reddit 拉取失败')
}

async function fetchV2ex(): Promise<HotItem[]> {
  const list = JSON.parse(await getText('https://www.v2ex.com/api/topics/hot.json', { Accept: 'application/json' })) as Array<{
    title?: string
    replies?: number
    url?: string
    id?: number
  }>
  return top(
    list.map((t) => ({
      title: t.title,
      heat: typeof t.replies === 'number' ? `${t.replies} 回复` : null,
      url: t.url || (t.id ? `https://www.v2ex.com/t/${t.id}` : ''),
    })),
  )
}

function decodeTrend(href: string): string {
  const m = href.match(/\/trend\/([^/]+)\/?/)
  if (!m) return ''
  try {
    return decodeURIComponent(m[1]).replace(/\+/g, ' ')
  } catch {
    return m[1]
  }
}

async function fetchGetDayTrends(): Promise<HotItem[]> {
  const html = await getText('https://getdaytrends.com/')
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  const items: Array<{ title: string; heat: null; url: string }> = []
  for (const row of rows) {
    const href = row[1].match(/href="(\/trend\/[^"]+)"/)
    if (!href) continue
    const title = decodeTrend(href[1])
    if (!title) continue
    items.push({
      title,
      heat: null,
      url: `https://x.com/search?q=${encodeURIComponent(title)}&src=typed_query&f=live`,
    })
    if (items.length >= 10) break
  }
  if (!items.length) throw new Error('getdaytrends 解析失败')
  return top(items)
}

async function fetchTrends24Names(): Promise<string[]> {
  const html = await getText('https://trends24.in/')
  if (/just a moment|cf-challenge|challenges.cloudflare/i.test(html)) {
    throw new Error('trends24 被拦截')
  }
  const names = [...html.matchAll(/<a[^>]+href="\/([^"#]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((m) => m[2].trim())
    .filter((t) => t && !/trend|hour|more/i.test(t))
  if (names.length < 5) throw new Error('trends24 解析失败')
  return names
}

async function fetchX(): Promise<HotItem[]> {
  try {
    const names = await fetchTrends24Names()
    return top(
      names.map((title) => ({
        title,
        heat: null,
        url: `https://x.com/search?q=${encodeURIComponent(title)}&src=typed_query&f=live`,
      })),
    )
  } catch {
    return fetchGetDayTrends()
  }
}

async function fetchWeibo(): Promise<HotItem[]> {
  const raw = await getText('https://weibo.com/ajax/side/hotSearch', {
    Referer: 'https://weibo.com/',
    Accept: 'application/json',
  })
  const json = JSON.parse(raw) as { data?: { realtime?: Array<{ word?: string; note?: string; num?: number; word_scheme?: string }> } }
  const list = json?.data?.realtime || []
  return top(
    list.map((it) => ({
      title: it.word || it.note,
      heat: typeof it.num === 'number' ? `${Number(it.num).toLocaleString('zh-CN')} 热度` : null,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(it.word_scheme || it.word || '')}`,
    })),
  )
}

async function fetchZhihu(): Promise<HotItem[]> {
  const raw = await getText('https://www.zhihu.com/api/v3/feed/topstory/hot-list-web?limit=10', {
    Referer: 'https://www.zhihu.com/hot',
    Accept: 'application/json',
  })
  const json = JSON.parse(raw) as {
    data?: Array<{ target?: { title_area?: { text?: string }; metrics_area?: { text?: string }; link?: { url?: string } } }>
  }
  return top(
    (json.data || []).map((row) => {
      const t = row.target || {}
      return {
        title: t.title_area?.text,
        heat: t.metrics_area?.text || null,
        url: t.link?.url,
      }
    }),
  )
}

async function fetchJuejin(): Promise<HotItem[]> {
  const raw = await getText('https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot', {
    Accept: 'application/json',
  })
  const json = JSON.parse(raw) as {
    err_no?: number
    err_msg?: string
    data?: Array<{ content?: { title?: string; content_id?: string }; content_counter?: { hot_rank?: number } }>
  }
  if (json.err_no) throw new Error(json.err_msg || '掘金接口失败')
  return top(
    (json.data || []).map((row) => {
      const c = row.content || {}
      const hot = row.content_counter?.hot_rank
      return {
        title: c.title,
        heat: typeof hot === 'number' ? `热度 ${hot.toLocaleString('zh-CN')}` : null,
        url: c.content_id ? `https://juejin.cn/post/${c.content_id}` : '',
      }
    }),
  )
}

const FETCHERS: Record<string, () => Promise<HotItem[]>> = {
  github: fetchGithub,
  hn: fetchHn,
  reddit: fetchReddit,
  v2ex: fetchV2ex,
  x: fetchX,
  weibo: fetchWeibo,
  zhihu: fetchZhihu,
  juejin: fetchJuejin,
}

export async function fetchSource(id: string): Promise<HotItem[]> {
  const fn = FETCHERS[id]
  if (!fn) throw new Error('未知来源')
  const items = await fn()
  if (!items.length) throw new Error('空榜')
  return items
}
