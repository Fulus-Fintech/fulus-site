// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCast } from '../../src/world/cast';

describe('createCast', () => {
  it('returns a group holding exactly the three canon figures, in flight order', () => {
    const cast = createCast();
    expect(cast.children.map((c) => c.name)).toEqual(['fig-pair', 'fig-lone', 'fig-group']);
  });

  it('places each figure with feet on the floor at its spec position', () => {
    const cast = createCast();
    const at = (name: string) => cast.getObjectByName(name)!.position;
    expect([at('fig-pair').x, at('fig-pair').y, at('fig-pair').z]).toEqual([-3.2, 0, -6]);
    expect([at('fig-lone').x, at('fig-lone').y, at('fig-lone').z]).toEqual([2.8, 0, -9.5]);
    expect([at('fig-group').x, at('fig-group').y, at('fig-group').z]).toEqual([-2.5, 0, -12]);
  });

  it('gives every figure a plane, a contact pool, and a floor reflection', () => {
    const cast = createCast();
    for (const fig of cast.children) {
      expect(fig.getObjectByName('figure')).toBeTruthy();
      expect(fig.getObjectByName('pool')).toBeTruthy();
      expect(fig.getObjectByName('reflection')).toBeTruthy();
      // feet on floor: the figure plane's centre sits at half its height
      expect(fig.getObjectByName('figure')!.position.y).toBeGreaterThan(0.8);
    }
  });
});
