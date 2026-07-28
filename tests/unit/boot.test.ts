import { describe, it, expect } from 'vitest';
import { shouldBootWorld } from '../../src/main';

describe('shouldBootWorld — world only when webgl2 && !reducedMotion && !saveData', () => {
  const combos: Array<[boolean, boolean, boolean, boolean]> = [
    // webgl2, reducedMotion, saveData, expected
    [true, false, false, true],
    [true, true, false, false],
    [true, false, true, false],
    [true, true, true, false],
    [false, false, false, false],
    [false, true, false, false],
    [false, false, true, false],
    [false, true, true, false],
  ];
  it.each(combos)('webgl2=%s reducedMotion=%s saveData=%s -> %s', (webgl2, reducedMotion, saveData, expected) => {
    expect(shouldBootWorld({ webgl2, reducedMotion, saveData })).toBe(expected);
  });
});
