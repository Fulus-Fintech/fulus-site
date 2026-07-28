// tests/e2e/redirects.spec.ts — the redirect contract against the REAL worker.
//
// Targets `wrangler dev` on port 8787 (NOT the vite preview server on 4173 —
// routing lives in src/worker.ts, which preview does not run). Opt-in via
// DOORS_MODE; every test auto-skips otherwise, so plain `npx playwright test`
// (and CI, until a wrangler step is added) stays green.
//
// Pass A — doors pre (wrangler.jsonc default vars):
//   npm run build
//   npx wrangler dev --port 8787            # wait for: Ready on http://127.0.0.1:8787
//   # second terminal (PowerShell):
//   $env:DOORS_MODE = 'pre'; npx playwright test tests/e2e/redirects.spec.ts --project=chromium
//
// Pass B — doors open (one var flip + test ids):
//   npx wrangler dev --port 8787 --var DOORS:open --var APP_STORE_ID:6742000000 --var PLAY_PACKAGE_ID:sa.fulus.app
//   $env:DOORS_MODE = 'open'; npx playwright test tests/e2e/redirects.spec.ts --project=chromium
import { expect, test } from '@playwright/test';

const WORKER = 'http://127.0.0.1:8787';
const MODE = process.env.DOORS_MODE ?? '';

const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};
const APPLE = 'https://apps.apple.com/app/id6742000000';
const PLAY = 'https://play.google.com/store/apps/details?id=sa.fulus.app';

test.describe('doors pre', () => {
  test.skip(MODE !== 'pre', 'start wrangler dev with wrangler.jsonc defaults and set DOORS_MODE=pre');
  for (const path of ['/app', '/app/ios', '/app/android', '/app/qr']) {
    test(`${path} -> 302 /#walk-in, no-store`, async ({ request }) => {
      const res = await request.get(WORKER + path, {
        maxRedirects: 0,
        headers: { 'user-agent': UA.ios },
      });
      expect(res.status()).toBe(302);
      expect(res.headers()['location']).toBe('/#walk-in');
      expect(res.headers()['cache-control']).toBe('no-store');
    });
  }
  test('served HTML is stamped data-doors="pre"', async ({ request }) => {
    const res = await request.get(WORKER + '/');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('data-doors="pre"');
  });
});

test.describe('doors open', () => {
  test.skip(
    MODE !== 'open',
    'start wrangler dev with --var DOORS:open --var APP_STORE_ID:6742000000 --var PLAY_PACKAGE_ID:sa.fulus.app and set DOORS_MODE=open',
  );
  const cases: [string, string, string][] = [
    ['/app/ios', UA.windows, APPLE],
    ['/app/android', UA.windows, PLAY],
    ['/app', UA.ios, APPLE],
    ['/app', UA.mac, APPLE],
    ['/app', UA.android, PLAY],
    ['/app', UA.windows, '/#walk-in'],
    ['/app/qr', UA.windows, '/#walk-in'],
  ];
  for (const [path, ua, location] of cases) {
    test(`${path} [${ua.slice(13, 30)}] -> ${location}`, async ({ request }) => {
      const res = await request.get(WORKER + path, {
        maxRedirects: 0,
        headers: { 'user-agent': ua },
      });
      expect(res.status()).toBe(302);
      expect(res.headers()['location']).toBe(location);
      expect(res.headers()['cache-control']).toBe('no-store');
    });
  }
  test('served HTML is stamped data-doors="open" (rewriter overrides the static pre default)', async ({ request }) => {
    const res = await request.get(WORKER + '/');
    expect(await res.text()).toContain('data-doors="open"');
  });
});

test.describe('POST /e - first-party event sink', () => {
  test.skip(MODE === '', 'requires a running wrangler dev (set DOORS_MODE=pre or open)');
  for (const event of ['pv', 'tap:ios', 'tap:android']) {
    test(`allowlisted "${event}" -> 204 empty`, async ({ request }) => {
      const res = await request.post(`${WORKER}/e`, { data: event });
      expect(res.status()).toBe(204);
      expect(await res.text()).toBe('');
    });
  }
  test('unknown event -> 204 (silently dropped, never an error)', async ({ request }) => {
    const res = await request.post(`${WORKER}/e`, { data: 'definitely-not-allowlisted' });
    expect(res.status()).toBe(204);
  });
});
