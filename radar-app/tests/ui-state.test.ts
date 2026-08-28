import { describe, it, expect } from 'vitest';
import {
  canSubmitSearch,
  isBuiltinSource,
  isJobInFlight,
  jobTypeLabel,
  jobView,
  navMenuLabel,
  parseBriefDensity,
  searchQueryHint,
  searchStatusText,
  searchView,
  sourceOrigin,
  sourceRunKind,
  sourceRunLabel,
  sourceWatchLabel,
  SEARCH_MIN_LEN,
} from '@/lib/ui';

describe('search query', () => {
  it('rejects empty and one-character queries', () => {
    expect(searchQueryHint('')).toMatch(/关键词/);
    expect(searchQueryHint(' ')).toMatch(/关键词/);
    expect(searchQueryHint('a')).toMatch(String(SEARCH_MIN_LEN));
    expect(canSubmitSearch('a')).toBe(false);
  });

  it('accepts two or more trimmed characters', () => {
    expect(searchQueryHint('vllm')).toBeNull();
    expect(canSubmitSearch('  MCP  ')).toBe(true);
  });

  it('distinguishes idle, loading, empty, error and success', () => {
    expect(searchView({ query: '', busy: false, error: null, hitCount: 0, attempted: false })).toBe('idle');
    expect(searchView({ query: 'vllm', busy: true, error: null, hitCount: 0, attempted: true })).toBe('loading');
    expect(searchView({ query: 'vllm', busy: false, error: 'boom', hitCount: 0, attempted: true })).toBe('error');
    expect(searchView({ query: 'vllm', busy: false, error: null, hitCount: 0, attempted: true })).toBe('empty');
    expect(searchView({ query: 'vllm', busy: false, error: null, hitCount: 3, attempted: true })).toBe('success');
    expect(searchStatusText('loading')).toMatch(/正在搜索/);
    expect(searchStatusText('success', 3)).toMatch(/3/);
    expect(searchStatusText('empty')).toMatch(/没有匹配/);
  });
});

describe('sources origin and status', () => {
  it('treats seeded ids as builtin and hashed ids as custom', () => {
    expect(isBuiltinSource('src_vllm_github')).toBe(true);
    expect(sourceOrigin('src_vllm_github')).toBe('builtin');
    expect(sourceOrigin('src_ab12cd34ef56')).toBe('custom');
    expect(isBuiltinSource('src_ab12cd34ef56')).toBe(false);
  });

  it('separates watch intent from harvest run state', () => {
    expect(sourceWatchLabel('active')).toBe('关注中');
    expect(sourceWatchLabel('paused')).toBe('已暂停');
    expect(sourceWatchLabel('error')).toBe('关注中');
    expect(sourceRunKind({ status: 'active', lastFetchedAt: '2026-08-01', lastError: null })).toBe('ok');
    expect(sourceRunKind({ status: 'error', lastFetchedAt: null, lastError: 'timeout' })).toBe('error');
    expect(sourceRunKind({ status: 'active', lastFetchedAt: null, lastError: null })).toBe('never');
    expect(sourceRunLabel('never')).toBe('尚未采集');
    expect(sourceRunLabel('error')).toBe('采集失败');
  });
});

describe('jobs async view', () => {
  it('does not treat the first paint as empty', () => {
    expect(jobView({ loaded: false, error: null })).toBe('loading');
    expect(jobView({ loaded: true, error: null, latestStatus: null })).toBe('empty');
    expect(jobView({ loaded: true, error: 'network', latestStatus: null })).toBe('error');
    expect(jobView({ loaded: true, error: null, latestStatus: 'running' })).toBe('running');
    expect(jobView({ loaded: true, error: null, latestStatus: 'failed' })).toBe('failed');
    expect(jobView({ loaded: true, error: null, latestStatus: 'lease_expired' })).toBe('failed');
    expect(jobView({ loaded: true, error: null, latestStatus: 'success' })).toBe('success');
    expect(isJobInFlight('running')).toBe(true);
    expect(isJobInFlight('success')).toBe(false);
    expect(jobTypeLabel('daily')).toBe('每日扫描');
  });
});

describe('nav and density', () => {
  it('toggles an accurate menu accessible name', () => {
    expect(navMenuLabel(false)).toBe('打开导航');
    expect(navMenuLabel(true)).toBe('关闭导航');
  });

  it('defaults density to compact', () => {
    expect(parseBriefDensity(null)).toBe('compact');
    expect(parseBriefDensity('full')).toBe('full');
    expect(parseBriefDensity('nope')).toBe('compact');
  });
});
