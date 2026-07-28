import { test, expect } from '@playwright/test';

test('world boots: canvas fades in, beats stage fixed, zero console errors through the full flight', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'world', 'runs only in the world project (SwiftShader WebGL2)');

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    if (msg.location().url.endsWith('/e')) return; // beacon endpoint lives on the Worker, not vite preview
    errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));

  await page.goto('/');
  const canvas = page.locator('canvas#gl');
  await expect(canvas).toHaveCount(1);
  // boot is deliberately lazy: load event + idle callback + dynamic import + first frame
  await expect(canvas).toHaveAttribute('data-world', 'on', { timeout: 15_000 });

  // world mode re-stages the acts: fixed beats that fade in place (styles.css
  // data-world staging) — the hero must be staged on at the top of the flight
  const hero = page.locator('#beat-hero');
  await expect(hero).toHaveCSS('position', 'fixed');
  await expect(hero).toHaveClass(/\bon\b/);

  // scroll through the whole flight, letting the 0.07 lerp settle at each stop
  for (const stop of [0, 0.25, 0.5, 0.72, 0.8, 0.97, 1]) {
    await page.evaluate((s) => scrollTo(0, s * (document.body.scrollHeight - innerHeight)), stop);
    await page.waitForTimeout(600);
  }

  // the end beat keys on crossing depth: "Walk in." must be staged on at arrival
  await expect(page.locator('#walk-in')).toHaveClass(/\bon\b/);

  expect(errors).toEqual([]);
});

test('reduced motion: poster edition only — no world boot, zero three.js bytes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion', 'runs only in the reduced-motion project');

  const worldRequests: string[] = [];
  await page.route('**/*', (route) => {
    const file = route.request().url().split('/').pop() ?? '';
    if (/^(three|scene|flight|governor|beats)-/.test(file)) worldRequests.push(route.request().url());
    return route.continue();
  });

  await page.goto('/');
  await page.waitForTimeout(3000); // give any (buggy) idle boot every chance to fire

  await expect(page.locator('canvas[data-world="on"]')).toHaveCount(0);
  expect(worldRequests).toEqual([]);
});
