# Backlog

Refreshed 2026-07-28 for the Night Crossing rebuild (v3)
(spec: `docs/superpowers/specs/2026-07-28-night-crossing-design.md`).
The ops + device launch gates live in `docs/launch-checklist.md`.

## 0. Deferred by the v3 Night Crossing rebuild

Each item ships only through its own founder gate; the site is complete
without all of them (spec §5).

- [ ] **Sound** (spec §5.4) — opt-in deep-water room tone + crossing swell.
  Off by default, never autoplay. Founder taste gate.
- [ ] **Interactive moments** (spec §5.3) — product-truth moments (the pot
  lighting, the vote) staged as objects in the night, light responding to
  touch — never UI cards floating in space. One founder gate per moment.
- [ ] **Film slot** (spec §5.5) — a quiet `Watch the film` waypoint in Act I
  opening the launch film as an overlay, only once the film clears its own
  gates. The site never waits on the film.
- [ ] **Terms page** — content pending from founder/legal (spec §10.4).
  Until it exists the footer carries NO Terms link (flagged at Gate G1); add
  the link and the page together when content arrives.
- [ ] **OG type compositing** — `og.jpg` ships as the plain approach frame;
  compositing "It's open." onto it waits on the founder's display-face
  decision (FK Grotesk licence vs Readex Pro, spec §10.3). The generation
  recipe lives in `tools/make_poster.mjs`.
- [ ] **Flight scrub telemetry** (spec §7) — `tools/measure_scrub.mjs` (v2)
  is not restored and its CI step is dropped; retargeting it to the v3
  flight is a DELIBERATE deferral, not a silent drop. Until then, flight
  frame-time feel is judged on real GPUs at the device gate
  (`docs/launch-checklist.md` §4), never SwiftShader.

> Everything below this line predates the v3 rebuild. The §1 waitlist ops
> gates are retired (the waitlist itself is retired, spec §9 — do not
> resurrect). Still-true items — the www redirect check, the FK Grotesk
> licence call, RUM monitoring — carry forward.

## 1. Launch gates (spec §10 ops gates — all pre-launch)

- [ ] **Turnstile hostname allowlist includes `fulus.sa`.** The production
  widget `0x4AAAAAADU96nEHLV4GAe2V` (constant in `src/waitlist/form.ts`) is
  shared with the Fulus app; if `fulus.sa` is missing from its Cloudflare
  allowlist every captcha on the site fails. Add `localhost` for local testing.
- [ ] **Set the real `TURNSTILE_SECRET_KEY`** on the join-waitlist edge
  function (Supabase dashboard → project `zainebbvseprgngrrovk` → Edge
  Functions → Secrets), replacing any always-pass test secret.
- [ ] **Confirm the production sitekey's widget type is invisible-compatible.**
  The Door's choreography assumes NO visible Turnstile element; a "managed"
  widget that decides to render a challenge would break the scene.
- [ ] **Confirm `support@fulus.sa` exists and receives mail.** `privacy.html`,
  the Door's error copy, and the `<noscript>` mailto fallback all point at it.
  A dead mailto is a silent support-channel failure.
- [ ] **Configure Cloudflare Workers Builds:** connect this repo, build
  command `npm ci && npm run build`, deploy directory `dist/`. Push-to-main
  stays the trigger; deploy time grows ~30 s → ~1–2 min — re-verify at launch.
- [ ] **Cloudflare Web Analytics beacon** (cookieless): dashboard → Web
  Analytics → add `fulus.sa` → paste the snippet immediately before `</body>`
  in `index.html` with the dashboard token:
  `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "PASTE-DASHBOARD-TOKEN-HERE"}'></script>`
  Then re-run `node tools/check_bundle_budget.mjs --measure` (external beacon
  is not counted, but confirm the page still meets the 300 KB gz gate).
- [ ] **Run the manual device gate** in `docs/launch-checklist.md` (real
  mid-range Android + iPhone Safari).
- [ ] **Plan the first invite wave within ~1 month of signups starting.**
  Waitlist→activation roughly halves after a month idle.
- [ ] **Watch the first real CI run on `windows-latest`** (visual baselines)
  and the **first Workers Builds deploy** end-to-end — both are untested
  outside this branch's own setup.

