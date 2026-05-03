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
- `_redirects` — Cloudflare Pages: 301s `www.fulus.sa/*` to `fulus.sa/*` (apex is canonical).

## Editing the landing page

It's a single static file. Edit `index.html` and push — Cloudflare Pages will auto-deploy in ~30s.

## Editing the verification artifacts

**Don't edit the `.well-known/` files in this repo directly.** They are committed reference copies of the source files in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`. The Flutter repo's sentinel test (`test/prod_readiness/h_2_7_link_assets_smoke_test.dart`) keeps the AASA whitelist in sync with the app's route table. To update:

1. Edit the source in the Flutter repo at `audit/runbooks/h-2-7-fulus-site-files/`.
2. Run the sentinel locally to confirm consistency.
3. Open a PR there.
4. After it merges, copy the updated file(s) here and push.

## See also

- Flutter repo: https://github.com/Fulus-Fintech/fulus
- h-2.7 spec: `docs/superpowers/specs/2026-05-02-h-2-7-deep-link-signing-design.md` (in the Flutter repo)
- Bootstrap runbook: `audit/runbooks/h-2-7-fulus-site-bootstrap.md`
- Deploy runbook: `audit/runbooks/h-2-7-cloudflare-pages-deploy.md`
