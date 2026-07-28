# The Night Crossing — fulus.sa v3 design

**Status:** Approved direction (founder, 2026-07-28: "let's proceed with the direction, and let it enter the portal/gate" → crossing built → "approved, proceed"). This document is the binding design spec for the v3 launch site.

**Normative visual reference:** `docs/superpowers/prototypes/night-crossing/prototype.html` — a working real-time 3D prototype the founder approved live, plus three QA frames in `frames/`. Where words and prototype disagree about look and feel, the prototype wins.

---

## 1 · Decision record

The founder decisions that produced this design, in order, all 2026-07-27/28 (verbatim quotes in project memory `fulus-rebuild-v3-direction`):

1. Rebuild from scratch; everything on the table including the story. KPI: **"whoa" still rules.**
2. Diagnosis of the failed v2 relight, in the founder's words: *"the visuals and graphics used were not good, and the transitions between them were not good either."* Not frame pacing. Visual quality.
3. The **seven-beat architecture is revoked** in every binding.
4. The **waitlist is retired**. The app goes public on the App Store and Google Play (launch target 2026-08-01, date soft/flexible by founder instruction: *"do not limit the design because of the delivery timeline"*). The site's one action: **download**.
5. Rejected on sight, never re-pitch: the one-sheet poster monument; a conventional full site (static and interactive variants); a text-waypoint scroll walk; narrative concepts (held-frame, chat-thread, arrival-counting); the v2 film wholesale.
6. Taste board: the world is **deep-water cinema** (dark, the glowing door, cyan/teal light).
7. *"Previous scroll-based attempts were more interesting"* — the scroll-cinema **form** is right; its execution was below the bar.
8. **APPROVED: the real-time 3D world** — scroll as camera flight through one continuous night toward the portal — with the founder's note **"let it enter the portal/gate"** implemented as the Crossing, then **"approved, proceed."**