## 2. Post-launch

- [ ] Verify the Cloudflare Bulk Redirect `www.fulus.sa/*` →
  `https://fulus.sa/$1` (301) is live.
- [ ] Cancel the Framer Mini subscription if still active.
- [ ] **FK Grotesk license → Latin display swap.** If a license is purchased:
  change the Latin-display `font-family` custom property in
  `styles/tokens.css` (one line; Readex Pro remains the fallback). Until
  then, commit no FK Grotesk binaries — the trials are unlicensed.
- [ ] App-store links at launch: footer wiring point carries TestFlight /
  Play links once C-5 closes in the Flutter repo.
- [ ] Page-speed monitoring / RUM (Cloudflare Web Vitals) for LCP/CLS/INP.
- [ ] Public signup counter — only once the number is non-embarrassing.
- [ ] A-7 (`USING(true)` RLS hardening) — lives in the Supabase repo.
- [ ] Watch the progress-thread CTA's tap-through once analytics land (spec
  §10 risk: form at the film's end).
- [ ] Referral copy promises waves, not per-friend queue movement — if the
  backend later reorders positions per referral, the copy may strengthen.

## 3. Retired by the 2026-07-11 "WHO'S IN?" rebuild (do not resurrect)

- Arabic/bilingual site + `i18n/` dictionaries + parity CI — English only by
  founder decision; `privacy.html` keeps its bilingual legal text.
  (`docs/arabic-copy-review.md` remains as the historical record.)
- Spanish/German marketing copy — the dictionary mechanism is gone; new
  locales would be a new project.
- Local `js/` byte budget (`tools/check_js_budget.mjs` + `js-budget.json`) —
  superseded by the gzipped critical-payload gate
  (`tools/check_bundle_budget.mjs`, 300 KB gz).
- Visual-regression CI — DONE: `tests/e2e/visual.spec.ts` poster frames.
- `wrangler dev` infinite reload loop — RESOLVED: `assets.directory` now
  points at `./dist`, so the dev server no longer watches its own
  `.wrangler/state` cache.
- Riyal-glyph / dollar-sign screenshot inconsistency — moot: beta screenshots
  are design reference only; every on-page number renders from `DEMO_DATA`
  DOM with the riyal glyph.
- Founder-note / trust-section copy items — sections deleted with the old page.
- The entire 2026-05 pixel-match retirement list (see git history of this
  file) — the surfaces it referenced were deleted twice over.

## 4. Cut-lines (agreed order) / Never cut (spec §10)

If the film must shrink to ship, cut in exactly this order:

1. Opt-in sound
2. Light-engine dust + floor pools off, soft glows halved (the tier-1 look
   becomes the ceiling — one constant flip; the governor already ships
   this path)
3. Desktop lantern-glow richness
4. New Math braid simplifies to plain merges
5. Per-letter hero assembly falls back to line reveals (H1 stays visible from
   first paint)

**Never cut:** reversibility, the 100.00% lock, the Door's form mechanics, the
fallback ladder.

## 5. Engineering notes

- Narrow early-hold reverse desync windows: in the pot scene, holding between
  scrub progress 0.2–0.35 then reversing, and in the vote scene, holding the
  cast gesture between ~0.56–0.72 then reversing, can produce a brief visual
  desync. Both are visual-only and self-correcting on continued scroll — fix
  only if the manual device gate (`docs/launch-checklist.md`) surfaces them.
- SwiftShader baseline caveat: CI's headless chromium renders WebGL through
  SwiftShader (software GL), which does not rasterize identically to real
  GPUs or across driver versions. That is why the 14 CI visual baselines are
  reduced-motion CSS posters (the light engine never boots on that rung) and
  the engine-on captures under `docs/superpowers/artdirection/frames/` are
  committed review artifacts, never pixel-compared in CI. Do not add an
  engine-on frame to `tests/e2e/visual.spec.ts` — it will flake across
  machines. The engine's CI coverage is the boot smoke in
  `tests/e2e/film.spec.ts` plus the frame-time telemetry
  (`node tools/measure_scrub.mjs --p95 120`).
