# Backlog

Rewritten 2026-07 as part of the Threshold × Ledger rebuild
(spec: Flutter repo `docs/superpowers/specs/2026-07-03-fulus-landing-page-redesign-design.md`).
The 2026-05 pixel-match backlog is retired below where the rebuild deleted the surface it referred to.

## 1. Launch gates (founder-driven)

- [x] **Turnstile production site key — DONE 2026-07-05.** `js/waitlist.js` `TURNSTILE_SITE_KEY`
  now holds the founder's production widget `0x4AAAAAADU96nEHLV4GAe2V` (shared with the Fulus
  app's CAPTCHA). **TWO prerequisites remain before launch:** (a) the widget's Cloudflare
  **hostname allowlist MUST include `fulus.sa`** (add `localhost` too if testing locally) — the
  app's widget may be scoped to the app domain only, and if `fulus.sa` is missing every captcha
  fails there; (b) **set the join-waitlist edge-function secret** `TURNSTILE_SECRET_KEY` to THIS
  widget's secret (Supabase dashboard → project `zainebbvseprgngrrovk` → Edge Functions → Secrets),
  replacing the always-pass test secret. (The `api.js` `/v0/` URL bug was already fixed in `2ff07f9`.)
- [x] **Native Arabic copy — founder accepted the drafts as-is (2026-07-05).** The founder reviewed
  and kept the current `i18n/ar.json` strings. `docs/arabic-copy-review.md` remains as the record
  if a fuller native pass is wanted later.
- [ ] **Confirm `support@fulus.sa` exists and receives mail.** `privacy.html` and the waitlist form's
  `<noscript>` fallback in `index.html` point users to this address (changed from `hello@` on
  2026-07-05). Verify the mailbox is provisioned and monitored before launch — a dead mailto is a
  silent support-channel failure.
- [x] **Founder-note voice — founder accepted the draft as-is (2026-07-05).** The `#trust`
  `blockquote.founder-note` copy (`trust.note` / `trust.name`) stands as written; the founder kept it.
- [ ] **Enable Cloudflare Web Analytics** (cookieless — no cookie banner required). Dashboard →
  Web Analytics → add site `fulus.sa` → copy the token, then paste this snippet immediately
  before `</body>` in `index.html`, substituting the dashboard token:
  `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "PASTE-DASHBOARD-TOKEN-HERE"}'></script>`
  Re-verify transferred JS stays < 200 KB (DevTools Network) after adding the beacon.
- [ ] **Plan the first invite wave within ~1 month of signups starting.** Research signal:
  waitlist→activation roughly halves after a month idle. Decide beta wave cadence early.

## 2. Post-launch (kept from the 2026-05 backlog — still true)

- [ ] Verify the Cloudflare Bulk Redirect `www.fulus.sa/*` → `https://fulus.sa/$1` (301) is live.
- [ ] Cancel the Framer Mini subscription if still active.
- [ ] **FK Grotesk license → Latin display swap.** If/when a license is purchased: change the
  single Latin-display `font-family` custom property in the tokens block of `styles.css`
  (one-line change; Readex Pro remains the Arabic + fallback face). Until then, do not commit
  any FK Grotesk binaries — the trials are unlicensed.
- [ ] App-store links at launch: the footer/vision wiring point carries TestFlight / Play links
  once C-5 (TestFlight verification) closes in the Flutter repo.
- [ ] Spanish + German marketing copy (app already ships es/de) via the same dictionary mechanism.
- [ ] Visual-regression CI (animation-disabled screenshot diff) if rebuild cadence picks up.
- [ ] Page-speed monitoring / RUM (Cloudflare Web Vitals) to track LCP/CLS/INP in production.
- [ ] Public signup counter — only once the number is non-embarrassing (spec non-goal at launch).
- [ ] A-7 (`USING(true)` RLS hardening) — backend engagement candidate; lives in the Supabase repo.

## 3. Engineering notes (found during the rebuild)

- [ ] **`wrangler dev` infinite reload loop.** Local preview (`npx wrangler dev`) can enter an
  infinite reload loop: `wrangler.jsonc`'s `assets.directory: "."` means the dev server watches
  the whole repo root, including its own `.wrangler/state` SQLite cache — writes to that cache
  trigger a reload, which writes to the cache again. Workarounds: run with
  `--persist-to <dir outside the repo>`, or use `python -m http.server` for quick local visual
  checks (no Worker-specific behavior needed for static-asset preview). Consider adding an
  `.assetsignore` (exclude `.wrangler/`) or otherwise reconfiguring `assets.directory` as a
  permanent fix.
- [ ] **Riyal-glyph / dollar-sign inconsistency (founder call, not a bug to silently fix).** The
  four product-chapter screenshots (`assets/images/screen-01-pool.webp` …
  `screen-04-settle.webp`) are real Fulus beta screen renders and show `$` figures (the app's
  current on-device currency formatting), while the hero composite (`assets/images/hero-dashboard.webp`)
  uses the Saudi Riyal glyph (U+20C1, via `assets/fonts/riyal.woff2`). This is a minor visual
  inconsistency, but it's honest — the chapter images are real screenshots, not mockups. Founder
  decision needed: accept as-is, or commission Riyal-glyph composites of the chapter screens
  later.

## 4. Retired by the 2026-07 rebuild (do not resurrect)

These 2026-05-04 items referred to page surfaces the rebuild deleted or laws it now enforces:

- `.hamburger` / `.lang-btn` touch-target bumps — old header + drawer deleted; ≥44 px targets are law.
- `<link rel="canonical">` — carried into the rebuilt `<head>`.
- Header logo `href="#"` → `/` — rebuilt.
- `process-line { left: 0 }` + dead `stroke-dasharray` attribute — process section deleted.
- `langchange` missing `ScrollTrigger.refresh()` — now required by the motion law; implemented in `js/main.js`.
- Unused `isTablet` export — `js/lib.js` deleted.
- `.price-card.popular` placeholder rule — pricing section deleted.
- Drawer focus management / Escape-to-close / dynamic menu `aria-label` — no drawer exists.
- OG image re-export to 1200×630 — the rebuild's `og-image.png` is exported at 1200×630.
- Simple-icons sprite paths (BTC/ETH/AAPL/META) — integrations orbit deleted.
- Arabic testimonial copy review — testimonials deleted (honesty bar); superseded by the
  page-wide native-AR sign-off gate above.
- Hash-named section illustration PNGs — deleted with the old assets.
- Spec-§4.2 leftovers (header scroll-blur ramp, integrations hover pulse, pricing badge gradient
  sweep) + animation-timing observations — sections deleted.
- Old known-limitations list (WebP regression on palette images, static `reducedMotion` snapshot
  in `js/lib.js`, RGBA accent tints, single-line card markup) — superseded stack.
- "Analytics + cookie banner" — superseded by the cookieless Cloudflare Web Analytics gate above.
- Placeholder CTA destinations / form-driven contact flow — superseded by the waitlist form.
