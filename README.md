# fulus-site

Public web presence for Fulus (https://fulus.sa) — **The Night Crossing**
(v3, rebuilt 2026-07-28). One unbroken WebGL journey through a deep-ocean
night: scroll flies the camera past the ribbon of light, through the glowing
portal, and inside, where the store badges wait. Binding spec:
`docs/superpowers/specs/2026-07-28-night-crossing-design.md`; normative
visual reference: `docs/superpowers/prototypes/night-crossing/prototype.html`
(where words and prototype disagree about look, the prototype wins).

The site's one action is **download** (App Store / Google Play via the
`/app/*` edge redirects; `DOORS` var flips pre → open at launch).
`index.html` is a complete semantic page under the canvas — every word real
DOM, badges real links, fully usable with JS off. No-WebGL / reduced-motion
/ save-data visitors get the **poster edition** (captured approach frame +
the same copy), a complete page, not a fallback apology. English only
(`privacy.html` keeps its bilingual legal text).

## Stack

Vite + vanilla TypeScript + Three.js 0.160 (pinned): UnrealBloom, Reflector
floor, ACES tone mapping. `src/world/` (scene, portal, ribbon, flight,
governor) renders the night; `src/ui/beats.ts` maps scroll progress to the
copy beats; `src/main.ts` boots poster-first and dynamic-imports the world;
`src/worker.ts` is the Cloudflare Worker (asset serving with `data-doors`
stamping, `/app/*` store redirects, two-event cookieless analytics via
`POST /e`). Budgets (CI-enforced, bump-deliberately): critical JS+CSS+HTML
≤ 350 KB gz, poster edition ≤ 700 KB. Readex Pro (Latin subset),
self-hosted. Visual QA harness: `tools/qa_shots.mjs`; poster/OG generation:
`tools/make_poster.mjs`.

## Develop / build / test

    npm ci                                   # install
    npm run dev                              # dev server (http://localhost:5173)
    npm run build                            # -> dist/
    npm run preview                          # serve dist/ (http://localhost:4173)
    npx vitest run                           # unit tests (vitest + jsdom)
    npx playwright install chromium          # once
    npx playwright test                      # e2e vs the built site
    node tools/check_bundle_budget.mjs           # 350 KB gz critical gate
    node tools/check_bundle_budget.mjs --poster  # 700 KB poster-edition gate
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
