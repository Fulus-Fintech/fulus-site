// tests/e2e/a11y.spec.ts — axe-core scans on BOTH editions (spec §7).
// Zero violations is the gate. Never filter rules to get green — fix the
// markup or the colour. (Contrast over the canvas/poster image is reported
// by axe as "incomplete", not a violation — the AA law for text colours is
// documented in src/styles.css, measured in tests/unit/styles.test.ts, and
// spot-checked as RENDERED colour by the poster-edition tests at the foot of
// this file. A declared colour that clears the floor in the sheet but never
// reaches the element is still a failure, and axe would not say so.)
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

test.describe('poster edition — what actually reaches the pixels', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('quiet copy renders at the #93A1B0 AA floor', async ({ page }) => {
    await page.goto('/');
    // "SCROLL" (.hint) and "THE WAY IN" (.meter) were rgba(242, 245, 248, .45),
    // which composites to 4.19:1 on #020B18 — under the 4.5:1 AA floor and
    // under this stylesheet's own declared standard.
    for (const selector of ['.hint', '.meter']) {
      await expect(page.locator(selector).first()).toHaveCSS('color', 'rgb(147, 161, 176)');
    }
  });

  test('the legibility scrim is a flat full-bleed dim when nothing moves', async ({ page }) => {
    await page.goto('/');
    // The authored world scrim is a centre ellipse, justified by a camera that
    // keeps the bright core there. In the poster edition the camera does not
    // exist and the copy scrolls across a fixed photograph, so the ellipse
    // protects the wrong part of the frame.
    const scrim = await page.evaluate(() => {
      const s = getComputedStyle(document.body, '::before');
      return { image: s.backgroundImage, colour: s.backgroundColor };
    });
    expect(scrim.image).toBe('none'); // no gradient — full bleed
    expect(scrim.colour).toBe('rgba(2, 11, 24, 0.55)'); // the ellipse's own peak, everywhere
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
