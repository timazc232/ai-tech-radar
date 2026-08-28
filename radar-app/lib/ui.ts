/**
 * Shared UI copy, status machines, and information-architecture helpers.
 * Pure functions so search / jobs / sources interactions can be unit-tested.
 */
import seededSources from '@/config/sources.json';

export const SEARCH_MIN_LEN = 2;
export const BRIEF_DENSITY_KEY = 'radar.briefDensity';

export type BriefDensity = 'compact' | 'full';
export type SearchView = 'idle' | 'too_short' | 'loading' | 'error' | 'empty' | 'success';
export type JobView = 'loading' | 'error' | 'empty' | 'running' | 'failed' | 'success';
export type SourceOrigin = 'builtin' | 'custom';

export const NAV_ITEMS: Array<{ href: string; label: string }> = [
  { href: '/', label: '今日' },
  { href: '/watchlist', label: '关注' },
  { href: '/radar', label: '雷达' },
  { href: '/memory', label: '记忆' },
  { href: '/inbox', label: '收藏箱' },
  { href: '/sources', label: '来源' },
  { href: '/jobs', label: '任务' },
  { href: '/settings', label: '设置' },
];

export const TYPE_LABEL: Record<string, string> = {
  release: '发布',
  breaking_change: '破坏性变更',
  pricing_change: '定价',
  research: '研究',
  security_advisory: '安全',
  announcement: '公告',
  docs_change: '文档',
};

export const ACTION_LABEL: Record<string, string> = {
  skip: '跳过',
  '5min': '阅读 5 分钟',
  '15min': '深读 15 分钟',
  clone_test: '克隆并试用',
  watch: '持续关注',
};

export const DIM_LABEL: Record<string, string> = {
  relevance: '相关',
  impact: '影响',
  novelty: '新颖',
  credibility: '可信',
  urgency: '紧急',
};

export const SOURCE_STATUS_LABEL: Record<string, string> = {
  active: '关注中',
  paused: '已暂停',
  error: '采集失败',
};

export const JOB_STATUS_LABEL: Record<string, string> = {
  running: '执行中',
  success: '成功',
  failed: '失败',
  lease_expired: '租约过期',
};

export const FRESHNESS_LABEL: Record<string, string> = {
  fresh: '新鲜',
  stale: '过期',
  pending: '待生成',
};

export const ORIGIN_LABEL: Record<SourceOrigin, string> = {
  builtin: '内置',
  custom: '自定义',
};

export const TIER_LABEL = {
  must: '必读',
  worth: '值得关注',
} as const;

const BUILTIN_SOURCE_IDS = new Set((seededSources as Array<{ id: string }>).map((s) => s.id));

export function isBuiltinSource(id: string): boolean {
  return BUILTIN_SOURCE_IDS.has(id);
}

export function sourceOrigin(id: string): SourceOrigin {
  return isBuiltinSource(id) ? 'builtin' : 'custom';
}

/** Watch status (user intent) vs run status (last harvest). */
export function sourceWatchLabel(status: string): string {
  if (status === 'paused') return SOURCE_STATUS_LABEL.paused;
  if (status === 'error') return SOURCE_STATUS_LABEL.active;
  return SOURCE_STATUS_LABEL[status] ?? SOURCE_STATUS_LABEL.active;
}

export function sourceRunKind(source: {
  status: string;
  lastFetchedAt: string | null;
  lastError: string | null;
}): 'ok' | 'error' | 'never' | 'paused' {
  if (source.status === 'paused') return 'paused';
  if (source.status === 'error' || source.lastError) return 'error';
  if (!source.lastFetchedAt) return 'never';
  return 'ok';
}

export function sourceRunLabel(kind: ReturnType<typeof sourceRunKind>): string {
  switch (kind) {
    case 'ok': return '已采集';
    case 'error': return '采集失败';
    case 'never': return '尚未采集';
    case 'paused': return '已暂停';
  }
}

export function searchQueryHint(raw: string): string | null {
  const text = raw.trim();
  if (!text) return '请输入关键词';
  if (text.length < SEARCH_MIN_LEN) return `至少输入 ${SEARCH_MIN_LEN} 个字符`;
  return null;
}

export function canSubmitSearch(raw: string): boolean {
  return searchQueryHint(raw) === null;
}

export function searchView(opts: {
  query: string;
  busy: boolean;
  error: string | null;
  hitCount: number;
  attempted: boolean;
}): SearchView {
  if (opts.busy) return 'loading';
  if (opts.error) return 'error';
  const text = opts.query.trim();
  if (!opts.attempted && text.length < SEARCH_MIN_LEN) return 'idle';
  if (text.length < SEARCH_MIN_LEN) return 'too_short';
  if (opts.hitCount === 0) return 'empty';
  return 'success';
}

export function searchStatusText(view: SearchView, hitCount = 0): string {
  switch (view) {
    case 'idle': return '输入关键词后回车或点搜索';
    case 'too_short': return `至少输入 ${SEARCH_MIN_LEN} 个字符`;
    case 'loading': return '正在搜索…';
    case 'error': return '搜索失败';
    case 'empty': return '没有匹配事件';
    case 'success': return `找到 ${hitCount} 条`;
  }
}

export function jobView(opts: {
  loaded: boolean;
  error: string | null;
  latestStatus?: string | null;
}): JobView {
  if (!opts.loaded) return 'loading';
  if (opts.error) return 'error';
  if (!opts.latestStatus) return 'empty';
  if (opts.latestStatus === 'running') return 'running';
  if (opts.latestStatus === 'failed' || opts.latestStatus === 'lease_expired') return 'failed';
  return 'success';
}

export function isJobInFlight(status: string): boolean {
  return status === 'running';
}

export function navMenuLabel(open: boolean): string {
  return open ? '关闭导航' : '打开导航';
}

export function parseBriefDensity(raw: string | null | undefined): BriefDensity {
  return raw === 'full' ? 'full' : 'compact';
}

export function jobTypeLabel(jobType: string): string {
  if (jobType === 'daily') return '每日扫描';
  if (jobType === 'daily_backfill') return '回填扫描';
  return jobType;
}
