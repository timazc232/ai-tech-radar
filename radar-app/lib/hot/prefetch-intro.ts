import type { HotSnap } from './board'
import { getCachedZh, hasCjk, introCacheKey, resolveIntroZh } from './intro-zh'

const AI_SOURCES = new Set(['github', 'hn', 'x', 'reddit'])
const CONCURRENCY = 3

export type PrefetchStatus = {
  running: boolean
  total: number
  hit: number
  miss: number
  ok: number
  fail: number
  skippedCjk: number
  startedAt: number | null
  finishedAt: number | null
}

type JobItem = {
  source: string
  cacheId: string
  text: string
}

let status: PrefetchStatus = emptyStatus()
let inflight: Promise<void> | null = null
let queued: Record<string, HotSnap> | null = null

function emptyStatus(): PrefetchStatus {
  return {
    running: false,
    total: 0,
    hit: 0,
    miss: 0,
    ok: 0,
    fail: 0,
    skippedCjk: 0,
    startedAt: null,
    finishedAt: null,
  }
}

export function getIntroPrefetchStatus(): PrefetchStatus {
  return { ...status }
}

/**
 * Fire-and-forget after hot list refresh: prefetch ZH intros for
 * github/hn/x/reddit items missing from cache. Does not block callers.
 * Jobs coalesce; each item tried once per run (failures retry next refresh).
 */
export function scheduleIntroPrefetch(board: Record<string, HotSnap>): void {
  queued = board
  if (inflight) return
  inflight = runLoop().finally(() => {
    inflight = null
  })
}

async function runLoop(): Promise<void> {
  while (queued) {
    const board = queued
    queued = null
    await runOnce(board)
  }
}

async function runOnce(board: Record<string, HotSnap>): Promise<void> {
  status = {
    ...emptyStatus(),
    running: true,
    startedAt: Date.now(),
  }
  const { jobs, hit, skippedCjk } = await collectJobs(board)
  status = {
    ...status,
    total: jobs.length,
    hit,
    miss: jobs.length,
    skippedCjk,
  }

  if (!jobs.length) {
    status = { ...status, running: false, finishedAt: Date.now() }
    console.info(
      `[hot-intro-prefetch] done hit=${status.hit} miss=0 ok=0 fail=0 cjk=${status.skippedCjk}`,
    )
    return
  }

  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      const job = jobs[cursor++]
      try {
        const res = await resolveIntroZh({
          source: job.source,
          cacheId: job.cacheId,
          text: job.text,
        })
        if (res.summaryZhSource === 'none') status.fail += 1
        else status.ok += 1
      } catch {
        status.fail += 1
      }
    }
  }

  const n = Math.min(CONCURRENCY, jobs.length)
  await Promise.all(Array.from({ length: n }, () => worker()))
  status = { ...status, running: false, finishedAt: Date.now() }
  console.info(
    `[hot-intro-prefetch] done hit=${status.hit} miss=${status.miss} ok=${status.ok} fail=${status.fail} cjk=${status.skippedCjk}`,
  )
}

async function collectJobs(
  board: Record<string, HotSnap>,
): Promise<{ jobs: JobItem[]; hit: number; skippedCjk: number }> {
  let hit = 0
  let skippedCjk = 0
  const jobs: JobItem[] = []

  for (const source of AI_SOURCES) {
    const snap = board[source]
    if (!snap?.items?.length) continue
    for (const item of snap.items.slice(0, 10)) {
      const title = (item.title || '').trim()
      const url = (item.url || '').trim()
      if (!title) continue

      if (source === 'github') {
        const repo = title
        if (getCachedZh(introCacheKey('github', repo))) {
          hit += 1
          continue
        }
        const text = await githubText(repo)
        if (hasCjk(text)) {
          skippedCjk += 1
          continue
        }
        jobs.push({ source: 'github', cacheId: repo, text: text || repo })
        continue
      }

      const cacheId = url || title
      if (getCachedZh(introCacheKey(source, cacheId))) {
        hit += 1
        continue
      }
      if (hasCjk(title)) {
        skippedCjk += 1
        continue
      }
      jobs.push({ source, cacheId, text: title })
    }
  }
  return { jobs, hit, skippedCjk }
}

async function githubText(repo: string): Promise<string> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return repo
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hot10-ai-tech-radar',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    const token = process.env.GITHUB_TOKEN
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return repo
    const data = (await res.json()) as { description?: string | null }
    const desc = (data.description || '').trim()
    return desc || repo
  } catch {
    return repo
  }
}
