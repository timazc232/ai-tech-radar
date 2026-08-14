/** Heuristic: text is already mostly Simplified/Traditional Chinese. */
export function isMostlyChinese(text: string): boolean {
  const s = text.trim();
  if (!s) return false;
  const han = s.match(/\p{Script=Han}/gu)?.length ?? 0;
  return han >= Math.max(2, s.replace(/\s/g, '').length * 0.3);
}

export function differsFromOriginal(original: string | undefined | null, zh: string | undefined | null): boolean {
  if (!zh?.trim() || !original?.trim()) return false;
  return zh.trim() !== original.trim();
}
