import { describe, it, expect } from 'vitest';
import { isMostlyChinese, differsFromOriginal } from '@/lib/i18n';
import { parseTranslateResult, type TranslatePayload } from '@/modules/llm/translate';

describe('i18n helpers', () => {
  it('detects Chinese titles', () => {
    expect(isMostlyChinese('llama.cpp 发布了新版本')).toBe(true);
    expect(isMostlyChinese('llama.cpp b10330 released')).toBe(false);
    expect(isMostlyChinese('')).toBe(false);
  });

  it('hides zh when identical to original', () => {
    expect(differsFromOriginal('hello', '你好')).toBe(true);
    expect(differsFromOriginal('hello', 'hello')).toBe(false);
    expect(differsFromOriginal('hello', '')).toBe(false);
  });
});

describe('parseTranslateResult', () => {
  const src: TranslatePayload = {
    title: 'vLLM v0.6 released',
    whyItMatters: 'Faster inference',
    quotes: { evd_1: 'major speedup' },
  };

  it('reads matching keys and drops unknown quotes', () => {
    const out = parseTranslateResult({
      title: 'vLLM v0.6 发布',
      whyItMatters: '推理更快',
      quotes: { evd_1: '大幅加速', evd_x: 'ignore' },
    }, src);
    expect(out?.title).toBe('vLLM v0.6 发布');
    expect(out?.whyItMatters).toBe('推理更快');
    expect(out?.quotes).toEqual({ evd_1: '大幅加速' });
  });

  it('falls back to original when parse payload is junk', () => {
    const out = parseTranslateResult({ title: 12 }, src);
    expect(out?.title).toBe('vLLM v0.6 released');
  });

  it('returns null for non-object', () => {
    expect(parseTranslateResult(null, src)).toBeNull();
  });
});
