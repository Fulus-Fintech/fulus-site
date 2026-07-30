// tests/e2e/keyboard.spec.ts — full keyboard path to both store badges
// (spec §6): tab reaches both, focus answers with LIGHT (box-shadow), never
// movement, and badges are >=44px targets.
import { test, expect, type Locator } from '@playwright/test';

// The ring from a:focus-visible (src/styles.css), as Chromium serializes the
// middle layer of `0 0 0 4px #00E5FF`. Asserting the RING and not merely
// "box-shadow is not none" is the point: `.badge:hover, .badge:focus-visible`
// (0,2,0) used to outrank a:focus-visible (0,1,1), and because box-shadow does
// not stack across rules the badges answered focus with the soft hover glow
// instead — a shadow, so the old `!== 'none'` check stayed green.
const RING = 'rgb(0, 229, 255) 0px 0px 0px 4px';

// Polled, not read once: .badge carries `transition: box-shadow .12s`, so a
// single read lands mid-interpolation and serializes the ring at fractional
// alpha (observed: `rgba(0, 229, 255, 0.984) 0px 0px 0px 3.9339px`).
const boxShadowOf = (badge: Locator): ReturnType<typeof expect.poll> =>
  expect.poll(() => badge.evaluate((el) => getComputedStyle(el).boxShadow));

// DEVIATION from a plain `test.use({ reducedMotion: 'reduce' })`: verified
// (see tests/e2e/visual.spec.ts) that reducedMotion has no named test
// fixture in the installed @playwright/test — it is a silent no-op.
// contextOptions IS a real fixture, spread into browser.newContext().
test.use({ contextOptions: { reducedMotion: 'reduce' } }); // poster edition — stable layout

test('tab reaches both badges with visible focus light', async ({ page }) => {
  await page.goto('/');
  const ios = page.locator('a[href="/app/ios"]');
  const android = page.locator('a[href="/app/android"]');

  // Tab from the top until the iOS badge holds focus (bounded walk).
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await ios.evaluate((el) => el === document.activeElement);
  }
  await expect(ios).toBeFocused();

  // Focus answers with light: a box-shadow RING, not outline:none silence and
  // not the hover glow wearing the ring's job.
  await boxShadowOf(ios).toContain(RING);

  await page.keyboard.press('Tab');
  await expect(android).toBeFocused();
  await boxShadowOf(android).toContain(RING);

  // A pointer resting on a keyboard-focused badge must not take the ring away:
  // `.badge:hover` still outranks the ring, so it is scoped :not(:focus-visible).
  await android.hover();
  await expect(android).toBeFocused();
  await boxShadowOf(android).toContain(RING);

  // >=44px tap targets (spec §6).
  for (const badge of [ios, android]) {
    const box = await badge.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
