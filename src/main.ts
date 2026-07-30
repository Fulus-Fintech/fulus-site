/// <reference types="vite/client" />

// Pure gate — unit-tested across all 8 combinations in tests/unit/boot.test.ts.
export function shouldBootWorld(env: { webgl2: boolean; reducedMotion: boolean; saveData: boolean }): boolean {
  return env.webgl2 && !env.reducedMotion && !env.saveData;
}

function detectEnv(): { webgl2: boolean; reducedMotion: boolean; saveData: boolean } {
  let webgl2 = false;
  try {
    webgl2 = document.createElement('canvas').getContext('webgl2') !== null;
  } catch {
    webgl2 = false;
  }
  return {
    webgl2,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true,
  };
}

function beacon(name: 'pv' | 'tap:ios' | 'tap:android'): void {
  try {
    navigator.sendBeacon?.('/e', name);
  } catch {
    /* analytics must never break the page or navigation */
  }
}

async function bootWorld(): Promise<void> {
  const canvas = document.getElementById('gl') as HTMLCanvasElement | null;
  if (!canvas) return;

  const [{ createWorld }, { createFlight }, { createBeatUI }, { createGovernor }] = await Promise.all([
    import('./world/scene'),
    import('./world/flight'),
    import('./ui/beats'),
    import('./world/governor'),
  ]);

  // `let` + null: the poster shed drops this reference so the disposed world
  // (renderer, scene graph, textures) can actually be collected.
  let world: ReturnType<typeof createWorld> | null = createWorld(canvas);
  const flight = createFlight(world, createBeatUI());

  let raf = 0;
  let last = performance.now();
  let dead = false;

  const governor = createGovernor(world, () => {
    // final shed: the poster underneath IS the page — fade the world away
    dead = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    canvas.style.opacity = '0';
    delete canvas.dataset.world; // acts fall back to document flow (styles.css staging is data-world gated)
    flight.dispose();
    window.setTimeout(() => {
      world?.dispose();
      world = null; // the listeners are gone; drop the last strong reference too
    }, 700); // after the fade
  });

  const loop = (t: number): void => {
    if (dead) return;
    governor.tick(t - last);
    last = t;
    flight.frame(t);
    raf = requestAnimationFrame(loop);
  };

  // The ONLY way the loop is ever scheduled. rAF callbacks queued while the tab
  // is hidden are not dropped — they fire on the next visible frame — so
  // scheduling without cancelling first (a boot in a background tab, then a
  // return to it) leaves two loops running forever: double GPU cost, and the
  // governor reading half-length frame times so it never sheds. The cancel makes
  // it idempotent; resetting `last` swallows the hidden-time delta so the
  // governor sees no fake spike either.
  const schedule = (): void => {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  schedule();

  // fade the world in over the poster: 600ms opacity, never a black hold
  canvas.style.transition = 'opacity 600ms ease';
  requestAnimationFrame(() => {
    canvas.style.opacity = '1';
    canvas.dataset.world = 'on'; // staging hook: html:has(#gl[data-world]) re-stages the acts as fixed beats; the reduced-motion e2e asserts this never appears
  });

  // named so the poster shed can remove them — an anonymous listener holding
  // `world` in its closure pins the whole disposed world in memory forever
  function onResize(): void {
    if (!world) return;
    world.setSize(window.innerWidth, window.innerHeight);
    governor.reapply(); // composer.setSize just restored every pass at full res; tiers only ever drop
  }
  function onVisibility(): void {
    if (dead) return;
    if (document.hidden) cancelAnimationFrame(raf);
    else schedule();
  }
  addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);
}

function boot(): void {
  beacon('pv'); // exactly once per pageview

  const taps = [
    ['/app/ios', 'tap:ios'],
    ['/app/android', 'tap:android'],
  ] as const;
  for (const [href, ev] of taps) {
    document.querySelectorAll(`a[href="${href}"]`).forEach((a) => {
      a.addEventListener('pointerup', () => beacon(ev)); // no preventDefault — navigation proceeds
    });
  }

  if (!shouldBootWorld(detectEnv())) return; // poster edition IS the page, not a fallback apology

  const idle = (cb: () => void): void => {
    if ('requestIdleCallback' in window) requestIdleCallback(cb, { timeout: 2000 });
    else setTimeout(cb, 200);
  };
  idle(() => {
    void bootWorld();
  });
}

if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  if (document.readyState === 'complete') boot();
  else addEventListener('load', () => boot(), { once: true });
}
