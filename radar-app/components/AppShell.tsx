'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { NAV_ITEMS, navMenuLabel, searchQueryHint } from '@/lib/ui';

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/events');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const navId = useId();
  const hintId = useId();

  useEffect(() => {
    setOpen(false);
    setSearching(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function search(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    const problem = searchQueryHint(query);
    if (problem) {
      setHint(problem);
      return;
    }
    setHint(null);
    setSearching(true);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setOpen(false);
  }

  const searchForm = (compact: boolean) => (
    <form onSubmit={search} className={compact ? 'mt-3' : ''} role="search">
      <div className={compact ? 'flex gap-1.5' : 'flex gap-2'}>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (hint) setHint(searchQueryHint(e.target.value));
          }}
          placeholder="搜索事件…"
          className={compact ? 'input !py-1.5 !text-xs min-w-0' : 'input min-w-0'}
          aria-label="搜索事件"
          aria-describedby={hint ? hintId : undefined}
          aria-invalid={hint ? true : undefined}
        />
        <button
          type="submit"
          className={`btn btn-primary shrink-0 touch-target ${compact ? '!text-xs !px-2' : ''}`}
          aria-busy={searching}
        >
          {searching ? '跳转中…' : '搜索'}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-[11px] text-[var(--danger)] mt-1" role="alert">
          {hint}
        </p>
      )}
    </form>
  );

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell lg:pl-[216px]">
      <a href="#main-content" className="skip-link">跳到正文</a>
      <header className="lg:hidden sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur px-3 py-2 flex items-center justify-between gap-2">
        <Link href="/" className="serif font-semibold tracking-tight text-sm">Radar</Link>
        <button
          ref={menuBtnRef}
          type="button"
          className="btn touch-target"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={navId}
          aria-label={navMenuLabel(open)}
        >
          {open ? '关闭' : '菜单'}
        </button>
      </header>
      {open && (
        <div
          id={navId}
          className="lg:hidden border-b border-[var(--border)] bg-[var(--bg-panel)] px-3 py-3 space-y-3"
        >
          {nav}
          {searchForm(true)}
        </div>
      )}

      <aside className="sidebar hidden lg:flex flex-col fixed inset-y-0 left-0 w-[216px] px-3 py-4">
        <Link href="/" className="block px-2 pb-4 mb-3 border-b border-[var(--border)]">
          <span className="serif text-lg font-semibold tracking-tight">Radar</span>
          <span className="block text-[11px] text-[var(--faint)] mt-0.5">每日技术简报</span>
        </Link>
        {nav}
        {searchForm(true)}
        <div className="mt-auto pt-4 px-2 text-[10px] text-[var(--faint)] border-t border-[var(--border)]">
          默认扫描近 7 天
        </div>
      </aside>

      <div className="app-main max-w-4xl mx-auto px-3 sm:px-5 py-6 sm:py-8 min-h-screen flex flex-col">
        <div id="main-content" className="flex-1" tabIndex={-1}>{children}</div>
        <footer className="mt-12 pt-6 border-t border-[var(--border-soft)] text-xs text-[var(--faint)]">
          Radar · 单用户本机
        </footer>
      </div>
    </div>
  );
}
