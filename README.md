# fulus-site

Public web presence for Fulus (https://fulus.sa) — the "Threshold × Ledger" waitlist landing page (rebuilt 2026-07).

Served by the `fulus-site` Cloudflare Worker (static assets, `wrangler.jsonc`); pushing to `main` auto-deploys in ~30 s. **No build step** — what is committed is what is served. Local preview: `npx wrangler dev` → http://localhost:8787.

## What's here

- `index.html` — the landing page. Inline SVG icon sprite at the top of `<body>`, header (EN/AR switch + outline anchor CTA), eight sections in order: `#hero`, `#problem`, `#product`, `#how`, `#trust`, `#vision`, `#cta`, `footer#site-footer`, plus the waitlist confirmation `<template id="confirmation-template">`.
- `privacy.html` — minimal bilingual privacy page; shares `styles.css`.
- `styles.css` — single stylesheet, section-header comments. The tokens block adapts the `--fulus-*` custom properties from the brand repo (`fulus-brand/spec/tokens.css`); no hand-invented hex anywhere else.
- `js/` — ES modules, no framework: `main.js` (boot, `html.js` flag, `langchange` → `ScrollTrigger.refresh()`), `i18n.js` (dictionary swap, `localStorage['fulus.lang']`), `waitlist.js` (forms → waitlist API, Turnstile, confirmation panel, `localStorage['fulus.waitlist']`/`['fulus.ref']`), `animations/` (`hero.js`, `portals.js`, `reveals.js` — GSAP, play-once, reduced-motion-complete).
- `i18n/en.json` + `i18n/ar.json` — flat key→string dictionaries. Namespaces: `hero.*`, `problem.*`, `product.*`, `how.*`, `trust.*`, `vision.*`, `cta.*`, `footer.*`, `a11y.*`, `meta.*`, plus the **fixed JS-consumed sets** `form.*` and `confirm.*` (exact keys are API for `js/waitlist.js` — do not rename them without changing `waitlist.js` in the same commit; CI enforces en/ar parity).
- `assets/fonts/` — self-hosted Readex Pro variable woff2 (Latin + Arabic subsets) and `riyal.woff2` (Saudi Riyal symbol U+20C1 subset).
- `assets/images/`, `assets/favicons/` — hero/product composites, silhouette characters, OG image, favicons.
- `.well-known/` — Universal Link / App Link verification artifacts (see below).
- `_headers` — Content-Type/Cache-Control rules for `.well-known` + i18n + asset caching.
- `tools/` + `.github/workflows/checks.yml` — CI gates: i18n key parity, local `js/` byte budget (`tools/js-budget.json`), `.well-known` integrity, internal link/asset existence, `html-validate`.

## Waitlist API

The page posts to the `join-waitlist` Supabase edge function
(`https://zainebbvseprgngrrovk.supabase.co/functions/v1/join-waitlist`, POST JSON, no auth header;
actions `join` / `status` / `profile`). Contract and backend source of truth live in the Flutter repo:
`docs/superpowers/specs/2026-07-03-fulus-landing-page-redesign-design.md` §7 and the companion
waitlist backend plan (`2026-07-04-waitlist-backend.md`). The Cloudflare Turnstile site key is the
`TURNSTILE_SITE_KEY` constant at the top of `js/waitlist.js` (see BACKLOG for the production-key swap).

## Fonts & licensing

- **Readex Pro** (SIL OFL) is the only text family, self-hosted — no Google Fonts requests.
- **FK Grotesk is NOT shipped** (available binaries are unlicensed trials). If a license is purchased
  later, swap the Latin display face via the single `font-family` custom property in the tokens block
  of `styles.css` — nothing else changes.
- `riyal.woff2` carries only U+20C1 (Saudi Riyal symbol), `unicode-range`-scoped, falling back to Readex Pro.

## CI

Runs on every push/PR (`.github/workflows/checks.yml`, node 20). Run locally from the repo root:

    node tools/check_i18n_parity.mjs
    node tools/check_js_budget.mjs
    node tools/check_wellknown.mjs
    node tools/check_links.mjs
    npx --yes html-validate@8 index.html privacy.html

If `js/` grows intentionally: `node tools/check_js_budget.mjs --measure` and bump
`tools/js-budget.json` in the same commit.

## Editing the verification artifacts

**Don't edit the `.well-known/` files in this repo directly.** They are committed reference copies of
the source files in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`. The Flutter repo's
sentinel test (`test/prod_readiness/h_2_7_link_assets_smoke_test.dart`) keeps the AASA whitelist in
sync with the app's route table. To update:

1. Edit the source in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`.
2. Run the sentinel locally to confirm consistency.
3. Open a PR there.
4. After it merges, copy the updated file(s) here and push.

## www redirect

`www.fulus.sa` → `fulus.sa` is configured at the Cloudflare dashboard level (Bulk Redirects / zone
rule that 301s `www.fulus.sa/*` to `https://fulus.sa/$1`), not in a `_redirects` file — Cloudflare's
validator (code 10021) rejects host-based redirects there.

## Backlog

Launch gates and deferred items: [`BACKLOG.md`](BACKLOG.md).

## See also

- Flutter repo: https://github.com/Fulus-Fintech/fulus
- Landing-page spec: `docs/superpowers/specs/2026-07-03-fulus-landing-page-redesign-design.md` (Flutter repo)
- Waitlist backend plan: `2026-07-04-waitlist-backend.md` (Flutter repo, docs/superpowers)
- Brand truth: `fulus-brand` repo (`spec/tokens.css`, logos, characters, screens)
- Deep-link runbooks: `audit/runbooks/h-2-7-*` (Flutter repo)
