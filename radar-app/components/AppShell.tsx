'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: '今日简报' },
  { href: '/watchlist', label: '关注来源' },
  { href: '/radar', label: '趋势雷达' },
  { href: '/memory', label: '偏好记忆' },
  { href: '/inbox', label: '稍后阅读' },
  { href: '/sources', label: '来源健康' },
  { href: '/jobs', label: '任务记录' },
  { href: '/settings', label: '设置' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/events');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="主导航">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${isActive(pathname, item.href) ? 'active' : ''}`}
          onClick={() => setOpen(false)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="app-shell lg:pl-[216px]">
      <header className="lg:hidden sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur px-4 py-3 flex items-center justify-between">
        <Link href="/" className="serif font-semibold tracking-tight text-sm">Radar</Link>
        <button type="button" className="btn !py-1 min-h-11" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? '关闭导航' : '打开导航'}>
          {open ? '关闭' : '菜单'}
        </button>
      </header>
      {open && (
        <div id="mobile-navigation" className="lg:hidden border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 space-y-3">
          {nav}
          <form onSubmit={search} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索事件…"
              className="input"
              aria-label="搜索事件"
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={q.trim().length < 2}>搜索</button>
          </form>
        </div>
      )}

      <aside className="sidebar hidden lg:flex flex-col fixed inset-y-0 left-0 w-[216px] px-3 py-4">
        <Link href="/" className="block px-2 pb-4 mb-3 border-b border-[var(--border)]">
          <span className="serif text-lg font-semibold tracking-tight">Radar</span>
          <span className="block text-[11px] text-[var(--faint)] mt-0.5">每日技术简报</span>
        </Link>
        {nav}
        <form onSubmit={search} className="mt-3 px-0.5 flex gap-1.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索事件…"
            className="input !py-1.5 !text-xs"
            aria-label="搜索事件"
          />
          <button type="submit" className="btn !px-2" disabled={q.trim().length < 2} aria-label="提交搜索">搜索</button>
        </form>
        <div className="mt-auto pt-4 px-2 text-[10px] text-[var(--faint)] border-t border-[var(--border)]">
          默认扫描近 7 天
        </div>
      </aside>

      <div className="max-w-4xl mx-auto px-5 py-8 min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="mt-12 pt-6 border-t border-[var(--border-soft)] text-xs text-[var(--faint)] flex items-center justify-between">
          <span className="text-[var(--faint)]">Radar · 单用户本机</span>
          <span>单用户 · 本机</span>
        </footer>
      </div>
    </div>
  );
}
