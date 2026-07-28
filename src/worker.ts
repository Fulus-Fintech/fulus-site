// src/worker.ts — Cloudflare Worker in front of the static site (ASSETS binding).
// Three jobs (spec §6):
//   1. Store handoff: /app, /app/ios, /app/android -> 302, never a 404.
//      Doors pre-live: every /app path walks back to /#walk-in.
//   2. Doors state: stamp data-doors="pre|open" on served HTML (one var flip).
//   3. /e: two-event first-party, cookieless analytics (pv, badge taps).

// Minimal ambient Cloudflare types, declared locally so the DOM lib in
// tsconfig keeps providing Request/Response without type-package conflicts.
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
interface AnalyticsEngineDataset {
  writeDataPoint(point: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}
declare class HTMLRewriter {
  on(
    selector: string,
    handlers: { element(el: { setAttribute(name: string, value: string): void }): void },
  ): HTMLRewriter;
  transform(response: Response): Response;
}

export interface Env {
  ASSETS: Fetcher;
  DOORS: 'pre' | 'open';
  APP_STORE_ID: string;
  PLAY_PACKAGE_ID: string;
  EVENTS?: AnalyticsEngineDataset;
}

export function routeFor(
  path: string,
  ua: string,
  doors: 'pre' | 'open',
  ids: { ios: string; android: string },
): { status: 301 | 302; location: string } | null {
  // Only /app and /app/* — /apple-touch-icon.png etc. belong to ASSETS.
  if (path !== '/app' && !path.startsWith('/app/')) return null;
  const walkIn = { status: 302 as const, location: '/#walk-in' };
  if (doors === 'pre') return walkIn;
  const ios = { status: 302 as const, location: 'https://apps.apple.com/app/id' + ids.ios };
  const android = {
    status: 302 as const,
    location: 'https://play.google.com/store/apps/details?id=' + ids.android,
  };
  if (path === '/app/ios') return ios;
  if (path === '/app/android') return android;
  if (path === '/app') {
    // Platform-detect short link (QR target).
    if (/iPhone|iPad|Macintosh/.test(ua)) return ios;
    if (/Android/.test(ua)) return android;
    return walkIn;
  }
  return walkIn; // unknown /app/* — never a 404 (spec §6)
}

const EVENTS_ALLOWED = new Set(['pv', 'tap:ios', 'tap:android']);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/e' && request.method === 'POST') {
      const event = (await request.text()).slice(0, 32);
      if (EVENTS_ALLOWED.has(event) && env.EVENTS) {
        env.EVENTS.writeDataPoint({ blobs: [event], doubles: [1], indexes: [event] });
      }
      return new Response(null, { status: 204 }); // always 204 — never an error surface
    }

    const route = routeFor(
      url.pathname,
      request.headers.get('user-agent') ?? '',
      env.DOORS,
      { ios: env.APP_STORE_ID, android: env.PLAY_PACKAGE_ID },
    );
    if (route) {
      return new Response(null, {
        status: route.status,
        headers: { location: route.location, 'cache-control': 'no-store' },
      });
    }

    const response = await env.ASSETS.fetch(request);
    if ((response.headers.get('content-type') ?? '').includes('text/html')) {
      return new HTMLRewriter()
        .on('html', { element: (el) => el.setAttribute('data-doors', env.DOORS) })
        .transform(response);
    }
    return response;
  },
};
