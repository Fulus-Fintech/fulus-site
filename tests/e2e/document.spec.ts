// tests/e2e/document.spec.ts — THE COPY LOCK (spec §4 + §7).
// Runs in the nojs-document project: page JavaScript is DISABLED, because the
// document must be complete with JS off (spec §6 document-first floor).
// Note: Playwright's page.evaluate still works with javaScriptEnabled:false —
// it is CDP-injected; only the page's own scripts are disabled.
// Every string here is canon. Additions/changes need founder sign-off.
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('title and meta description', async ({ page }) => {
  await expect(page).toHaveTitle('Fulus — It’s open.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Fulus is group investing for you and your friends. Everyone sees everything. On the App Store and Google Play.',
  );
});

test('copy lock - every rendered string verbatim', async ({ page }) => {
  await expect(page.locator('.wordmark')).toHaveText('FULUS');
  await expect(page.locator('.meter-label')).toHaveText('THE WAY IN');
  await expect(page.locator('h1')).toHaveText('The group chat, now invested.');
  await expect(page.locator('.sub')).toHaveText('Group investing for the circle you already have.');
  await expect(page.locator('.hint')).toHaveText('SCROLL');
  await expect(page.locator('.waypoint')).toHaveText('One pot. Real votes. Everyone sees everything.');
  await expect(page.locator('.door-line')).toHaveText('It’s open.'); // typographic apostrophe U+2019
  await expect(page.locator('#walk-in h2')).toHaveText('Walk in.');
  await expect(page.locator('.sig')).toHaveText('The group chat, now invested.');
  await expect(page.locator('.folio')).toHaveText('FULUS — 01.08.2026');
  await expect(page.locator('.legal-line')).toHaveText('PRIVACY · © 2026 FULUS');
  await expect(page.locator('.tm')).toHaveText(
    'App Store is a trademark of Apple Inc. · Google Play and the Google Play logo are trademarks of Google LLC.',
  );
});

test('badges are real links with the contract labels', async ({ page }) => {
  const ios = page.locator('a[href="/app/ios"]');
  const android = page.locator('a[href="/app/android"]');
  await expect(ios).toHaveCount(1);
  await expect(android).toHaveCount(1);
  await expect(ios).toHaveAttribute('aria-label', 'Download Fulus on the App Store');
  await expect(android).toHaveAttribute('aria-label', 'Get Fulus on Google Play');
});

test('end block id, doors dim state', async ({ page }) => {
  await expect(page.locator('section#walk-in')).toHaveCount(1);
  // The static file defaults to data-doors="pre"; the worker (Task 3) stamps
  // the live value via HTMLRewriter.
  await expect(page.locator('html')).toHaveAttribute('data-doors', 'pre');
  await expect(page.locator('.doors-note')).toHaveText('Doors at midnight.');
  await expect(page.locator('.doors-note')).toBeVisible();
});

test('no Terms link until the founder supplies content (flagged at Gate G1)', async ({ page }) => {
  await expect(page.locator('a[href*="terms" i]')).toHaveCount(0);
  expect(await page.getByText('TERMS', { exact: true }).count()).toBe(0);
});

test('canvas is an aria-hidden enhancement layer', async ({ page }) => {
  await expect(page.locator('canvas#gl')).toHaveAttribute('aria-hidden', 'true');
});

for (const width of [320, 1440, 3440]) {
  test(`no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
