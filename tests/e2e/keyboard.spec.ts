// tests/e2e/keyboard.spec.ts — full keyboard path to both store badges
// (spec §6): tab reaches both, focus answers with LIGHT (box-shadow), never
// movement, and badges are >=44px targets.
import { test, expect } from '@playwright/test';

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

  // Focus answers with light: a box-shadow ring, not outline:none silence.
  expect(await ios.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');

  await page.keyboard.press('Tab');
  await expect(android).toBeFocused();
  expect(await android.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');

  // >=44px tap targets (spec §6).
  for (const badge of [ios, android]) {
    const box = await badge.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});
