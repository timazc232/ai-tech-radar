import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hot10',
  description: '多源热榜：GitHub、HN、Reddit、V2EX、X、微博、知乎、掘金',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
