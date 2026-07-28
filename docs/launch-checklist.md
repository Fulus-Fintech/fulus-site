# Launch checklist — The Night Crossing (v3)

Every box is a launch blocker. Spec:
`docs/superpowers/specs/2026-07-28-night-crossing-design.md` (§6 engineering,
§8 quality process). Founder gates G1–G4 are tracked in the implementation
plan; this file is the ops side plus the G5 device gate.

## 0 · Dev-machine pre-check (before ANY motion QA session)

- [ ] **Windows animation setting is ON**: Settings → Accessibility → Visual
  effects → Animation effects = On. It was deliberately enabled 2026-07-11
  because the OS default was faking `prefers-reduced-motion: reduce` — a
  silent revert makes every browser on this machine serve the poster edition
  and every motion QA session lies. Check it first, every session (spec §8 G5).

## 1 · Store IDs into Worker vars (owner: founder → then dev)

- [ ] Founder supplies the **App Store ID** (numeric, from the live listing
  URL `https://apps.apple.com/app/id<ID>`) and the **Play package name**
  (reverse-DNS, from the Play listing `?id=` parameter).
- [ ] Put them in `wrangler.jsonc` under `vars` — use the exact var names
  `src/worker.ts` reads from `env` (confirm against the file before editing):

      "vars": {
        "DOORS": "pre",
        "APP_STORE_ID": "<numeric id>",
        "PLAY_PACKAGE_ID": "<package name>"
      }

- [ ] Deploy and verify the pre-state contract:
  `curl -sI https://fulus.sa/app/ios` → `302`, `Location: /#walk-in`,
  `Cache-Control: no-store` (while `DOORS=pre`, EVERY `/app` path goes home —
  the redirects never 404, spec §6).

## 2 · DOORS flip runbook (the launch moment — one var change)

Preconditions: both store listings live and public; IDs in vars (§1); OG
assets deployed (§3); device gate passed (§4).

1. [ ] Edit `wrangler.jsonc`: `"DOORS": "open"`.
2. [ ] `npm run build && npx wrangler deploy` — note the deployed version id.
3. [ ] `curl -s https://fulus.sa/ | grep -o 'data-doors="[^"]*"'` →
   `data-doors="open"`; badges at full opacity; the `Doors at midnight.`
   folio line is gone (it renders only under `[data-doors="pre"]`).
4. [ ] `curl -sI https://fulus.sa/app/ios` → `302` to
   `https://apps.apple.com/app/id<APP_STORE_ID>`, `Cache-Control: no-store`.
5. [ ] `curl -sI https://fulus.sa/app/android` → `302` to
   `https://play.google.com/store/apps/details?id=<PLAY_PACKAGE_ID>`, no-store.
6. [ ] **Two real phones, cellular:** tap BOTH badges on the live site —
   iPhone lands on the App Store listing, Android on the Play listing (no
   404, no interstitial). Then scan the `/app` QR from both phones (the
   platform-detect short link: iPhone → App Store, Android → Play, anything
   else → `/#walk-in`).
7. [ ] Analytics Engine shows `pv` plus the `tap:ios` / `tap:android`
   datapoints from those taps (the `POST /e` allowlist is exactly
   `pv|tap:ios|tap:android`).

## 3 · OG re-scrape (after any og.jpg deploy, and again at the flip)

- [ ] `curl -sI https://fulus.sa/assets/images/og.jpg` → `200`,
  `Content-Length` ≤ 307200 (the ≤300KB law, spec §4).
- [ ] WhatsApp: send `https://fulus.sa` to yourself → the card shows the
  approach frame with title `Fulus — It's open.` WhatsApp caches hard: if
  stale, run Facebook Sharing Debugger → "Scrape Again" (same cache), then
  resend.
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

- [ ] Cloudflare Workers Builds: push-to-main runs `npm ci && npm run build`
  and deploys — watch one deploy end-to-end before launch week.
- [ ] `www.fulus.sa/*` → `https://fulus.sa/$1` (301) bulk redirect still live
  (configured at the Cloudflare dashboard, not `_redirects`).
- [ ] `.well-known/*` deployed byte-identical: `node tools/check_wellknown.mjs`
  green, and `curl -s https://fulus.sa/.well-known/apple-app-site-association`
  serves the JSON. (LAW: never edit these files here — source of truth is the
  Flutter repo.)
- [ ] The `PRIVACY` legal link resolves on the live site and the privacy page
  states the analytics truth precisely: two events (`pv`, badge tap),
  first-party, cookieless, nothing else stored.
- [ ] Analytics Engine dataset bound in `wrangler.jsonc` and receiving `pv`
  datapoints from real traffic.
- [ ] Budgets green on the launch commit: `node tools/check_bundle_budget.mjs`
  (350 KB gz critical) and `node tools/check_bundle_budget.mjs --poster`
  (700 KB poster edition).