Standing laws that survive from canon (unchanged): brand palette and portal geometry (`fulus-brand/docs/brandbook.md` is the constitution — Deep Ocean Night #020B18, Electric Cyan #00E5FF, Neon Teal #00FFB2, drama colours behind subjects only, 70° / 1:1.27 parallelogram, geometry never changes only its light); the founder's silhouette cast is canon, never generate a replacement; voice laws (no jargon, no exclamation marks, aspirational not pain-led, growth-silent, success confirms never celebrates, English only); no fabricated product claims (no licensing claims, exact traction only, as-is vs to-be never conflated).

Dead laws from prior iterations (explicitly retired for v3): the WebGL/Three.js ban; the "filmed never drawn" doctrine; the four-transition law; the beat/scene architecture; all waitlist mechanics.

## 2 · What the site is

One unbroken journey through a deep-ocean night, rendered live in WebGL. The visitor's scroll flies the camera along a path: through the dark, past the ribbon of light, toward the glowing portal — **and through it** — arriving inside, where the world turns calm and the store badges wait. Three acts, no scenes, no sections, no page furniture beyond a wordmark, a progress thread, and the words listed in §4.

The whoa is the medium itself: a real place with real depth that responds to you — not a page describing one.

## 3 · The three acts (as prototyped)

**Act I — The Approach** (progress 0 → ~0.55)
Camera starts high and far. The world: black mirror floor (fog-swallowed edges), drifting light-motes, the ribbon of light winding as a true 3D river from near the camera into the portal's threshold, the portal itself mid-distance — a leaning parallelogram of layered cyan→teal light with a soft hot core, its reflection alive in the floor, a faint Ocean-Night-Blue radial halo behind it (radial texture, never a bounded plane). Cursor moves the camera's eye (parallax); on touch devices, device-natural drift only. H1 and sub hang at the start and fade as the flight begins.

**Act II — The Door** (~0.46 → crossing)
"It's open." lands **while the door is still rising to meet the camera** (never over the blazing face — QA'd). The ribbon fades out before arrival so nothing slices the frame. The door grows until it fills the view; bloom rises with proximity but the parallelogram must keep its shape — the core may blaze, the geometry never dissolves to white (QA'd ceiling in prototype: portal emissive ~1.8×/1.15×, core +0.85, bloom ≤ ~1.2 at arrival).

**The Crossing** — at the plane itself, a light-wash blooms over the screen (peaks exactly at portal z, Gaussian on camera distance, max ~0.92 opacity, near-white cyan #ECFFFE→#BDF6FF radial) and falls away within a breath.

**Act III — Inside** (after the plane)
The world changes state: fog shifts to teal (#05202b) and thins slightly; the door dims behind the camera (to ~1/3 emissive); ahead, a soft light-horizon ("the beyond") with its reflection glowing in the water — the floor must never read as a dead slab and the horizon must never show a seam (both were caught and fixed in QA; the fixes are law: floor veil colour follows the fog colour; the beyond has a mirrored counterpart in the water). Calm. Then the ending: **"Walk in."**, the two store badges, the signature line. The page ends. No footer chrome beyond the legal line.

## 4 · The complete copy deck

Every rendered word on the site. Nothing else exists; additions need founder sign-off.

| Where | Text |
|---|---|
| Nav (persistent) | `FULUS` wordmark · progress thread labeled `THE WAY IN` |
| Act I open | **The group chat, now invested.** / sub: *Group investing for the circle you already have.* / `SCROLL` |
| Act I waypoint (~0.26–0.46) | **One pot. Real votes. Everyone sees everything.** |
| Act II (~0.46–0.64) | **It's open.** |
| Act III end | **Walk in.** / [App Store badge] [Google Play badge] / *The group chat, now invested.* |
| Legal (end, quiet mono) | `FULUS — 01.08.2026 · PRIVACY · TERMS · © 2026 FULUS` + `App Store is a trademark of Apple Inc. · Google Play and the Google Play logo are trademarks of Google LLC.` |

Meta: title `Fulus — It's open.`; description `Fulus is group investing for you and your friends. Everyone sees everything. On the App Store and Google Play.`; OG image = a captured approach frame with "It's open." composited (1200×630, sRGB, ≤300KB); OG title/description mirror the above.

## 5 · Production upgrades beyond the prototype

The prototype is the approved floor. Production raises, in this order, each gated by founder eyes (§8):

1. **The cast in the world.** The founder's brand silhouettes stand in the night along the flight path and inside beyond the door — rim-lit, reflected in the floor, always derived from the canon cast (site-ready cutouts exist at `assets/images/fig-*.webp`; regeneration only via the sanctioned pipeline). Billboarded planes with alpha are acceptable if floor contact (occlusion pool + reflection) is convincing; figures that read as pasted fail the gate.
2. **Environment richness.** Water-surface normal ripple on the mirror (subtle — water that remembers it is water), volumetric-feel light shafts inside the pour of the door, better grain/vignette finish, denser mote field with depth-graded size, colour-graded ACES output. Nothing may strobe; all modulation slow (≤0.5Hz feel); decelerate-and-settle on every camera and light change.
3. **Interactive moments (gated, optional).** If the founder wants product-truth interactivity in-world (the pot lighting, the vote), it is staged as objects in the night — light responding to touch — never UI cards floating in space. Each such moment is a separate founder gate; the site is complete without them.
4. **Sound (gated, optional).** Opt-in only; deep-water room tone + crossing swell. Off by default, never autoplay.
5. **The film slot.** When the launch film ships, a quiet `Watch the film` waypoint may live in Act I; it opens the film as an overlay. The site never waits on the film.

## 6 · Engineering

- **Stack:** Vite + TypeScript + **Three.js** (importmap/npm, pinned), UnrealBloom post pass, Reflector floor, ACES tone mapping. No other frameworks.
- **Repo:** new branch `rebuild/night-crossing` cut from `main`. The v2 site code is retired at implementation (git history preserves it); `rebuild/threshold-ledger` is never merged. Kept from the existing repo: Cloudflare Workers deploy path, `_headers`, `.well-known/*` (LAW: never edit here — source of truth is the Flutter repo), self-hosted Readex Pro, budget/link/wellknown check tooling, Playwright infra.
- **Document-first floor:** underneath the canvas, `index.html` is a complete semantic page — H1, sub, the waypoint line, badges as real `<a href="/app/ios|/app/android">`, legal — fully usable with JS off. The 3D world is an enhancement layer. No-WebGL / reduced-motion / save-data visitors get the **poster edition**: a captured approach frame as a static hero with the same copy and working badges (complete page, not a fallback apology).
- **Performance:** pixelRatio cap 2 (1.5 under load); a frame-time governor sheds in order: bloom resolution → Reflector resolution → mote count → Reflector off (fake reflection sprite stays) → poster edition. Tiers only drop. Target 60fps on a mid-range Android; scroll lerp weight 0.07–0.09 (the approved feel).
- **Store handoff:** badges → `/app/ios`, `/app/android` (302 via edge Worker, IDs as config vars, never 404); `/app` = platform-detect short link (QR target). Pre-live dim state (`DOORS=pre`): badges dimmed by opacity only, folio line `Doors at midnight.` (time-free fallback `Doors opening.` pre-written), flip is one var change.
- **Analytics:** two events, first-party, cookieless (pageview, badge tap). No consent banner needed; privacy page states precisely what is and isn't stored.
- **Budgets (CI-enforced, bump-deliberately):** JS+CSS+HTML critical ≤ 350KB gz (Three.js included); poster-edition total ≤ 700KB; time-to-first-world < 2.5s on 4G (poster paints < 1.5s, world fades in over it when ready — never a black hold, never a loader).
- **Accessibility:** all copy is real DOM above the canvas (canvas `aria-hidden`); AA contrast on #020B18 (quiet text ≥ #93A1B0); focus answers with light, no movement; badges ≥ 44px targets; full keyboard path to both badges; `prefers-reduced-motion` = poster edition.

## 7 · Testing

- Playwright e2e: JS-off document completeness (copy verbatim = the copy lock), badge hrefs, redirect contract incl. dim state, no horizontal scroll 320px→3440px, zero console errors, axe clean on both editions.
- Visual baselines: poster edition only (deterministic); WebGL frames are review artifacts, eyeballed, never pixel-gated in CI (SwiftShader lesson stands).
- Unit: camera path math, governor tier logic, redirect table.
- The scrub/frame-time telemetry harness from v2 (`tools/measure_scrub.mjs`) is retargeted to the flight.

## 8 · Quality process — the law that finally worked

1. **Nothing reaches the founder unexamined.** Every visual change is screenshot-captured (headless, and on-device for milestones) and reviewed by the implementing agent's own eyes against this spec and the prototype before presenting. Defects like bounded-plane halos, seams, blown cores, dead floors are named kill-classes from QA history — check for them explicitly.
2. **Founder gates** (verdict per gate, never proceed on silence):
   - G1 world parity: production build matches/beats the prototype live.
   - G2 cast-in-world: figures standing convincingly (per-figure verdicts).
   - G3 environment richness pass.
   - G4 each optional interactive moment (if requested).
   - G5 real-phone feel test over cellular, founder's hand on the phone — blocking before launch (verify the Windows OS animation setting on the dev machine before any motion QA; a revert silently fakes reduced-motion).
3. **The founder's feel verdict outranks every green gate.** A "feels off" without nameable cause loops back to diagnosis with screenshots, not to blind tweaking.

## 9 · Out of scope / retired

Waitlist and all its mechanics (form, Turnstile, referral, Supabase join-waitlist — code deleted at implementation; the edge function itself is left untouched server-side). The seven-beat film. Scene/beat architectures. The one-sheet. Pre-rendered scroll-scrub film. Arabic/bilingual (English only stands; privacy.html keeps its bilingual legal text).

## 10 · Open items (owners)

1. **Store IDs** (App Store ID, Play package) — founder, when listings exist; redirects ship against config vars.
2. **Wordmark vector** — founder source or approved trace (only `logo.webp` exists).
3. **FK Grotesk licence or Readex Pro stays** — founder; unlicensed binaries never ship.
4. **Terms page content** — founder/legal; `/terms` is linked in the footer.
5. **Sound & interactive moments** — founder taste calls at their gates (§5).
6. **Launch film slot activation** — when the film clears its own gates.
