import { describe, it, expect } from 'vitest';
import { heuristicBriefing } from '@/modules/briefing/heuristic';
import { parseBriefingResult } from '@/modules/briefing/parse';
import { inferActorKind } from '@/modules/briefing/types';
import type { EventBriefing } from '@/modules/briefing/types';

const fallback: EventBriefing = {
  headline: 'fallback',
  headlineEn: 'fb',
  projectName: 'p',
  projectKind: 'other',
  actorName: 'a',
  actorKind: 'unknown',
  versionLabel: null,
  changePoints: ['old'],
  changeDetail: 'old detail',
  model: 'test',
};

describe('inferActorKind', () => {
  it('maps known companies and communities', () => {
    expect(inferActorKind('openai')).toBe('company');
    expect(inferActorKind('ggml-org')).toBe('community');
    expect(inferActorKind('modelcontextprotocol')).toBe('community');
  });
});

describe('heuristicBriefing', () => {
  it('extracts repo, owner, version and bullets from github facts', () => {
    const b = heuristicBriefing({
      title: 'b10330',
      eventType: 'release',
      entityName: 'llama-cpp',
      facts: [
        { key: 'tag', value: 'b10330' },
        { key: 'url', value: 'https://github.com/ggml-org/llama.cpp/releases/tag/b10330' },
        { key: 'notes', value: '- faster decode\n- fix crash on metal\n\nThanks' },
      ],
    });
    expect(b.projectName).toBe('llama.cpp');
    expect(b.actorName).toBe('ggml-org');
    expect(b.actorKind).toBe('community');
    expect(b.versionLabel).toBe('b10330');
    expect(b.headline).toContain('llama.cpp');
    expect(b.changePoints.length).toBeGreaterThan(0);
  });
});

describe('parseBriefingResult', () => {
  it('keeps structured fields and clamps points', () => {
    const out = parseBriefingResult({
      headline: 'ggml 发布 llama.cpp b10330',
      projectName: 'llama.cpp',
      projectKind: 'repo',
      actorName: 'ggml-org',
      actorKind: 'community',
      versionLabel: 'b10330',
      changePoints: ['加速解码', '修复 Metal 崩溃'],
      changeDetail: '详细说明……',
    }, fallback);
    expect(out?.headline).toBe('ggml 发布 llama.cpp b10330');
    expect(out?.changePoints).toEqual(['加速解码', '修复 Metal 崩溃']);
    expect(out?.actorKind).toBe('community');
  });

  it('returns null for non-object', () => {
    expect(parseBriefingResult(null, fallback)).toBeNull();
  });
});
