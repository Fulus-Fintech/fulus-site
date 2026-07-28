import { describe, it, expect } from 'vitest';
import { nextTier, type Tier } from '../../src/world/governor';

describe('nextTier — tiers only drop (spec §6 law)', () => {
  it('holds below the 60-frame threshold', () => {
    expect(nextTier(3, 0)).toBe(3);
    expect(nextTier(3, 59)).toBe(3);
  });
  it('drops exactly one tier at 60 over-budget frames', () => {
    expect(nextTier(3, 60)).toBe(2);
    expect(nextTier(2, 60)).toBe(1);
    expect(nextTier(1, 60)).toBe(0);
  });
  it('floors at 0 — never negative', () => {
    expect(nextTier(0, 60)).toBe(0);
    expect(nextTier(0, 10_000)).toBe(0);
  });
  it('never rises: no input increases the tier', () => {
    const tiers: Tier[] = [3, 2, 1, 0];
    for (const t of tiers) {
      for (const over of [0, 1, 59, 60, 600]) {
        expect(nextTier(t, over)).toBeLessThanOrEqual(t);
      }
    }
  });
});
