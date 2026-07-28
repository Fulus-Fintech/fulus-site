// @vitest-environment jsdom
// STRUCTURE-LEVEL test, same law as portal.test.ts: jsdom has no real WebGL,
// so `new THREE.WebGLRenderer(...)` throws ("Error creating WebGL context")
// if left un-mocked. None of the postprocessing/Reflector addon constructors
// this module uses (EffectComposer, UnrealBloomPass, RenderPass, Reflector)
// touch the renderer's GL context at construction time — only
// `renderer.getPixelRatio()` / `renderer.getSize()` are read (verified
// against three@0.160.0's addon source) — so replacing just WebGLRenderer
// with a minimal stub lets the REAL createWorld()/dispose() run end-to-end,
// letting this test cover the actual code path, not a re-implemented one.
import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();

  class StubWebGLRenderer {
    domElement: HTMLCanvasElement;
    toneMapping = 0;
    toneMappingExposure = 1;
    private _pixelRatio = 1;
    private _width = 800;
    private _height = 600;
    constructor(params: { canvas: HTMLCanvasElement }) {
      this.domElement = params.canvas;
    }
    setPixelRatio(r: number): void { this._pixelRatio = r; }
    setSize(w: number, h: number): void { this._width = w; this._height = h; }
    getPixelRatio(): number { return this._pixelRatio; }
    getSize(target: THREE.Vector2): THREE.Vector2 { return target.set(this._width, this._height); }
    dispose(): void {}
  }

  return { ...actual, WebGLRenderer: StubWebGLRenderer };
});

describe('createWorld dispose() (structure only, WebGLRenderer stubbed)', () => {
  it('disposes every composer pass (RenderPass + UnrealBloomPass) — kill-class guard: leaked bloom render targets', async () => {
    const { createWorld } = await import('../../src/world/scene');
    const canvas = document.createElement('canvas');
    const world = createWorld(canvas);

    // sanity: exactly RenderPass + bloom are registered, per scene.ts
    expect(world.composer.passes).toHaveLength(2);
    // spy each pass exactly once — spying the same object+method twice
    // orphans the earlier spy (it stops receiving calls), so bloom (which
    // IS composer.passes[1]) must not be spied a second time separately.
    const passSpies = world.composer.passes.map((p) => vi.spyOn(p, 'dispose'));

    world.dispose();

    for (const spy of passSpies) expect(spy).toHaveBeenCalledTimes(1);
    expect(world.bloom.dispose).toHaveBeenCalledTimes(1); // same spy as passSpies[1]
  });

  it('disposes the portal halo CanvasTexture — kill-class guard: leaked halo/beyond textures', async () => {
    const { createWorld } = await import('../../src/world/scene');
    const canvas = document.createElement('canvas');
    const world = createWorld(canvas);

    const halo = world.portal.group.children[1] as THREE.Mesh;
    const haloMat = halo.material as THREE.MeshBasicMaterial;
    expect(haloMat.map).toBeInstanceOf(THREE.CanvasTexture); // same fixture as portal.test.ts
    const mapSpy = vi.spyOn(haloMat.map!, 'dispose');

    world.dispose();

    expect(mapSpy).toHaveBeenCalledTimes(1);
  });
});
