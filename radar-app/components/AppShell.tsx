'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/', label: 'Today' },
  { href: '/watchlist', label: 'Watchlist' },
  { href: '/radar', label: 'Radar' },
  { href: '/memory', label: 'Memory' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/sources', label: 'Sources' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/settings', label: 'Settings' },
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
        <button type="button" className="btn !py-1" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="打开导航">
          菜单
        </button>
      </header>
      {open && (
        <div className="lg:hidden border-b border-[var(--border)] bg-[var(--bg-panel)] px-4 py-3 space-y-3">
          {nav}
          <form onSubmit={search}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索事件…"
              className="input"
              aria-label="搜索事件"
            />
          </form>
        </div>
      )}

      <aside className="sidebar hidden lg:flex flex-col fixed inset-y-0 left-0 w-[216px] px-3 py-4">
        <Link href="/" className="block px-2 pb-4 mb-3 border-b border-[var(--border)]">
          <span className="serif text-lg font-semibold tracking-tight">Radar</span>
          <span className="block text-[11px] text-[var(--faint)] mt-0.5">每日技术简报</span>
        </Link>
        {nav}
        <form onSubmit={search} className="mt-3 px-0.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索事件…"
            className="input !py-1.5 !text-xs"
            aria-label="搜索事件"
          />
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
