// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createCast } from '../../src/world/cast';

describe('createCast', () => {
  it('returns a group holding exactly the six canon figures, in flight order', () => {
    const cast = createCast();
    expect(cast.children.map((c) => c.name)).toEqual([
      'fig-connector',
      'fig-operator',
      'fig-walker',
      'fig-strategist',
      'fig-anchor',
      'fig-visionary',
    ]);
  });

  it('places each figure with feet on the floor at its spec position', () => {
    const cast = createCast();
    const at = (name: string) => cast.getObjectByName(name)!.position;
    expect([at('fig-connector').x, at('fig-connector').y, at('fig-connector').z]).toEqual([-3.6, 0, -5.9]);
    expect([at('fig-operator').x, at('fig-operator').y, at('fig-operator').z]).toEqual([-2.7, 0, -6.2]);
    expect([at('fig-walker').x, at('fig-walker').y, at('fig-walker').z]).toEqual([2.8, 0, -9.5]);
    expect([at('fig-strategist').x, at('fig-strategist').y, at('fig-strategist').z]).toEqual([-3.1, 0, -11.6]);
    expect([at('fig-anchor').x, at('fig-anchor').y, at('fig-anchor').z]).toEqual([-2.2, 0, -12.2]);
    expect([at('fig-visionary').x, at('fig-visionary').y, at('fig-visionary').z]).toEqual([-1.5, 0, -11.5]);
  });

  it('gives every figure a plane, a contact pool, a floor reflection, and a backglow', () => {
    const cast = createCast();
    for (const fig of cast.children) {
      expect(fig.getObjectByName('figure')).toBeTruthy();
      expect(fig.getObjectByName('pool')).toBeTruthy();
      expect(fig.getObjectByName('reflection')).toBeTruthy();
      expect(fig.getObjectByName('backglow')).toBeTruthy();
      // feet on floor: the figure plane's centre sits at half its height
      expect(fig.getObjectByName('figure')!.position.y).toBeGreaterThan(0.8);
      // the backlight pool sits BEHIND the figure (local -Z) at chest height
      const backglow = fig.getObjectByName('backglow')!;
      expect(backglow.position.z).toBeLessThan(0);
      expect(backglow.position.y).toBeGreaterThan(0.8);
    }
  });
});
