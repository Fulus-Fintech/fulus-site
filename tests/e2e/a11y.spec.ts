// tests/e2e/a11y.spec.ts — axe-core scans on BOTH editions (spec §7).
// Zero violations is the gate. Never filter rules to get green — fix the
// markup or the colour. (Contrast over the canvas/poster image is reported
// by axe as "incomplete", not a violation — the AA law for text colours is
// documented in src/styles.css and enforced by eye + the #93A1B0 floor.)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('axe — poster edition', () => {
  // DEVIATION from a plain `test.use({ reducedMotion: 'reduce' })`: verified
  // (see tests/e2e/visual.spec.ts) that reducedMotion has no named test
  // fixture in the installed @playwright/test — it is a silent no-op.
  // contextOptions IS a real fixture, spread into browser.newContext().
  test.use({ contextOptions: { reducedMotion: 'reduce' } }); // shouldBootWorld false — world never loads
  test('no violations', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});

test.describe('axe — world edition', () => {
  test('no violations', async ({ page }) => {
    await page.goto('/');
    // Let the world chunk boot and fade in (600ms fade + import time). If
    // headless WebGL2 is unavailable the page stays on the poster edition —
    // the scan is valid either way because ALL copy is real DOM above the
    // canvas and the canvas is aria-hidden (spec §6 accessibility).
    await page.waitForTimeout(3000);
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
