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

export type Doors = 'pre' | 'open';

export interface Env {
  ASSETS: Fetcher;
  // Typed as a plain string on purpose: this arrives from wrangler.jsonc or the
  // dashboard, so the compile-time union was a promise the runtime never kept.
  // Read it through normalizeDoors(), never directly.
  DOORS: string;
  APP_STORE_ID: string;
  PLAY_PACKAGE_ID: string;
  EVENTS?: AnalyticsEngineDataset;
}

// The launch gate fails CLOSED: only the exact string 'open' opens the doors.
// A typo ("Open", "opne", a stray space) keeps the doors shut instead of
// shipping the store handoff early, and never reaches the DOM verbatim.
export function normalizeDoors(value: unknown): Doors {
  return value === 'open' ? 'open' : 'pre';
}

export function routeFor(
  path: string,
  ua: string,
  doors: Doors,
  ids: { ios: string; android: string },
): { status: 301 | 302; location: string } | null {
  // Only /app and /app/* — /apple-touch-icon.png etc. belong to ASSETS.
  if (path !== '/app' && !path.startsWith('/app/')) return null;
  const walkIn = { status: 302 as const, location: '/#walk-in' };
  if (doors === 'pre') return walkIn;
  // A store opens only when we hold an id for it. The two platforms land on
  // different days — iOS was live before the site, Android follows — and an
  // empty id would otherwise build ".../id" or "...?id=", handing a visitor a
  // dead store page. An unopened store returns them to the door instead: the
  // id IS the readiness signal, so switching a platform on is one var, no
  // deploy of code. (Spec §6: the redirect must never 404.)
  const ios = ids.ios
    ? { status: 302 as const, location: 'https://apps.apple.com/app/id' + ids.ios }
    : walkIn;
  const android = ids.android
    ? {
        status: 302 as const,
        location: 'https://play.google.com/store/apps/details?id=' + ids.android,
      }
    : walkIn;
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

// The /e body is an event name, never more. Anything longer is not ours.
const MAX_EVENT_BYTES = 32;

// True when this request may be answered with the document we stamp. Browsers
// label navigations (sec-fetch-dest / Accept); everything else is decided by
// the only two HTML files this site builds — "/" (and any directory index) and
// "*.html". Deliberately narrow: extensionless assets such as
// /.well-known/apple-app-site-association keep their normal revalidation.
export function isDocumentRequest(request: Request): boolean {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  if (request.headers.get('sec-fetch-dest') === 'document') return true;
  if ((request.headers.get('accept') ?? '').includes('text/html')) return true;
  const path = new URL(request.url).pathname;
  return path.endsWith('/') || path.endsWith('.html');
}

// The stamped document must never be served from a validator. ASSETS passes the
// asset's ETag/Last-Modified straight through, and that ETag is byte-identical
// under DOORS=pre and DOORS=open — so a returning browser would revalidate, get
// a bodyless 304, and reuse its cached data-doors="pre" body forever.
// HTMLRewriter cannot stamp a 304, so we drop the conditional headers on the way
// in and the validators on the way out.
function withoutValidators(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.delete('if-none-match');
  headers.delete('if-modified-since');
  return new Request(request, { headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const doors = normalizeDoors(env.DOORS);

    if (url.pathname === '/e' && request.method === 'POST') {
      // Bounded before it is buffered: an event name declares its length, and
      // navigator.sendBeacon (the only sender, src/main.ts) always sets it.
      // No length, or more than an event name — dropped unread.
      const declared = request.headers.get('content-length');
      const size = declared === null ? Number.NaN : Number(declared);
      if (Number.isFinite(size) && size <= MAX_EVENT_BYTES) {
        const event = (await request.text()).slice(0, MAX_EVENT_BYTES);
        if (EVENTS_ALLOWED.has(event) && env.EVENTS) {
          env.EVENTS.writeDataPoint({ blobs: [event], doubles: [1], indexes: [event] });
        }
      }
      return new Response(null, { status: 204 }); // always 204 — never an error surface
    }

    const route = routeFor(
      url.pathname,
      request.headers.get('user-agent') ?? '',
      doors,
      { ios: env.APP_STORE_ID, android: env.PLAY_PACKAGE_ID },
    );
    if (route) {
      return new Response(null, {
        status: route.status,
        headers: { location: route.location, 'cache-control': 'no-store' },
      });
    }

    const response = await env.ASSETS.fetch(
      isDocumentRequest(request) ? withoutValidators(request) : request,
    );
    const isHtml = (response.headers.get('content-type') ?? '').includes('text/html');
    // A 304 has no body to stamp — pass it through untouched (static assets
    // keep their validators, so this is the only shape that reaches here).
    if (!isHtml || response.status === 304) return response;

    // Rebuild first: ASSETS response headers are immutable, and the stamped
    // document ships uncacheable so the flip reaches every returning visitor.
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'no-store');
    headers.delete('etag');
    headers.delete('last-modified');
    const stampable = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    return new HTMLRewriter()
      .on('html', { element: (el) => el.setAttribute('data-doors', doors) })
      .transform(stampable);
  },
};
