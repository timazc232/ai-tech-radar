'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type IntroPayload = {
  ok: boolean
  error?: string
  title?: string
  full_name?: string
  html_url?: string
  url?: string
  summary?: string
  summaryKind?: 'zh' | 'en' | 'empty'
  summaryZh?: string | null
  summaryZhSource?: string
  language?: string | null
  stars?: number | null
  topics?: string[]
}

type Src = 'github' | 'hn' | 'x' | 'reddit'

function zhLine(data: IntroPayload | null, fallbackTitle: string): { main: string; original?: string } {
  if (!data) return { main: '加载中…' }
  if (data.summaryZh) return { main: data.summaryZh }
  const original = (data.summary && data.summary !== '暂无仓库描述' ? data.summary : fallbackTitle) || fallbackTitle
  return { main: '暂无中文简介', original: original.slice(0, 80) }
}

async function fetchIntro(source: Src, title: string, url: string, repo?: string): Promise<IntroPayload> {
  const q = new URLSearchParams({ source, title, url })
  if (repo) q.set('repo', repo)
  const r = await fetch(`/api/hot/intro?${q.toString()}`)
  return (await r.json()) as IntroPayload
}

/** Shared hover popover for github / hn / x / reddit */
export function HotIntroHover({
  source,
  title,
  url,
  children,
  onOpenDrawer,
}: {
  source: Src
  title: string
  url: string
  children: React.ReactNode
  onOpenDrawer?: () => void
}) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<IntroPayload | null>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cacheRef = useRef<IntroPayload | null>(null)

  const clearTimers = () => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    enterTimer.current = null
    leaveTimer.current = null
  }

  const place = useCallback(() => {
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const width = 300
    let left = r.left
    if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12)
    const gap = 8
    const popH = popRef.current?.offsetHeight || 72
    const spaceBelow = window.innerHeight - r.bottom - gap
    const spaceAbove = r.top - gap
    let top: number
    if (spaceBelow >= popH || spaceBelow >= spaceAbove) {
      top = r.bottom + gap
    } else {
      top = Math.max(12, r.top - popH - gap)
    }
    setPos({ top, left })
  }, [])

  const load = useCallback(() => {
    if (cacheRef.current) {
      setData(cacheRef.current)
      return
    }
    setLoading(true)
    const repo = source === 'github' ? title : undefined
    fetchIntro(source, title, url, repo)
      .then((json) => {
        cacheRef.current = json
        setData(json)
      })
      .catch(() => {
        const fallback: IntroPayload = { ok: false, error: '网络异常', summary: title, summaryZh: null }
        cacheRef.current = fallback
        setData(fallback)
      })
      .finally(() => setLoading(false))
  }, [source, title, url])

  const onEnter = () => {
    clearTimers()
    enterTimer.current = setTimeout(() => {
      place()
      setShow(true)
      load()
    }, 200)
  }

  const onLeave = () => {
    clearTimers()
    leaveTimer.current = setTimeout(() => setShow(false), 160)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!show) return
    const onScroll = () => place()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [show, place])

  // Re-measure after mount / content change so flip uses real popover height (not a fixed ~148px).
  useLayoutEffect(() => {
    if (!show) return
    place()
  }, [show, data, loading, place])

  const line = zhLine(data, title)
  const portal =
    show && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={popRef}
            className="hot-intro-pop"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => {
              clearTimers()
              setShow(true)
            }}
            onMouseLeave={onLeave}
            role="tooltip"
          >
            {loading && !data ? (
              <p className="hot-intro-pop-main hot-intro-pop-loading">加载中…</p>
            ) : (
              <>
                <p className="hot-intro-pop-main">{line.main}</p>
                {line.original ? <p className="hot-intro-pop-orig">{line.original}</p> : null}
                {(data?.language || data?.stars != null) && (
                  <p className="hot-intro-pop-meta">
                    {data.language ? <span>{data.language}</span> : null}
                    {data.stars != null ? <span>★ {data.stars.toLocaleString('en-US')}</span> : null}
                  </p>
                )}
                {onOpenDrawer ? (
                  <button
                    type="button"
                    className="hot-intro-pop-more"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShow(false)
                      onOpenDrawer()
                    }}
                  >
                    查看详情
                  </button>
                ) : null}
              </>
            )}
          </div>,
          document.body,
        )
      : null

  return (
    <span
      ref={wrapRef}
      className="hot-intro-hover"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {children}
      {portal}
    </span>
  )
}

