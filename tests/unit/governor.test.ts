import { describe, it, expect, vi } from 'vitest';
import { nextTier, createGovernor } from '../../src/world/governor';
import type { WorldHandles } from '../../src/world/scene';

// node env has no window; the tier-1 shed reads window.devicePixelRatio
// for the 1.5 under-load cap (spec §6), so stub it here.
vi.stubGlobal('window', { devicePixelRatio: 2 });

describe('nextTier (contract unchanged)', () => {
  it('drops exactly one tier at 60 over-budget frames', () => {
    expect(nextTier(3, 59)).toBe(3);
    expect(nextTier(3, 60)).toBe(2);
    expect(nextTier(2, 60)).toBe(1);
    expect(nextTier(1, 200)).toBe(0);
  });
  it('never climbs and never drops below 0', () => {
    expect(nextTier(0, 999)).toBe(0);
  });
});

function stubWorld() {
  const mirrorRT = { setSize: vi.fn() };
  const world = {
    renderer: { setPixelRatio: vi.fn() },
    composer: { setPixelRatio: vi.fn(), setSize: vi.fn() },
    bloom: { resolution: { x: 1440, y: 900 }, setSize: vi.fn() },
    mirror: { visible: true, getRenderTarget: () => mirrorRT },
    dust: { geometry: { setDrawRange: vi.fn() } },
    env: {
      grain: { enabled: true },
      ripple: { mesh: { visible: true } },
      shafts: { visible: true },
    },
  } as unknown as WorldHandles;
  return { world, mirrorRT };
}

const slowFrames = (g: { tick(ms: number): void }, n: number) => {
  for (let i = 0; i < n; i++) g.tick(40);
};

describe('createGovernor extended shed ladder (richness sheds first)', () => {
  it('3->2 sheds grain/vignette + ripple; 2->1 shafts + core; 1->0 reflector; then poster', () => {
    const { world, mirrorRT } = stubWorld();
    const onPoster = vi.fn();
    const g = createGovernor(world, onPoster);

    slowFrames(g, 60);
    expect(g.tier()).toBe(2);
    expect((world as any).env.grain.enabled).toBe(false);
    expect((world as any).env.ripple.mesh.visible).toBe(false);
    expect((world as any).env.shafts.visible).toBe(true); // not yet

    slowFrames(g, 60);
    expect(g.tier()).toBe(1);
    expect((world as any).env.shafts.visible).toBe(false);
    expect((world as any).bloom.setSize).toHaveBeenCalledWith(720, 450);
    expect((world as any).renderer.setPixelRatio).toHaveBeenCalledWith(1.5); // min(stubbed dPR 2, 1.5) — the under-load cap
    expect(mirrorRT.setSize).toHaveBeenCalledWith(512, 512);
    expect((world as any).dust.geometry.setDrawRange).toHaveBeenCalledWith(0, 325);

    slowFrames(g, 60);
    expect(g.tier()).toBe(0);
    expect((world as any).mirror.visible).toBe(false); // fake reflection decals from cast.ts stay
    expect(onPoster).not.toHaveBeenCalled();

    slowFrames(g, 60);
    expect(onPoster).toHaveBeenCalledTimes(1); // and only once, ever
    slowFrames(g, 60);
    expect(onPoster).toHaveBeenCalledTimes(1);
  });

  it('a good frame resets the over-budget counter', () => {
    const { world } = stubWorld();
    const g = createGovernor(world, vi.fn());
    slowFrames(g, 59);
    g.tick(8); // one frame under budget
    slowFrames(g, 59);
    expect(g.tier()).toBe(3);
  });
});

describe('the tier-1 pixelRatio cap reaches the frame that is actually shown', () => {
  it('caps the composer too — EffectComposer snapshots the renderer ratio at construction', () => {
    const { world } = stubWorld();
    const g = createGovernor(world, vi.fn());
    slowFrames(g, 120); // 3 -> 2 -> 1
    expect(g.tier()).toBe(1);
    expect((world as any).composer.setPixelRatio).toHaveBeenCalledWith(1.5);
  });

  it('caps the composer BEFORE halving the bloom (setPixelRatio calls setSize)', () => {
    const { world } = stubWorld();
    const g = createGovernor(world, vi.fn());
    slowFrames(g, 120);
    const capOrder = (world as any).composer.setPixelRatio.mock.invocationCallOrder[0];
    const bloomOrder = (world as any).bloom.setSize.mock.invocationCallOrder[0];
    // reversed, composer.setSize would re-apply the bloom pass at full size
    expect(capOrder).toBeLessThan(bloomOrder);
  });
});

describe('reapply — a resize can never climb back a shed tier', () => {
  it('is a no-op before anything has been shed', () => {
    const { world, mirrorRT } = stubWorld();
    const g = createGovernor(world, vi.fn());
    g.reapply();
    expect(g.tier()).toBe(3);
    expect((world as any).env.grain.enabled).toBe(true);
    expect((world as any).bloom.setSize).not.toHaveBeenCalled();
    expect(mirrorRT.setSize).not.toHaveBeenCalled();
  });

  it('replays every shed the resize undid, and never changes the tier', () => {
    const { world, mirrorRT } = stubWorld();
    const g = createGovernor(world, vi.fn());
    slowFrames(g, 120); // 3 -> 2 -> 1
    expect(g.tier()).toBe(1);

    // what a window resize does: composer.setSize walks every pass at the new
    // full resolution, so the shed state is silently restored to full richness
    (world as any).env.grain.enabled = true;
    (world as any).env.ripple.mesh.visible = true;
    (world as any).env.shafts.visible = true;
    (world as any).bloom.setSize.mockClear();
    (world as any).composer.setPixelRatio.mockClear();
    mirrorRT.setSize.mockClear();
    (world as any).dust.geometry.setDrawRange.mockClear();

    g.reapply();

    expect((world as any).env.grain.enabled).toBe(false);
    expect((world as any).env.ripple.mesh.visible).toBe(false);
    expect((world as any).env.shafts.visible).toBe(false);
    expect((world as any).bloom.setSize).toHaveBeenCalledWith(720, 450);
    expect((world as any).composer.setPixelRatio).toHaveBeenCalledWith(1.5);
    expect(mirrorRT.setSize).toHaveBeenCalledWith(512, 512);
    expect((world as any).dust.geometry.setDrawRange).toHaveBeenCalledWith(0, 325);
    expect(g.tier()).toBe(1);
  });

  it('replays the tier-0 shed too, and does not re-fire the poster', () => {
    const { world } = stubWorld();
    const onPoster = vi.fn();
    const g = createGovernor(world, onPoster);
    slowFrames(g, 180); // 3 -> 2 -> 1 -> 0
    expect(g.tier()).toBe(0);

    (world as any).mirror.visible = true; // as if a resize had revived it
    g.reapply();
    expect((world as any).mirror.visible).toBe(false);
    expect(onPoster).not.toHaveBeenCalled();
  });
});
