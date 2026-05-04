# fulus-site

Public web presence for Fulus (https://fulus.sa).

Hosted on Cloudflare Pages; auto-deploys on push to `main`.

## What's here

- `index.html` — static landing page (single file, no build step, no JS framework). Ported from the prior Framer landing page on 2026-05-03 as part of h-2.7's Cloudflare Pages migration.
- `assets/` — page imagery and favicon.
- `.well-known/` — Universal Link / App Link verification artifacts for the Fulus mobile app:
  - `apple-app-site-association` — iOS Universal Links manifest. Whitelist of route paths the app handles.
  - `assetlinks.json` — Android App Links manifest. Carries the upload-key SHA-256 fingerprint.
- `_headers` — Cloudflare Pages: forces `Content-Type: application/json` on the two `.well-known/` files.

`www.fulus.sa` → `fulus.sa` redirect is **not** in `_redirects` because Cloudflare Pages' validator (code 10021) rejects host-based redirects in that file — they have to be path-relative. Configure the www-to-apex redirect in the Cloudflare dashboard once both domains are added as custom domains: Pages project → Custom domains → add `fulus.sa` and `www.fulus.sa` → Bulk Redirects (account-level) or a Page Rule that 301s `www.fulus.sa/*` to `https://fulus.sa/$1`.

## Editing the landing page

It's a single static file. Edit `index.html` and push — Cloudflare Pages will auto-deploy in ~30s.

## Editing the verification artifacts

**Don't edit the `.well-known/` files in this repo directly.** They are committed reference copies of the source files in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`. The Flutter repo's sentinel test (`test/prod_readiness/h_2_7_link_assets_smoke_test.dart`) keeps the AASA whitelist in sync with the app's route table. To update:

1. Edit the source in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`.
2. Run the sentinel locally to confirm consistency.
3. Open a PR there.
4. After it merges, copy the updated file(s) here and push.

## Deferred backlog

Pre-launch punch list, polish items, and forward-looking work tracked in [`BACKLOG.md`](BACKLOG.md). Skim that before resuming the engagement.

## See also

- Flutter repo: https://github.com/Fulus-Fintech/fulus
- Pixel-match rebuild spec: `docs/superpowers/specs/2026-05-03-fulus-site-pixel-match-design.md` (in the Flutter repo)
- h-2.7 spec: `docs/superpowers/specs/2026-05-02-h-2-7-deep-link-signing-design.md` (in the Flutter repo)
- Bootstrap runbook: `audit/runbooks/h-2-7-fulus-site-bootstrap.md`
- Deploy runbook: `audit/runbooks/h-2-7-cloudflare-pages-deploy.md`
