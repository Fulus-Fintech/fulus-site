// @vitest-environment node
// Everything under test is pure math (crossingK/washOpacity/beatStates) or
// verbatim exported constants — no DOM, no WebGL context needed.
import { describe, it, expect } from 'vitest';
import {
  crossingK, washOpacity, CAM_POINTS,
  PLANE_Z, CROSS_RANGE, WASH_SIGMA, WASH_MAX, LERP,
} from '../../src/world/flight';
import { beatStates } from '../../src/ui/beats';

describe('crossingK — k rises 0→1 as the camera passes the plane at z=-14', () => {
  it('is 0 exactly at the portal plane', () => expect(crossingK(-14)).toBe(0));
  it('is 1 once the camera is CROSS_RANGE past the plane', () => expect(crossingK(-17.2)).toBeCloseTo(1, 10));
  it('clamps to 0 on the approach side', () => expect(crossingK(-10)).toBe(0));
  it('clamps to 1 deep inside', () => expect(crossingK(-30)).toBe(1));
});

describe('washOpacity — Gaussian on camera distance, peaks exactly at the plane', () => {
  it('peaks at exactly 0.92 at the plane', () => expect(washOpacity(-14)).toBe(0.92));
  it('is invisible 3m before the plane', () => expect(washOpacity(-11)).toBeLessThan(0.01));
  it('is invisible 3m after the plane', () => expect(washOpacity(-17)).toBeLessThan(0.01));
});

describe('constants verbatim from the prototype', () => {
  it('camera path: the 8 approved points', () => {
    expect(CAM_POINTS).toEqual([
      [0, 2.1, 8],
      [-0.9, 1.9, 3.5],
      [0.9, 1.7, -2],
      [-0.6, 1.5, -7],
      [0, 1.5, -11.5],
      [0.15, 1.6, -14.2],
      [0, 1.7, -18.5],
      [0, 1.75, -22],
    ]);
  });
  it('tuning constants', () => {
    expect(PLANE_Z).toBe(-14);
    expect(CROSS_RANGE).toBe(3.2);
    expect(WASH_SIGMA).toBe(0.55);
    expect(WASH_MAX).toBe(0.92);
    expect(LERP).toBe(0.07);
  });
});

describe('beatStates windows — boundary law (prototype comparisons are strict)', () => {
  it('hero: on below 0.15, off at 0.15', () => {
    expect(beatStates(0.14, 0).hero).toBe(true);
    expect(beatStates(0.15, 0).hero).toBe(false);
  });
  it('mid: strictly inside 0.26–0.46', () => {
    expect(beatStates(0.26, 0).mid).toBe(false);
    expect(beatStates(0.27, 0).mid).toBe(true);
    expect(beatStates(0.46, 0).mid).toBe(false);
  });
  it('open: strictly inside 0.46–0.64', () => {
    expect(beatStates(0.46, 0).open).toBe(false);
    expect(beatStates(0.5, 0).open).toBe(true);
    expect(beatStates(0.64, 0).open).toBe(false);
  });
  it('end: on only after k > 0.75 — it keys on crossing depth, not scroll progress', () => {
    expect(beatStates(0.99, 0.74).end).toBe(false);
    expect(beatStates(0.99, 0.76).end).toBe(true);
  });
});
