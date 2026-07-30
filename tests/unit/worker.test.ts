// tests/unit/worker.test.ts — the redirect contract (spec §6), table-driven,
// plus the fetch handler itself against a fake Env (the e2e pass in
// tests/e2e/redirects.spec.ts auto-skips without a running wrangler, so CI
// would otherwise never assert the 302s, the stamp, or the /e allowlist).
import { describe, expect, test, vi } from 'vitest';
import worker, { isDocumentRequest, normalizeDoors, routeFor, type Env } from '../../src/worker';

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

describe('normalizeDoors - the launch gate fails closed', () => {
  test('only the exact string "open" opens the doors', () => {
    expect(normalizeDoors('open')).toBe('open');
  });
  test.each([['pre'], ['Open'], ['OPEN'], [' open'], ['open '], ['opne'], ['true'], ['']])(
    '%j -> pre',
    (value) => {
      expect(normalizeDoors(value)).toBe('pre');
    },
  );
  test.each([[undefined], [null], [1], [true]])('non-string %j -> pre', (value) => {
    expect(normalizeDoors(value)).toBe('pre');
  });
});

// ---------------------------------------------------------------------------
// The fetch handler, against a fake Env.
// ---------------------------------------------------------------------------

type ElementHandler = { element(el: { setAttribute(name: string, value: string): void }): void };

// Stand-in for the runtime HTMLRewriter: applies the attributes the handler
// sets to the <html> tag of the response body, so the stamp is observable.
class FakeHTMLRewriter {
  private readonly handlers: [string, ElementHandler][] = [];
  on(selector: string, handler: ElementHandler): this {
    this.handlers.push([selector, handler]);
    return this;
  }
  transform(response: Response): Response {
    const attrs = new Map<string, string>();
    for (const [selector, handler] of this.handlers) {
      if (selector !== 'html') continue;
      handler.element({ setAttribute: (name, value) => void attrs.set(name, value) });
    }
    const rewritten = response.text().then((html) =>
      html.replace(/<html([^>]*)>/i, (_match: string, existing: string) => {
        let attrText = existing;
        for (const [name, value] of attrs) {
          attrText = attrText.replace(new RegExp(`\\s${name}="[^"]*"`, 'i'), '');
          attrText += ` ${name}="${value}"`;
        }
        return `<html${attrText}>`;
      }),
    );
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(new TextEncoder().encode(await rewritten));
        controller.close();
      },
    });
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}
vi.stubGlobal('HTMLRewriter', FakeHTMLRewriter);

const PAGE = '<!doctype html>\n<html lang="en" data-doors="pre">\n<body>the crossing</body>\n</html>\n';
const ASSET_ETAG = '"6f1e-static"';

function htmlAsset(): Response {
  return new Response(PAGE, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      etag: ASSET_ETAG,
      'last-modified': 'Tue, 28 Jul 2026 21:00:00 GMT',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}

type Datapoint = { blobs?: string[]; doubles?: number[]; indexes?: string[] };

function makeEnv(options: { doors?: unknown; asset?: () => Response } = {}): {
  env: Env;
  assetRequests: Request[];
  datapoints: Datapoint[];
} {
  const assetRequests: Request[] = [];
  const datapoints: Datapoint[] = [];
  const env: Env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assetRequests.push(request);
        return (options.asset ?? htmlAsset)();
      },
    },
    DOORS: (options.doors ?? 'pre') as string,
    APP_STORE_ID: ids.ios,
    PLAY_PACKAGE_ID: ids.android,
    EVENTS: {
      writeDataPoint: (point: Datapoint) => void datapoints.push(point),
    },
  };
  return { env, assetRequests, datapoints };
}

const get = (path: string, init?: RequestInit): Request =>
  new Request('https://fulus.sa' + path, init);

describe('fetch - store handoff, doors pre', () => {
  test.each([['/app'], ['/app/ios'], ['/app/android'], ['/app/qr']])(
    '%s -> 302 /#walk-in, no-store',
    async (path) => {
      const { env } = makeEnv({ doors: 'pre' });
      const res = await worker.fetch(get(path, { headers: { 'user-agent': IOS } }), env);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(WALK_IN);
      expect(res.headers.get('cache-control')).toBe('no-store');
    },
  );
});

