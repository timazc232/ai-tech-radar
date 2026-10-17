import Link from 'next/link'
import { HotRefresh } from '@/components/HotRefresh'
import { SOURCES } from '@/lib/hot/sources'
import { boardUpdatedAt, formatHm, getBoard, type HotSnap } from '@/lib/hot/board'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const DOT: Record<string, string> = {
  github: '#f97316',
  hn: '#fb923c',
  reddit: '#f43f5e',
  v2ex: '#22c55e',
  x: '#38bdf8',
  weibo: '#ef4444',
  zhihu: '#60a5fa',
  juejin: '#38bdf8',
}

function Rows({ snap }: { snap: HotSnap }) {
  const items = snap.items.slice(0, 10)
  if (!items.length) {
    const when = formatHm(snap.lastOkAt)
    return (
      <div className="hot-empty">
        这一源暂时没拉到。其他源不受影响。
        {when ? ` 上次成功 ${when}。` : ''}
      </div>
    )
  }
  return (
    <ol className="hot-list">
      {items.map((it) => (
        <li key={`${it.rank}-${it.url}`}>
          <a href={it.url} target="_blank" rel="noreferrer" className="hot-row">
            <span className={it.rank <= 3 ? 'hot-rank top' : 'hot-rank'}>{it.rank}</span>
            <span className="hot-main">
              <span className="hot-title">{it.title}</span>
              <span className="hot-heat">{it.heat || '—'}</span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}

function Card({ snap }: { snap: HotSnap }) {
  const when = formatHm(snap.lastOkAt || snap.fetchedAt)
  const stale = !snap.ok && snap.items.length > 0
  return (
    <section className="hot-card">
      <header className="hot-card-head">
        <div>
          <h2>
            <span className="hot-dot" style={{ background: DOT[snap.id] || '#38bdf8' }} />
            {snap.name}
            {snap.kind === 'topic' ? <span className="hot-tag">话题</span> : null}
          </h2>
          <p>{when ? `更新于 ${when}` : '暂无成功更新'}</p>
        </div>
      </header>
      {stale ? <p className="hot-stale">刚刚没拉到，下面是上次成功结果。</p> : null}
      {snap.id === 'x' ? (
        <p className="hot-note">这里是热门话题，不是推文。点标题会去 X 搜索。</p>
      ) : null}
      <Rows snap={snap} />
    </section>
  )
}

export default async function HotHomePage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>
}) {
  const params = await searchParams
  const source = typeof params?.source === 'string' ? params.source : 'all'
  const selected = SOURCES.find((s) => s.id === source)
  const board = await getBoard()
  const updated = formatHm(boardUpdatedAt(board))
  const snaps = selected
    ? [board[selected.id] || { ...selected, ok: false, error: null, fetchedAt: null, lastOkAt: null, items: [] }]
    : SOURCES.map((s) => board[s.id] || { ...s, ok: false, error: null, fetchedAt: null, lastOkAt: null, items: [] })

  return (
    <div className="hot-shell">
      <div className="hot-page">
        <header className="hot-top">
          <Link href="/" className="hot-brand">
            Hot10
          </Link>
          <div className="hot-meta">
            <span>{updated ? `更新于 ${updated}` : '正在更新'} · 每 30 分钟</span>
            <HotRefresh />
            <Link href="/about">关于</Link>
            <Link href="/intel" className="hot-secondary">
              情报
            </Link>
          </div>
        </header>

        <nav className="hot-pills" aria-label="来源">
          <Link className={!selected ? 'hot-pill on' : 'hot-pill'} href="/">
            全部
          </Link>
          {SOURCES.map((s) => (
            <Link key={s.id} className={source === s.id ? 'hot-pill on' : 'hot-pill'} href={`/?source=${s.id}`}>
              <span className="hot-dot" style={{ background: DOT[s.id] }} />
              {s.name}
            </Link>
          ))}
        </nav>

        <div className={selected ? 'hot-grid single' : 'hot-grid'}>
          {snaps.map((snap) => (
            <Card key={snap.id} snap={snap} />
          ))}
        </div>
      </div>
    </div>
  )
}
