import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SOURCES, fetchSource, type HotItem, type HotKind } from './sources'
import { scheduleIntroPrefetch } from './prefetch-intro'

// Even forced refreshes reuse a source fetched within this window (many users entering at once).
const MIN_REFETCH_GAP = 3 * 60 * 1000
const FILE = path.join(process.cwd(), 'data', 'hot', 'cache.json')

export type HotSnap = {
  id: string
  name: string
  kind: HotKind
  ok: boolean
  error: string | null
  fetchedAt: number | null
  lastOkAt: number | null
  items: HotItem[]
}

type CacheFile = Record<string, HotSnap>

function emptySnap(meta: (typeof SOURCES)[number]): HotSnap {
  return {
    id: meta.id,
    name: meta.name,
    kind: meta.kind,
    ok: false,
    error: null,
    fetchedAt: null,
    lastOkAt: null,
    items: [],
  }
}

async function readCache(): Promise<CacheFile> {
  try {
    const raw = await readFile(FILE, 'utf8')
    const json = JSON.parse(raw) as CacheFile
    return json && typeof json === 'object' ? json : {}
  } catch {
    return {}
  }
}

async function writeCache(data: CacheFile): Promise<void> {
  await mkdir(path.dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(data))
}

let inflight: Promise<CacheFile> | null = null

export async function getBoard({ force = false }: { force?: boolean } = {}): Promise<CacheFile> {
  if (inflight) return inflight
  inflight = load(force).finally(() => {
    inflight = null
  })
  return inflight
}

async function load(force: boolean): Promise<CacheFile> {
  const cache = await readCache()
  const now = Date.now()
  const next: CacheFile = { ...cache }
  let didFetch = false

  await Promise.all(
    SOURCES.map(async (meta) => {
      const prev = cache[meta.id]
      // No timed refresh: page render reuses cache; only manual / on-enter refresh (force) refetches.
      const cached = prev && prev.lastOkAt && prev.items?.length
      const recent = cached && prev.fetchedAt && now - prev.fetchedAt < MIN_REFETCH_GAP
      if (cached && (!force || recent)) {
        next[meta.id] = force
          ? { ...emptySnap(meta), ...prev, name: meta.name, kind: meta.kind }
          : { ...emptySnap(meta), ...prev, name: meta.name, kind: meta.kind, ok: true, error: null }
        return
      }
      didFetch = true
      try {
        const items = await fetchSource(meta.id)
        next[meta.id] = {
          ...emptySnap(meta),
          ok: true,
          fetchedAt: now,
          lastOkAt: now,
          items,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '拉取失败'
        if (prev?.items?.length) {
          next[meta.id] = {
            ...emptySnap(meta),
            ...prev,
            name: meta.name,
            kind: meta.kind,
            ok: false,
            error: message,
            fetchedAt: now,
            lastOkAt: prev.lastOkAt,
            items: prev.items,
          }
        } else {
          next[meta.id] = {
            ...emptySnap(meta),
            ok: false,
            error: message,
            fetchedAt: now,
            lastOkAt: null,
            items: [],
          }
        }
      }
    }),
  )

  await writeCache(next)
  // List response must not wait on AI; only after a real source refresh.
  if (didFetch) scheduleIntroPrefetch(next)
  return next
}

export function formatHm(ts: number | null | undefined): string {
  if (!ts) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(ts))
}

export function boardUpdatedAt(board: CacheFile): number | null {
  const times = SOURCES.map((s) => board[s.id]?.lastOkAt || board[s.id]?.fetchedAt).filter(Boolean) as number[]
  if (!times.length) return null
  return Math.max(...times)
}
