import { describe, it, expect } from 'vitest';
import { classifySourceUrl } from '@/modules/watchlist/classify';

describe('classifySourceUrl', () => {
  it('maps github releases URL to github_release', () => {
    const c = classifySourceUrl('https://github.com/vllm-project/vllm/releases');
    expect(c.type).toBe('github_release');
    expect(c.entityName).toBe('vllm');
    expect(c.entityType).toBe('repo');
  });

  it('maps github repo URL to github_repo', () => {
    const c = classifySourceUrl('github.com/modelcontextprotocol/servers');
    expect(c.type).toBe('github_repo');
    expect(c.entityName).toBe('servers');
    expect(c.canonicalUrl).toContain('github.com/modelcontextprotocol/servers');
  });

  it('maps feed.xml to rss', () => {
    const c = classifySourceUrl('https://huggingface.co/blog/feed.xml');
    expect(c.type).toBe('rss');
    expect(c.entityType).toBe('company');
  });

  it('maps official page to web', () => {
    const c = classifySourceUrl('https://docs.anthropic.com/en/docs/agents');
    expect(c.type).toBe('web');
    expect(c.entityType).toBe('page');
  });
});