describe('fetch - store handoff, doors open', () => {
  test.each([
    ['/app/ios', APPLE],
    ['/app/android', PLAY],
  ])('%s -> %s', async (path, location) => {
    const { env } = makeEnv({ doors: 'open' });
    const res = await worker.fetch(get(path, { headers: { 'user-agent': WINDOWS } }), env);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(location);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  test('store URLs are built from the configured ids', async () => {
    const { env } = makeEnv({ doors: 'open' });
    env.APP_STORE_ID = '1234567890';
    env.PLAY_PACKAGE_ID = 'sa.example.app';
    const ios = await worker.fetch(get('/app/ios'), env);
    const android = await worker.fetch(get('/app/android'), env);
    expect(ios.headers.get('location')).toBe('https://apps.apple.com/app/id1234567890');
    expect(android.headers.get('location')).toBe(
      'https://play.google.com/store/apps/details?id=sa.example.app',
    );
  });
});

describe('fetch - the doors stamp', () => {
  test('pre stamps data-doors="pre"', async () => {
    const { env } = makeEnv({ doors: 'pre' });
    const res = await worker.fetch(get('/'), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-doors="pre"');
  });

  test('open stamps data-doors="open" over the static default', async () => {
    const { env } = makeEnv({ doors: 'open' });
    const html = await (await worker.fetch(get('/'), env)).text();
    expect(html).toContain('data-doors="open"');
    expect(html).not.toContain('data-doors="pre"');
  });

  test.each([['Open'], ['OPEN'], ['open '], ['opne'], ['']])(
    'DOORS=%j stamps pre and keeps every /app path home',
    async (doors) => {
      const { env } = makeEnv({ doors });
      const html = await (await worker.fetch(get('/'), env)).text();
      expect(html).toContain('data-doors="pre"');
      const res = await worker.fetch(get('/app/ios', { headers: { 'user-agent': IOS } }), env);
      expect(res.headers.get('location')).toBe(WALK_IN);
    },
  );

  test('non-HTML assets are returned untouched', async () => {
    const { env } = makeEnv({
      asset: () =>
        new Response('body{}', {
          status: 200,
          headers: { 'content-type': 'text/css', etag: ASSET_ETAG, 'cache-control': 'public, max-age=31536000, immutable' },
        }),
    });
    const res = await worker.fetch(get('/assets/index-abc123.css'), env);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('etag')).toBe(ASSET_ETAG);
    expect(await res.text()).toBe('body{}');
  });
});

describe('fetch - the flip reaches returning visitors', () => {
  test('conditional headers are stripped before ASSETS sees a document request', async () => {
    const { env, assetRequests } = makeEnv({ doors: 'open' });
    const res = await worker.fetch(
      get('/', {
        headers: {
          'if-none-match': ASSET_ETAG,
          'if-modified-since': 'Tue, 28 Jul 2026 21:00:00 GMT',
          accept: 'text/html,application/xhtml+xml',
        },
      }),
      env,
    );
    expect(assetRequests).toHaveLength(1);
    expect(assetRequests[0]?.headers.get('if-none-match')).toBeNull();
    expect(assetRequests[0]?.headers.get('if-modified-since')).toBeNull();
    // ...so the returning visitor gets a body, and it carries the new state.
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('data-doors="open"');
  });

  test.each([['/'], ['/privacy.html'], ['/anything']])(
    'a navigation to %s is treated as a document request',
    (path) => {
      expect(
        isDocumentRequest(get(path, { headers: { 'sec-fetch-dest': 'document' } })),
      ).toBe(true);
    },
  );

  test('the stamped document is uncacheable and carries no validator', async () => {
    const { env } = makeEnv({ doors: 'open' });
    const res = await worker.fetch(get('/'), env);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('etag')).toBeNull();
    expect(res.headers.get('last-modified')).toBeNull();
  });

  test('static assets keep their conditional request and their 304', async () => {
    const { env, assetRequests } = makeEnv({
      asset: () =>
        new Response(null, {
          status: 304,
          headers: { etag: ASSET_ETAG, 'cache-control': 'public, max-age=31536000, immutable' },
        }),
    });
    const res = await worker.fetch(
      get('/assets/index-abc123.js', {
        headers: { 'if-none-match': ASSET_ETAG, accept: '*/*' },
      }),
      env,
    );
    expect(assetRequests[0]?.headers.get('if-none-match')).toBe(ASSET_ETAG);
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(ASSET_ETAG);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  test('extensionless static files (.well-known) keep their validators too', () => {
    expect(
      isDocumentRequest(
        get('/.well-known/apple-app-site-association', { headers: { accept: '*/*' } }),
      ),
    ).toBe(false);
  });
});

describe('POST /e - the allowlist, actually asserted', () => {
  const post = (body: string, headers: Record<string, string> = {}): Request =>
    get('/e', {
      method: 'POST',
      body,
      headers: { 'content-length': String(new TextEncoder().encode(body).length), ...headers },
    });

  test.each([['pv'], ['tap:ios'], ['tap:android']])(
    'allowlisted %j writes exactly one datapoint',
    async (event) => {
      const { env, datapoints } = makeEnv();
      const res = await worker.fetch(post(event), env);
      expect(res.status).toBe(204);
      expect(datapoints).toEqual([{ blobs: [event], doubles: [1], indexes: [event] }]);
    },
  );

  test.each([['tap:web'], ['pageview'], ['PV'], [''], ['pv '], ['<script>']])(
    'unknown %j writes NO datapoint and still answers 204',
    async (event) => {
      const { env, datapoints } = makeEnv();
      const res = await worker.fetch(post(event), env);
      expect(res.status).toBe(204);
      expect(datapoints).toEqual([]);
    },
  );

  test('an oversize body is dropped unread', async () => {
    const { env, datapoints } = makeEnv();
    const request = post('pv', { 'content-length': '1048576' });
    const res = await worker.fetch(request, env);
    expect(res.status).toBe(204);
    expect(request.bodyUsed).toBe(false); // never buffered
    expect(datapoints).toEqual([]);
  });

  test('a body with no declared length is dropped unread', async () => {
    const { env, datapoints } = makeEnv();
    const request = get('/e', { method: 'POST', body: 'pv' });
    request.headers.delete('content-length');
    const res = await worker.fetch(request, env);
    expect(res.status).toBe(204);
    expect(request.bodyUsed).toBe(false);
    expect(datapoints).toEqual([]);
  });

  test('GET /e is not the event sink - it falls through to ASSETS', async () => {
    const { env, assetRequests, datapoints } = makeEnv();
    await worker.fetch(get('/e'), env);
    expect(assetRequests).toHaveLength(1);
    expect(datapoints).toEqual([]);
  });

  test('a missing EVENTS binding is not an error surface', async () => {
    const { env } = makeEnv();
    delete env.EVENTS;
    expect((await worker.fetch(post('pv'), env)).status).toBe(204);
  });
});
