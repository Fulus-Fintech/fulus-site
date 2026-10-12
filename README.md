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

CI (`.github/workflows/checks.yml`, node 22) runs all of the above on every
push/PR. Visual-regression baselines live in
`tests/e2e/visual.spec.ts-snapshots/` — the update workflow is documented at
the top of `tests/e2e/visual.spec.ts`.

## Deploy

Merging a PR into `main` is the deploy. Cloudflare Workers Builds then runs
`npm clean-install` and `npx wrangler deploy`, which builds first
(`wrangler.jsonc` `build.command`) and uploads `dist/`
(`assets.directory: "./dist"`); the live site changes about a minute after
the merge. A push to any other branch only uploads a preview version, served
at a public workers.dev preview address; the live site does not change, but
previews share production's bindings, so a visit to a preview is counted in
`fulus_site_events` like live traffic.

- **`main` is protected.** A PR merges only once the `gates` check
  (`.github/workflows/checks.yml`) has passed on it, admins included.
- **Never deploy by hand.** `npx wrangler deploy`, or a deploy from the
  Cloudflare dashboard, ships whatever it is given and skips `gates`. Worker
  vars live only in `wrangler.jsonc`: a var set in the dashboard is wiped by
  the next merge.
- **To undo a bad deploy**, roll back in Cloudflare (Workers & Pages →
  fulus-site → Deployments) to the version that was live before it: a past
  deployment built from `main`. This is the one dashboard deploy that is
  allowed. Don't pick by position in the version list: Workers Builds adds a
  version for every branch push, so the entry just below the live one is
  usually the PR's own preview of the same code, and others are unmerged
  branches, some of which failed `gates`. (`npx wrangler rollback`, with no
  version id, picks the previous deployment for you, after `npx wrangler
  login`.) Then fix forward with a PR, and merge it before anything else:
  any merge into `main` redeploys `main`'s head, the bad commit included.
- **A failed deploy opens an issue.** `.github/workflows/deploy-alert.yml`
  opens one, labelled `site-deploy-failed` and assigned to the founder, when
  Cloudflare's build of `main` fails or reports nothing within 20 minutes of a
  merge, and closes it once Cloudflare deploys `main`.

Local Worker preview: `npm run build && npx wrangler dev`.

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
4. After it merges, copy the updated file(s) here in a PR; merging it deploys
   them.

## www redirect

`www.fulus.sa` → `fulus.sa` is configured at the Cloudflare dashboard level
(Bulk Redirects / zone rule that 301s `www.fulus.sa/*` to
`https://fulus.sa/$1`), not in a `_redirects` file — Cloudflare's validator
(code 10021) rejects host-based redirects there.

## Launch & backlog

Pre-launch gates: [`docs/launch-checklist.md`](docs/launch-checklist.md).
Deferred items: [`BACKLOG.md`](BACKLOG.md).
