# fulus-site

Public web presence for Fulus (https://fulus.sa) — the "WHO'S IN?" scroll-film
landing page (rebuilt 2026-07). Spec (source of truth for copy, scenes,
mechanics, budgets): `docs/superpowers/specs/2026-07-11-whos-in-spectacle-rebuild-design.md`.

A scroll-scrubbed film in seven pinned scenes introduces group investing and
funnels into the waitlist. `index.html` is a complete semantic document —
every scene's copy and end-state is real DOM; the film is an enhancement
layer. English only (founder decision; `privacy.html` keeps its bilingual
legal text).

## Stack

Vite + vanilla TypeScript. GSAP core + ScrollTrigger + Flip + MotionPathPlugin
(npm). Two render layers: an OGL (WebGL2) **light engine** on `#light-canvas`
(a dynamic `light-engine-*.js` chunk — ocean fog, the thread as a glowing
ribbon, emissive bodies, floor reflections, seeded dust; sheds tiers with the
governor, absent under reduced-motion / no-WebGL2 / `?fulus-light=off`), and
the in-house seeded canvas-2D particle engine on `#film-canvas` (typing dots,
glyph-ash, the submit firework, the lantern). No framework, no Three.js.
Readex Pro variable (Latin subset) + `riyal.woff2` (U+20C1 only).

## Layout

- `index.html` — the semantic document; sections `#hero #math #pot #vote
  #shares #payday #door` + `#site-footer`, `<canvas id="film-canvas">`.
- `privacy.html` + `privacy.css` — standalone bilingual privacy page.
- `src/main.ts` — boot: styles, GSAP plugin registration, `?ref=` capture,
  reduced-motion gate. `src/film.ts` — scene registry + shared FilmContext +
  `normalizeScroll` (disabled while the Door's email field is focused).
- `src/engine/` — the OGL light engine: `store.ts` (scroll/anchor/route/tier
  state), `passes/` (atmosphere, ribbon, emissive, dust), `light-engine.ts`
  (dynamic entry; `?fulus-light=off` disables it, `?fulus-freeze=1` freezes
  sim time for deterministic captures — see `tools/capture_frames.mjs` and
  `tools/measure_scrub.mjs`).
- `src/scenes/` — one module per scene, `init<Name>(ctx)` each.
- `src/systems/` — particles, hold grammar, reversible/seekTo, sound,
  governor, thread, lantern, portal states.
- `src/phone/` — the three demo app screens, rendered from `src/demo-data.ts`
  (`DEMO_DATA` + `largestRemainder()` drive every number in the film).
- `src/waitlist/` — join/status/profile API, invisible Turnstile, confirmation,
  founding-card generator. localStorage keys `fulus.waitlist` / `fulus.ref`.
- `styles/` — tokens (canvas `#020B18`, cyan `#00E5FF`, teal `#00FFB2`,
  crimson `#EE4540`), base, per-scene sheets.
- `assets/` — fonts, silhouettes, favicons. Beta screenshots are design
  reference only.
- `.well-known/` — deep-link verification artifacts (law below).

## Develop / build / test

    npm ci                                   # install
    npm run dev                              # dev server (http://localhost:5173)
    npm run build                            # -> dist/
    npm run preview                          # serve dist/ (http://localhost:4173)
    npx vitest run                           # unit tests (vitest + jsdom)
    npx playwright install chromium          # once
    npx playwright test                      # e2e vs the built site
    node tools/check_bundle_budget.mjs       # 300 KB gz critical-payload gate
    node tools/check_links.mjs --root dist   # link/asset existence on dist
    node tools/check_wellknown.mjs           # deep-link artifact integrity
    npx html-validate dist/index.html dist/privacy.html

CI (`.github/workflows/checks.yml`, node 20) runs all of the above on every
push/PR. Visual-regression baselines live in
`tests/e2e/visual.spec.ts-snapshots/` — the update workflow is documented at
the top of `tests/e2e/visual.spec.ts`.

## Deploy

Cloudflare Workers Builds runs `npm ci && npm run build` and deploys `dist/`
(`wrangler.jsonc` `assets.directory: "./dist"`). Pushing to `main` is the
trigger; expect ~1–2 min with the build in the path. Local Worker preview:
`npm run build && npx wrangler dev`.

## Waitlist API

The Door posts to the `join-waitlist` Supabase edge function
(`https://zainebbvseprgngrrovk.supabase.co/functions/v1/join-waitlist`, POST
JSON, actions `join` / `status` / `profile`). Contract source of truth: the
Flutter repo's waitlist backend plan. The Cloudflare Turnstile production site
key is the constant in `src/waitlist/form.ts`; the widget must be
invisible-type, its hostname allowlist must include `fulus.sa`, and its secret
must be the edge function's `TURNSTILE_SECRET_KEY` (see BACKLOG + launch
checklist).

## Fonts & licensing

Readex Pro (SIL OFL), self-hosted, Latin subset only — no Google Fonts
requests. `riyal.woff2` carries only U+20C1, `unicode-range`-scoped.

## Editing the verification artifacts

**Don't edit the `.well-known/` files in this repo directly.** They are
committed reference copies of the source files in the Flutter repo at
`audit/runbooks/h-2-7-fulus-site-files/`. The Flutter repo's sentinel test
(`test/prod_readiness/h_2_7_link_assets_smoke_test.dart`) keeps the AASA
whitelist in sync with the app's route table. To update:

1. Edit the source in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`.
2. Run the sentinel locally to confirm consistency.
3. Open a PR there.
4. After it merges, copy the updated file(s) here and push.

## www redirect

`www.fulus.sa` → `fulus.sa` is configured at the Cloudflare dashboard level
(Bulk Redirects / zone rule that 301s `www.fulus.sa/*` to
`https://fulus.sa/$1`), not in a `_redirects` file — Cloudflare's validator
(code 10021) rejects host-based redirects there.

## Launch & backlog

Pre-launch gates: [`docs/launch-checklist.md`](docs/launch-checklist.md).
Deferred items: [`BACKLOG.md`](BACKLOG.md).
