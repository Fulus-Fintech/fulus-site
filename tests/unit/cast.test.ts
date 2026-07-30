// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createCast, updateCast } from '../../src/world/cast';

const opacityOf = (o: THREE.Object3D): number =>
  ((o as THREE.Mesh).material as THREE.Material & { opacity: number }).opacity;

const baseOf = (o: THREE.Object3D): number | undefined =>
  (o.userData as { baseOpacity?: number }).baseOpacity;

// jsdom never resolves an <img>, so a raw createCast() stays in its
// pre-load state forever. This drives the loader's success path synchronously
// with a stand-in body texture, which is the state the flight actually runs in.
function loadedCast(): THREE.Group {
  const spy = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(function (
    this: THREE.TextureLoader,
    _url: string,
    onLoad?: (t: THREE.Texture) => void,
  ) {
    const tex = new THREE.Texture();
    tex.image = { width: 512, height: 1024 };
    onLoad?.(tex);
    return tex;
  } as THREE.TextureLoader['load']);
  const cast = createCast();
  spy.mockRestore();
  return cast;
}

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

describe('createCast — nothing shows before the body does', () => {
  it('authors every layer at zero until the body texture lands', () => {
    const cast = createCast(); // loader never resolves in jsdom
    for (const fig of cast.children) {
      for (const layer of ['figure', 'pool', 'reflection', 'backglow']) {
        const mesh = fig.getObjectByName(layer)!;
        expect(opacityOf(mesh), `${fig.name}/${layer} opacity`).toBe(0);
        expect(baseOf(mesh), `${fig.name}/${layer} baseOpacity`).toBe(0);
      }
    }
  });

  it('a frame rendered before the load shows no glowing oval and no floor pool', () => {
    const cast = createCast();
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 2, 8); // start of the flight: every figure at full presence
    updateCast(cast, camera);
    for (const fig of cast.children) {
      expect(opacityOf(fig.getObjectByName('backglow')!)).toBe(0);
      expect(opacityOf(fig.getObjectByName('pool')!)).toBe(0);
    }
  });

  it('raises body, reflection, pool and backglow together on load', () => {
    const cast = loadedCast();
    for (const fig of cast.children) {
      const figure = fig.getObjectByName('figure')!;
      const pool = fig.getObjectByName('pool')!;
      const reflection = fig.getObjectByName('reflection')!;
      const backglow = fig.getObjectByName('backglow')!;
      expect(baseOf(figure)).toBe(1);
      expect(baseOf(pool)).toBe(0.35);
      expect(baseOf(reflection)).toBe(0.18);
      expect(baseOf(backglow)).toBe(0.55);
      // and the live materials match, so the very first post-load frame is right
      expect(opacityOf(figure)).toBe(1);
      expect(opacityOf(pool)).toBe(0.35);
      expect(opacityOf(reflection)).toBe(0.18);
      expect(opacityOf(backglow)).toBe(0.55);
    }
  });
});

describe('updateCast — proximity fade', () => {
  it('dissolves a figure the camera has arrived at, and leaves distant ones alone', () => {
    const cast = loadedCast();
    const camera = new THREE.PerspectiveCamera();
    const near = cast.getObjectByName('fig-visionary')!;   // [-1.5, 0, -11.5]
    const far = cast.getObjectByName('fig-connector')!;    // [-3.6, 0, -5.9]

    // park the camera on top of the visionary: inside FADE_GONE
    camera.position.set(-1.5, 0, -11.5);
    updateCast(cast, camera);
    expect(near.visible).toBe(false);
    expect(far.visible).toBe(true);
    expect(opacityOf(far.getObjectByName('pool')!)).toBeCloseTo(0.35);
  });

  it('restores authored opacities once the camera pulls away — no stuck fade', () => {
    const cast = loadedCast();
    const camera = new THREE.PerspectiveCamera();
    const fig = cast.getObjectByName('fig-anchor')!;
    const pool = fig.getObjectByName('pool')!;
    const glow = fig.getObjectByName('backglow')!;

    camera.position.set(-2.2, 0, -12.2); // on top of it
    updateCast(cast, camera);
    expect(opacityOf(pool)).toBe(0);

    camera.position.set(0, 2, 8); // back at the start of the flight
    updateCast(cast, camera);
    expect(opacityOf(pool)).toBeCloseTo(0.35);
    expect(opacityOf(glow)).toBeCloseTo(0.55);
    expect(fig.visible).toBe(true);
  });

  it('never samples the live material: a faded pass leaves baseOpacity untouched', () => {
    const cast = loadedCast();
    const camera = new THREE.PerspectiveCamera();
    const fig = cast.getObjectByName('fig-walker')!;

    camera.position.set(2.8, 0, -9.5); // on top of it — every layer driven to 0
    updateCast(cast, camera);
    updateCast(cast, camera); // a second pass must not "capture" the faded value
    expect(baseOf(fig.getObjectByName('pool')!)).toBe(0.35);
    expect(baseOf(fig.getObjectByName('backglow')!)).toBe(0.55);

    camera.position.set(0, 2, 8);
    updateCast(cast, camera);
    expect(opacityOf(fig.getObjectByName('pool')!)).toBeCloseTo(0.35);
    expect(opacityOf(fig.getObjectByName('backglow')!)).toBeCloseTo(0.55);
  });
});
