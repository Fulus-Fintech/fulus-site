// @vitest-environment node
// Everything under test is pure math (crossingK/washOpacity/beatStates) or
// verbatim exported constants — no DOM, no WebGL context needed.
import { describe, it, expect } from 'vitest';
import {
  crossingK, washOpacity, doorProximity, CAM_POINTS,
  PLANE_Z, CROSS_RANGE, WASH_SIGMA, WASH_MAX, LERP,
  APPROACH_RANGE, APPROACH_DIM,
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
  it('keeps night values at the settled QA transit stop (G2 QA round 3: the breath hugs the plane)', () => {
    // settled prog 0.72 puts the camera at z ≈ -13.39; the wash must not
    // flood that frame (it sat at ~0.49 with the old sigma — pale-cyan whiteout)
    expect(washOpacity(-13.39)).toBeLessThan(0.05);
  });
});

describe('doorProximity — the door yields as the camera reaches it (G2 QA law: no blown bloom core mid-transit)', () => {
  it('is 1 exactly at the portal plane', () => expect(doorProximity(PLANE_Z)).toBe(1));
  it('is 0 once the door no longer fills the frame (APPROACH_RANGE away, both sides)', () => {
    expect(doorProximity(PLANE_Z + APPROACH_RANGE)).toBe(0);
    expect(doorProximity(PLANE_Z - APPROACH_RANGE)).toBe(0);
    expect(doorProximity(0)).toBe(0);
    expect(doorProximity(-30)).toBe(0);
  });
  it('is symmetric about the plane — approach dim hands off to the inside dim', () => {
    expect(doorProximity(PLANE_Z + 1)).toBeCloseTo(doorProximity(PLANE_Z - 1), 10);
  });
  it('extinguishes the face at the QA transit stop — the night world carries the frame (z≈-13.4)', () => {
    // portal shader max interior HDR ≈ 2.9, written RAW (the custom shader has
    // no tonemapping chunk). G2 QA round 3: the near ramp sheds the face's
    // PRESENCE (alpha, squared falloff — flight.ts) — any residual of a
    // full-frustum emissive face flattens the whole frame to a midtone, so by
    // the settled 0.72 stop the face must be effectively gone.
    const alpha = (1 - doorProximity(-13.4) * APPROACH_DIM) ** 2;
    const insideDim = 1 - crossingK(-13.4) * 0.68;
    expect(alpha).toBeLessThan(0.02); // face contribution ≈ 2.9*alpha ≈ invisible
    expect(2.9 * insideDim * alpha).toBeLessThan(0.1); // deep night, not a pale field
  });
  it('yield LEADS the transit — deep by mid-approach, where the face already dominates the frame', () => {
    // ease-out shape: at half range (z=-12.75) the face fills most of the
    // frustum and its core must already sit at/under the bloom threshold
    expect(doorProximity(-12.75)).toBeGreaterThanOrEqual(0.75);
  });
  it('does not touch the approved figure stops (0.15/0.3/0.42/0.55 all have z >= -8.3)', () => {
    expect(doorProximity(-8.3)).toBe(0);
  });
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
    expect(WASH_MAX).toBe(0.92);
    expect(LERP).toBe(0.07);
  });
  it('crossing tuning (G2 QA rounds 1+3 — not prototype-verbatim, see doorProximity/washOpacity)', () => {
    expect(APPROACH_RANGE).toBe(2.5);
    expect(APPROACH_DIM).toBe(0.96);
    expect(WASH_SIGMA).toBe(0.24); // prototype 0.55 flooded the settled 0.72 stop at ~0.49 opacity
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
