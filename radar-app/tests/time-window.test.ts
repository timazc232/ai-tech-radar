import { describe, it, expect } from 'vitest';
import { dataWindow, windowForDate, isInWindow, toBeijingDate, lookbackWindow, shiftBeijingDate } from '@/lib/time';

describe('time window (§5.2, A1)', () => {
  it('toBeijingDate converts UTC to Beijing calendar date', () => {
    // 2026-08-07 16:00 UTC = 2026-08-08 00:00 Beijing
    expect(toBeijingDate('2026-08-07T16:00:00.000Z')).toBe('2026-08-08');
    // 2026-08-07 15:00 UTC = 2026-08-07 23:00 Beijing
    expect(toBeijingDate('2026-08-07T15:00:00.000Z')).toBe('2026-08-07');
  });

  it('dataWindow returns previous Beijing calendar day as UTC [start,end)', () => {
    // 2026-08-08 02:00 UTC = 2026-08-08 10:00 Beijing -> yesterday = 2026-08-07
    const now = new Date('2026-08-08T02:00:00.000Z');
    const w = dataWindow(now);
    expect(w.date).toBe('2026-08-07');
    // 2026-08-07 00:00 Beijing = 2026-08-06 16:00 UTC
    expect(w.start).toBe('2026-08-06T16:00:00.000Z');
    expect(w.end).toBe('2026-08-07T16:00:00.000Z');
  });

  it('dataWindow at Beijing midnight boundary', () => {
    // 2026-08-07 16:00 UTC = exactly 2026-08-08 00:00 Beijing -> yesterday = 2026-08-07
    const now = new Date('2026-08-07T16:00:00.000Z');
    const w = dataWindow(now);
    expect(w.date).toBe('2026-08-07');
  });

  it('windowForDate computes correct UTC bounds', () => {
    const w = windowForDate('2026-08-06');
    expect(w.start).toBe('2026-08-05T16:00:00.000Z');
    expect(w.end).toBe('2026-08-06T16:00:00.000Z');
    expect(w.date).toBe('2026-08-06');
  });

  it('lookbackWindow expands start while keeping yesterday as brief date', () => {
    const now = new Date('2026-08-08T02:00:00.000Z');
    const w = lookbackWindow(7, now);
    expect(w.date).toBe('2026-08-07');
    expect(w.end).toBe('2026-08-07T16:00:00.000Z');
    // 7 Beijing days: 2026-08-01 00:00 → 2026-08-08 00:00 (exclusive end is yesterday 24:00)
    expect(w.start).toBe('2026-07-31T16:00:00.000Z');
  });

  it('shiftBeijingDate moves whole calendar days', () => {
    expect(shiftBeijingDate('2026-08-01', -1)).toBe('2026-07-31');
    expect(shiftBeijingDate('2026-08-01', 1)).toBe('2026-08-02');
  });

  it('isInWindow is inclusive start, exclusive end', () => {
    const w = { start: '2026-08-06T16:00:00.000Z', end: '2026-08-07T16:00:00.000Z' };
    expect(isInWindow('2026-08-06T16:00:00.000Z', w)).toBe(true);
    expect(isInWindow('2026-08-07T15:59:59.000Z', w)).toBe(true);
    expect(isInWindow('2026-08-07T16:00:00.000Z', w)).toBe(false);
    expect(isInWindow('2026-08-06T15:59:00.000Z', w)).toBe(false);
  });
});
