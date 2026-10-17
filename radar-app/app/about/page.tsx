import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '关于 · Hot10' }

export default function AboutPage() {
  return (
    <div className="hot-shell">
      <div className="hot-page hot-about">
        <header className="hot-top">
          <Link href="/" className="hot-brand">
            Hot10
          </Link>
          <div className="hot-meta">
            <Link href="/">返回热榜</Link>
          </div>
        </header>
        <h1>关于</h1>
        <p>Hot10 把 8 个来源的热门前十放在一页，打开就能扫，不用先配密钥。</p>
        <ul>
          <li>来源：GitHub Trending（今日）、Hacker News、Reddit r/popular、V2EX、X、微博、知乎、掘金。</li>
          <li>每 30 分钟刷新，也可点「立即刷新」。某个来源失败只空那一张卡；有上次成功结果会先留着。</li>
          <li>X 只展示热门话题，点标题去 X 搜索，没有推文流。</li>
          <li>
            Reddit：本环境访问 <code>reddit.com</code> 常返回 403，该卡只显示空态，不影响其他源。这是已知限制，不是整页故障。
          </li>
          <li>没有登录门、评论、收藏，也不把各站热度折成同一个分数。</li>
          <li>原情报简报在次级入口「情报」，本版首页不做简报。</li>
        </ul>
      </div>
    </div>
  )
}
