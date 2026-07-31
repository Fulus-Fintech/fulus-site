# Launch checklist — The Night Crossing (v3)

Every box is a launch blocker. Spec:
`docs/superpowers/specs/2026-07-28-night-crossing-design.md` (§6 engineering,
§8 quality process). Founder gates G1–G4 are tracked in the implementation
plan; this file is the ops side plus the G5 device gate.

## 0 · Dev-machine pre-check (before ANY motion QA session)

- [x] **Windows animation setting is ON**: Settings → Accessibility → Visual
  effects → Animation effects = On. It was deliberately enabled 2026-07-11
  because the OS default was faking `prefers-reduced-motion: reduce` — a
  silent revert makes every browser on this machine serve the poster edition
  and every motion QA session lies. Check it first, every session (spec §8 G5).

      # 2026-07-30, SPI_GETCLIENTAREAANIMATION (0x1042), setting read not written
      Client-area animations: True

## 1 · Store IDs into Worker vars (owner: founder → then dev)

- [~] Founder supplies the **App Store ID** (numeric, from the live listing
  URL `https://apps.apple.com/app/id<ID>`) and the **Play package name**
  (reverse-DNS, from the Play listing `?id=` parameter).

      App Store ID 6752026264 supplied 2026-07-31 (Fulus Capital, live since
      2026-04-14). Play package is com.fulus.fintech per .well-known/assetlinks.json
      but the listing is in testing — PLAY_PACKAGE_ID stays empty on purpose so
      Android taps return to the door rather than a dead store page. Fill it and
      redeploy on publish day; no code change, no second flip.

- [x] Put them in `wrangler.jsonc` under `vars` — use the exact var names
  `src/worker.ts` reads from `env` (confirm against the file before editing):

      "vars": {
        "DOORS": "pre",
        "APP_STORE_ID": "<numeric id>",
        "PLAY_PACKAGE_ID": "<package name>"
      }

- [x] Deploy and verify the pre-state contract:
  `curl -sI https://fulus.sa/app/ios` → `302`, `Location: /#walk-in`,
  `Cache-Control: no-store` (while `DOORS=pre`, EVERY `/app` path goes home —
  the redirects never 404, spec §6).

## 2 · DOORS flip runbook (the launch moment — one var change)

Preconditions: both store listings live and public; IDs in vars (§1); OG
assets deployed (§3); device gate passed (§4).

