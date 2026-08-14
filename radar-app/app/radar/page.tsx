import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { topicTrends } from '@/modules/radar/stats';

export const dynamic = 'force-dynamic';

export default function RadarPage() {
  const topics = topicTrends();

  return (
    <main>
      <PageHeader
        title="Radar"
        subtitle="Topic 近 7 / 30 天事件量。升温需近 7 天 ≥3 条且不少于上周 1.5 倍，均可点开核对。"
      />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>趋势</th>
              <th>近 7 天</th>
              <th>上周</th>
              <th>近 30 天</th>
              <th>支撑事件</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((t) => (
              <tr key={t.id}>
                <td className="font-medium">{t.name}</td>
                <td>
                  <span className={t.trend === 'up' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}>
                    {t.trend === 'up' ? '↑ 升温' : '→ 平稳'}
                  </span>
                </td>
                <td className="mono">{t.d7}</td>
                <td className="mono text-[var(--muted)]">{t.d7prev}</td>
                <td className="mono">{t.d30}</td>
                <td>
                  {t.events.length === 0 ? (
                    <span className="text-[var(--faint)]">—</span>
                  ) : (
                    <details>
                      <summary className="link text-xs cursor-pointer">查看 {t.events.length} 条</summary>
                      <ul className="mt-1 space-y-0.5">
                        {t.events.map((e) => (
                          <li key={e.id}>
                            <Link href={`/events/${e.id}`} className="link text-xs">{e.title}</Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
