// tests/unit/worker.test.ts — the redirect contract (spec §6), table-driven.
import { describe, expect, test } from 'vitest';
import { routeFor } from '../../src/worker';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const ids = { ios: '6742000000', android: 'sa.fulus.app' };
const APPLE = 'https://apps.apple.com/app/id6742000000';
const PLAY = 'https://play.google.com/store/apps/details?id=sa.fulus.app';
const WALK_IN = '/#walk-in';

describe('doors pre - every /app path walks back to the page', () => {
  test.each([
    ['/app', IOS],
    ['/app', ANDROID],
    ['/app', WINDOWS],
    ['/app/ios', IOS],
    ['/app/android', ANDROID],
    ['/app/qr', WINDOWS],
  ])('%s', (path, ua) => {
    expect(routeFor(path, ua, 'pre', ids)).toEqual({ status: 302, location: WALK_IN });
  });
});

describe('doors open', () => {
  test.each([
    ['/app/ios', WINDOWS, APPLE],
    ['/app/android', WINDOWS, PLAY],
    ['/app', IOS, APPLE],
    ['/app', MAC, APPLE], // Macintosh counts as the Apple side of the fence
    ['/app', ANDROID, PLAY],
    ['/app', WINDOWS, WALK_IN], // unknown platform: back to the page, never a 404
    ['/app/qr', WINDOWS, WALK_IN], // unknown /app subpath: never a 404
  ])('%s -> %s', (path, ua, location) => {
    expect(routeFor(path, ua, 'open', ids)).toEqual({ status: 302, location });
  });
});

describe('non-app paths are not routed (served by ASSETS)', () => {
  test.each([['/'], ['/privacy.html'], ['/apple-touch-icon.png'], ['/application']])(
    '%s -> null',
    (path) => {
      expect(routeFor(path, WINDOWS, 'open', ids)).toBeNull();
    },
  );
});