/** GitHub: hover on title/简介 + keep drawer */
export function GithubIntroButton({ repo, url }: { repo: string; url: string }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <>
      <HotIntroHover source="github" title={repo} url={url} onOpenDrawer={() => setOpen(true)}>
        <button
          type="button"
          className="hot-intro-btn"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setOpen(true)
          }}
        >
          简介
        </button>
      </HotIntroHover>
      {open ? <GithubIntroDrawer repo={repo} url={url} titleId={titleId} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function GithubIntroDrawer({
  repo,
  url,
  titleId,
  onClose,
}: {
  repo: string
  url: string
  titleId: string
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<IntroPayload | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    let dead = false
    setLoading(true)
    fetchIntro('github', repo, url, repo)
      .then((json) => {
        if (!dead) setData(json)
      })
      .catch(() => {
        if (!dead) setData({ ok: false, error: '网络异常', full_name: repo, html_url: url })
      })
      .finally(() => {
        if (!dead) setLoading(false)
      })
    return () => {
      dead = true
    }
  }, [repo, url])

  const name = data?.full_name || repo
  const openUrl = data?.html_url || data?.url || url
  const topics = data?.topics || []
  const shown = topics.slice(0, 6)
  const extra = topics.length > 6 ? topics.length - 6 : 0
  const drawerSummary = data?.summaryZh || data?.summary || '暂无仓库描述'

  return (
    <div className="gh-drawer-root" role="presentation">
      <button type="button" className="gh-drawer-mask" aria-label="关闭简介" onClick={onClose} />
      <aside className="gh-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="gh-drawer-head">
          <h2 id={titleId}>{name}</h2>
          <button type="button" className="gh-drawer-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>
        <div className="gh-drawer-body">
          {loading ? (
            <div className="gh-skel">
              <div />
              <div />
              <div />
            </div>
          ) : (
            <>
              <section className="gh-block">
                <h3>简介</h3>
                <p>
                  {drawerSummary}
                  {data?.summaryKind === 'en' && !data?.summaryZh ? <span className="gh-flag">原文</span> : null}
                </p>
                {data && !data.ok && data.error ? <p className="gh-hint">详情拉取失败：{data.error}</p> : null}
              </section>
              {(data?.language || data?.stars != null || shown.length > 0) && (
                <section className="gh-block">
                  <h3>简析</h3>
                  <dl className="gh-meta">
                    {data?.language ? (
                      <>
                        <dt>语言</dt>
                        <dd>{data.language}</dd>
                      </>
                    ) : null}
                    {data?.stars != null ? (
                      <>
                        <dt>Stars</dt>
                        <dd className="gh-num">{data.stars.toLocaleString('en-US')}</dd>
                      </>
                    ) : null}
                    {shown.length ? (
                      <>
                        <dt>Topics</dt>
                        <dd className="gh-topics">
                          {shown.map((t) => (
                            <span key={t}>{t}</span>
                          ))}
                          {extra ? <span>+{extra}</span> : null}
                        </dd>
                      </>
                    ) : null}
                  </dl>
                </section>
              )}
            </>
          )}
        </div>
        <footer className="gh-drawer-foot">
          <a className="gh-open" href={openUrl} target="_blank" rel="noreferrer">
            打开仓库
          </a>
        </footer>
      </aside>
    </div>
  )
}

/** Title link with hover intro for hn / x / reddit (and github title) */
export function HotTitleWithIntro({
  source,
  title,
  url,
}: {
  source: Src
  title: string
  url: string
}) {
  return (
    <HotIntroHover source={source} title={title} url={url}>
      <a href={url} target="_blank" rel="noreferrer" className="hot-title">
        {title}
      </a>
    </HotIntroHover>
  )
}
