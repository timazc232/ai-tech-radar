import Link from 'next/link'
import { SOURCES } from '@/lib/hot/sources'
import { boardUpdatedAt, formatHm, getBoard, type HotSnap } from '@/lib/hot/board'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

function Rows({ snap, limit }: { snap: HotSnap; limit: number }) {
  const items = snap.items.slice(0, limit)
  const openLabel = snap.kind === 'topic' ? '在 X 搜索' : '打开'
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
              <span className="hot-heat">{it.heat || '暂无热度'}</span>
            </span>
            <span className="hot-open">{openLabel}</span>
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
          <h2>{snap.name}</h2>
          <p>
            {when ? `更新于 ${when}` : '暂无成功更新'}
            <span> · 每 30 分钟</span>
          </p>
        </div>
        {snap.kind === 'topic' ? <span className="hot-tag">话题</span> : null}
      </header>
      {stale ? (
        <p className="hot-stale">刚刚没拉到，下面是上次成功结果。</p>
      ) : null}
      {snap.id === 'x' ? (
        <p className="hot-note">这里是热门话题，不是推文。「在 X 搜索」会打开外链。</p>
      ) : null}
      <Rows snap={snap} limit={10} />
    </section>
  )
}

export default async function HotHomePage() {
  const board = await getBoard()
  const updated = formatHm(boardUpdatedAt(board))

  return (
    <div className="hot-page">
      <header className="hot-top">
        <div>
          <Link href="/" className="hot-brand">
            Hot10
          </Link>
          <p className="hot-sub">多源热榜 · 打开就能扫</p>
        </div>
        <div className="hot-meta">
          <span>{updated ? `更新于 ${updated}` : '正在更新'} · 每 30 分钟</span>
          <Link href="/about">关于</Link>
          <Link href="/intel" className="hot-secondary">
            情报
          </Link>
        </div>
      </header>
      <div className="hot-grid">
        {SOURCES.map((s) => (
          <Card key={s.id} snap={board[s.id] || { ...s, ok: false, error: null, fetchedAt: null, lastOkAt: null, items: [] }} />
        ))}
      </div>
    </div>
  )
}
