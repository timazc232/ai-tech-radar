import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle ? <p className="text-xs text-[var(--muted)] mt-1">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
