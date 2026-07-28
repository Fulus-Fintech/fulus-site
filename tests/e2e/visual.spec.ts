// tests/e2e/visual.spec.ts — poster-edition visual baselines. This is the
// ONLY pixel-gated surface: WebGL frames are review artifacts, eyeballed,
// never CI-gated (spec §7 — the SwiftShader lesson stands).
//
// SNAPSHOT GOVERNANCE (law): files under visual.spec.ts-snapshots/ change
// ONLY in a commit whose message cites a founder approval (gate + date, e.g.
// "baselines: refresh per G1 approval 2026-08-01"). Never run
// --update-snapshots to make a red diff green without that reference.
//
// Baselines are platform-suffixed (-chromium-win32 here); CI runs
// windows-latest so it compares against the committed set.
import { test, expect } from '@playwright/test';

// Pins the poster edition: shouldBootWorld() is false under reduced motion,
// so the world chunk never loads and the page is deterministic. If the world
// ever leaked past the gate, its animated canvas could not match a static
// baseline — the screenshot comparison itself is the regression guard.
//
// DEVIATION from the brief's literal `test.use({ reducedMotion: 'reduce' })`:
// verified against the installed @playwright/test@1.61.1 fixture set
// (node_modules/playwright/lib/index.js) that `reducedMotion` has NO named
// test fixture in this version — only `colorScheme`, `viewport`, etc. do.
// `test.use({ reducedMotion: 'reduce' })` is therefore a silent no-op here:
// matchMedia('(prefers-reduced-motion: reduce)') stayed `false` in a direct
// probe. On this machine headless Chromium creates a working WebGL2 context
// even without `--enable-unsafe-swiftshader`, so shouldBootWorld() returned
// true and the world booted DURING baseline capture — the exact leak this
// comment block warns about, confirmed by a 6233px-tall first screenshot
// (680vh world-mode layout) instead of the poster edition's 3716px flow
// height. `contextOptions` IS a real fixture (spread verbatim into
// `browser.newContext()`), so routing reducedMotion through it actually
// reaches Chromium. Re-verified: matchMedia reports `true`, world never
// boots, screenshots are deterministic.
test.use({ contextOptions: { reducedMotion: 'reduce' } });

const viewports = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'android-360x800', width: 360, height: 800 },
] as const;

for (const vp of viewports) {
  test(`poster edition — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await expect(page).toHaveScreenshot(`poster-${vp.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.001,
      animations: 'disabled',
    });
  });
}