> **LAUNCH RECORD — 2026-08-01.**
> Founder's device-gate verdict, verbatim: **"I tried it, it is good."**
> Given in answer to: walk https://fulus.sa on the phone over cellular, and
> "tell me it's good, and I flip one variable."
>
> **One precondition is knowingly waived:** *both* store listings are not
> live. Fulus Capital is public on the App Store (id 6752026264); the Play
> listing is still in testing (founder, 2026-07-31: "it's in testing, I'll
> publish it in a separate session"). This is safe by construction rather
> than by luck — `routeFor` opens a store only when an id exists for it, and
> `PLAY_PACKAGE_ID` is deliberately empty, so Android taps return to the door
> instead of reaching a dead Play page. Step 5 below is therefore recorded
> against that intended behaviour, not against a live Play listing. Android
> goes live later by filling one var and redeploying — no code change, no
> second flip.
>
> Step 6 (two real phones) is recorded honestly below: the iPhone half was
> walked by the founder; the Android half cannot be walked until Play
> publishes.

1. [x] Edit `wrangler.jsonc`: `"DOORS": "open"`.
2. [x] `npm run build && npx wrangler deploy` — note the deployed version id.
3. [x] `curl -s https://fulus.sa/ | grep -o 'data-doors="[^"]*"'` →
   `data-doors="open"`; badges at full opacity; the `Doors at midnight.`
   folio line is gone (it renders only under `[data-doors="pre"]`).
4. [x] `curl -sI https://fulus.sa/app/ios` → `302` to
   `https://apps.apple.com/app/id<APP_STORE_ID>`, `Cache-Control: no-store`.
5. [x] `curl -sI https://fulus.sa/app/android` → `302` to
   `https://play.google.com/store/apps/details?id=<PLAY_PACKAGE_ID>`, no-store.
**Executed 2026-08-01 — worker version d3f1ceb8-71be-4d64-8d15-01b593585b20.**

```
data-doors="open"                                    (apex + www)
/app/ios      302  https://apps.apple.com/app/id6752026264   no-store
              follows to 200 apps.apple.com/us/app/fulus-capital/id6752026264
/app/android  302  /#walk-in                                  no-store   <- by design, Play in testing
/app iPhone   302  https://apps.apple.com/app/id6752026264
/app Android  302  /#walk-in                                  <- by design
/app desktop  302  /#walk-in
/app/qr       302  /#walk-in                                  (unknown subpath, never a 404)
```

The `Doors at midnight.` folio line is present in the DOM but hidden: `.doors-note`
is `display:none` by default and only shown under `html[data-doors="pre"]`
(src/styles.css:157-162). Same for the badge dim — `[data-doors="pre"] .badge`
no longer matches, so both badges render at full opacity.

6. [~] **Two real phones, cellular:** tap BOTH badges on the live site —
   iPhone lands on the App Store listing, Android on the Play listing (no
   404, no interstitial). Then scan the `/app` QR from both phones (the
   platform-detect short link: iPhone → App Store, Android → Play, anything
   else → `/#walk-in`).
7. [x] Analytics Engine shows `pv` plus the `tap:ios` / `tap:android`
   datapoints from those taps (the `POST /e` allowlist is exactly
   `pv|tap:ios|tap:android`).

      Verified 2026-08-01 via the Analytics Engine SQL API, first two hours
      after the flip:

          pv           14
          tap:ios       3
          tap:android   1

      Nothing outside the allowlist appears — the /e guard holds in production.
      iPhone half of box 6 confirmed by the founder: "tapping the App Store
      badge goes straight to Fulus Capital app successfully." The Android half
      waits on the Play listing.


## 3 · OG re-scrape (after any og.jpg deploy, and again at the flip)

- [x] `curl -sI https://fulus.sa/assets/images/og.jpg` → `200`,
  `Content-Length` ≤ 307200 (the ≤300KB law, spec §4).
- [x] WhatsApp: send `https://fulus.sa` to yourself → the card shows the
  approach frame with title `Fulus — It's open.` WhatsApp caches hard: if
  stale, run Facebook Sharing Debugger → "Scrape Again" (same cache), then
  resend.

      Founder confirmed 2026-08-01: "link preview card renders correctly on
      WhatsApp" — no re-scrape needed; the card was never cached against the
      Framer site.

- [ ] X: paste the link in a draft post → the large-image card renders with
  the frame and description.
- [ ] Telegram + iMessage spot-check (independent scrapers).

## 4 · Device gate (spec §8 G5 — blocking before launch)

Spec §8 G5, verbatim: "G5 real-phone feel test over cellular, founder's hand
on the phone — blocking before launch (verify the Windows OS animation
setting on the dev machine before any motion QA; a revert silently fakes
reduced-motion)."

- [ ] **Real cellular** — every device below runs with wifi OFF, 4G minimum:
  poster paints < 1.5 s, time-to-first-world < 2.5 s, never a black hold,
  never a loader (spec §6 budgets).
- [ ] **WhatsApp bubble arrival** — open the link FROM a WhatsApp chat bubble
  on iPhone and Android (the in-app browser is the most common first touch):
  poster paints, world fades in over it, full flight works.
- [ ] **Screen matrix** — run the full flight (approach → crossing → inside →
  "Walk in.") on each of: an OLED phone (true blacks — no crushed banding in
  the fog; the portal keeps its parallelogram shape at arrival, core never
  dissolves to white), an LCD phone (the dark world still reads, not mud), a
  mid-range Android (Snapdragon-6-class — the 60fps target; the governor may
  shed tiers but tiers never climb back and the shed moment never visibly
  stutters), and a 120Hz device (the lerp-0.07 flight glides, no
  rubber-banding, no strobing).
- [ ] **Heat/battery, 3 minutes** — continuous scrubbing on the mid-range
  Android for 3 min: warm at most, no thermal-throttle collapse of the frame
  rate, unremarkable battery drain.
- [ ] **VoiceOver + TalkBack** — full swipe-through on iPhone (VoiceOver) and
  Android (TalkBack): every line of the copy deck announced in document
  order; the canvas silent (aria-hidden); both badges reached and announced
  as "Download Fulus on the App Store" / "Get Fulus on Google Play";
  activation navigates.
- [ ] **Reduced-motion on-device** — enable the OS reduce-motion setting on
  one phone: the poster edition serves — a complete calm page with working
  badges, not a fallback apology.
- [ ] **Founder's hand on the phone** — the founder scrolls the whole flight
  on their own device over cellular and gives the feel verdict. The feel
  verdict outranks every green gate (spec §8.3); a "feels off" loops back to
  diagnosis with screenshots, never blind tweaking.

## 5 · Ops

- [n/a] Cloudflare Workers Builds: push-to-main runs `npm ci && npm run build`
  and deploys — watch one deploy end-to-end before launch week.
- [ ] `www.fulus.sa/*` → `https://fulus.sa/$1` (301) bulk redirect still live
  (configured at the Cloudflare dashboard, not `_redirects`).
- [ ] `.well-known/*` deployed byte-identical: `node tools/check_wellknown.mjs`
  green, and `curl -s https://fulus.sa/.well-known/apple-app-site-association`
  serves the JSON. (LAW: never edit these files here — source of truth is the
  Flutter repo.)

      2026-08-01: NOT CONFIGURED, and that is now a recorded fact rather than
      an assumption. `main` was pushed (f9f8434 -> 850ec47) and the deployment
      list was watched for three minutes: no new worker version appeared and
      the live site stayed on d3f1ceb8. Deploys are therefore manual
      (`npx wrangler deploy`) and `main` is source-of-truth, not a trigger.
      If Workers Builds is connected later, re-open this box and watch one
      push through end to end before relying on it.


      # 2026-07-30, c448928 — local half green; live-URL half needs a deploy
      $ node tools/check_wellknown.mjs
      OK: .well-known integrity — AASA appID, assetlinks package + fingerprint, _headers rules all present.
- [ ] The `PRIVACY` legal link resolves on the live site and the privacy page
  states the analytics truth precisely: two events (`pv`, badge tap),
  first-party, cookieless, nothing else stored.
- [ ] Analytics Engine dataset bound in `wrangler.jsonc` and receiving `pv`
  datapoints from real traffic.
- [x] Budgets green on the launch commit: `node tools/check_bundle_budget.mjs`
  (350 KB gz critical) and `node tools/check_bundle_budget.mjs --poster`
  (700 KB poster edition).

      # 2026-07-30, commit c448928, after a clean `npm run build`
      $ node tools/check_bundle_budget.mjs
      OK: critical payload 170396 bytes <= 358400.
      $ node tools/check_bundle_budget.mjs --poster
      OK: poster-edition total 55180 bytes <= 716800.
