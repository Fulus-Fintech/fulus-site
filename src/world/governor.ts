import type { WorldHandles } from './scene';

export type Tier = 3 | 2 | 1 | 0;

const BUDGET_MS = 33.4; // over-budget = worse than 30fps; 60 bad frames ~2s of pain (Task 6's contract — never tightened silently)
const DROP_AT = 60;     // consecutive over-budget frames before a shed

// Tiers only drop, never climb (spec §6). Extended shed ladder — the Task 12
// richness sheds FIRST, then the spec §6 core order:
//   3 -> 2  film-grain/vignette/grade pass OFF, water ripple OFF
//   2 -> 1  light shafts OFF; bloom resolution halved; pixelRatio capped at
//           1.5 (spec §6: 'cap 2 (1.5 under load)'); Reflector render
//           target 512x512; dust draw range halved (650 -> 325)
//   1 -> 0  Reflector OFF entirely (the cast's fake floor-reflection decals
//           and the beyond's mirrored counterpart stay — the floor never
//           reads as a dead slab)
//   at 0    still over budget for another 60 frames -> onPoster() once
//           (poster edition takes over)
export function nextTier(current: Tier, overBudgetFrames: number): Tier {
  if (current > 0 && overBudgetFrames >= DROP_AT) return (current - 1) as Tier;
  return current;
}

export function createGovernor(world: WorldHandles, onPoster: () => void) {
  let tier: Tier = 3;
  let over = 0;
  let posterFired = false;
  // Every shed applied so far, in the order it was applied. A window resize
  // walks composer.setSize over each pass at full resolution, which silently
  // climbs a shed tier back up — and tiers only ever drop (spec §6). The
  // resize path replays this list through reapply().
  const applied: Tier[] = [];

  function applyTier(t: Tier): void {
    if (t === 2) {
      world.env.grain.enabled = false;
      world.env.ripple.mesh.visible = false;
    } else if (t === 1) {
      world.env.shafts.visible = false;
      // spec §6: pixelRatio cap 2 (1.5 under load). EffectComposer snapshots
      // the renderer's pixel ratio in its constructor and never re-reads it, so
      // renderer.setPixelRatio alone sheds nothing — the composed frame (which
      // IS the frame) keeps rendering at the old ratio. ORDER IS LOAD-BEARING:
      // composer.setPixelRatio calls setSize, which re-applies every pass at
      // full resolution, so the bloom must be halved AFTER the cap lands.
      const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
      world.renderer.setPixelRatio(pixelRatio);
      world.composer.setPixelRatio(pixelRatio);
      world.bloom.setSize(world.bloom.resolution.x / 2, world.bloom.resolution.y / 2);
      world.mirror.getRenderTarget().setSize(512, 512);
      world.dust.geometry.setDrawRange(0, 325);
    } else if (t === 0) {
      world.mirror.visible = false;
    }
  }

  return {
    tick(frameMs: number): void {
      if (frameMs > BUDGET_MS) over += 1;
      else over = 0;
      const next = nextTier(tier, over);
      if (next !== tier) {
        tier = next;
        over = 0;
        applied.push(tier);
        applyTier(tier);
        return;
      }
      if (tier === 0 && over >= DROP_AT && !posterFired) {
        posterFired = true;
        onPoster();
      }
    },
    // Call after any world.setSize(): composer.setSize re-applies each pass at
    // the new full resolution, undoing the sheds. Replaying them re-asserts the
    // shed state (visible=false, halved bloom, 512 mirror, halved dust range)
    // against the fresh sizes, so a resize can never climb a tier back.
    reapply(): void {
      for (const t of applied) applyTier(t);
    },
    tier: (): Tier => tier,
  };
}
