import type { WorldHandles } from './scene';

export type Tier = 3 | 2 | 1 | 0;

// Over-budget = worse than 30fps. 60 consecutive bad frames (~2s of pain) triggers a shed.
export const FRAME_BUDGET_MS = 33.4;
export const DROP_AFTER_FRAMES = 60;

export function nextTier(current: Tier, overBudgetFrames: number): Tier {
  if (overBudgetFrames >= DROP_AFTER_FRAMES && current > 0) return (current - 1) as Tier;
  return current; // tiers only drop — there is no way back up
}

export function createGovernor(world: WorldHandles, onPoster: () => void): { tick(frameMs: number): void; tier(): Tier } {
  let tier: Tier = 3;
  let over = 0;
  let posterFired = false;

  const apply = (t: Tier): void => {
    if (t === 2) {
      // shed 1: bloom resolution + pixel ratio 1.5 (spec: cap 1.5 under load)
      world.bloom.setSize(Math.floor(window.innerWidth / 2), Math.floor(window.innerHeight / 2));
      world.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else if (t === 1) {
      // shed 2: Reflector resolution + mote count
      world.mirror.getRenderTarget().setSize(512, 512);
      world.dust.geometry.setDrawRange(0, 325);
    } else if (t === 0) {
      // shed 3: Reflector off — the beyondRef sprite stays, so the floor
      // still glows (kill-class guard: dead-slab floor)
      world.mirror.visible = false;
    }
  };

  return {
    tick(frameMs: number): void {
      if (frameMs > FRAME_BUDGET_MS) over += 1;
      else over = 0;
      const t = nextTier(tier, over);
      if (t !== tier) {
        tier = t;
        over = 0;
        apply(t);
        return;
      }
      if (tier === 0 && over >= DROP_AFTER_FRAMES && !posterFired) {
        posterFired = true; // final shed: hand the page back to the poster edition
        onPoster();
      }
    },
    tier(): Tier { return tier; },
  };
}
