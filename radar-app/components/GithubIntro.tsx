'use client'

import { useEffect, useId, useState } from 'react'

type IntroData = {
  ok: boolean
  error?: string
  full_name?: string
  html_url?: string
  homepage?: string | null
  summary?: string
  summaryKind?: 'zh' | 'en' | 'empty'
  language?: string | null
  stars?: number | null
  topics?: string[]
}

export function GithubIntroButton({ repo, url }: { repo: string; url: string }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <>
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
  const [data, setData] = useState<IntroData | null>(null)

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
    fetch(`/api/hot/github?repo=${encodeURIComponent(repo)}`)
      .then((r) => r.json())
      .then((json: IntroData) => {
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
  const openUrl = data?.html_url || url
  const topics = data?.topics || []
  const shown = topics.slice(0, 6)
  const extra = topics.length > 6 ? topics.length - 6 : 0

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
                  {data?.summary || '暂无仓库描述'}
                  {data?.summaryKind === 'en' ? <span className="gh-flag">原文</span> : null}
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
