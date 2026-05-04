# Deferred backlog

This file tracks items deferred during the 2026-05-03 → 2026-05-04 pixel-match
rebuild engagement (specs at
[`fulus repo`/docs/superpowers/specs/2026-05-03-fulus-site-pixel-match-design.md](https://github.com/Fulus-Fintech/fulus/blob/main/docs/superpowers/specs/2026-05-03-fulus-site-pixel-match-design.md)).
The rebuild's code+docs work landed across 37 commits on `main`; what's below
is the close-out punch list before public launch + a few items intentionally
left for a later pass.

Last updated: 2026-05-04.

---

## 1. Ops (Ahmed-driven, gates public launch)

### Day 1 — DNS cutover
- [ ] Cloudflare → fulus-site Worker → Domains: add `fulus.sa` + `www.fulus.sa`. Note the 2 assigned NS.
- [ ] NS swap at `.sa` registrar (Hawsabah → Cloudflare). Runbook in Flutter repo: `audit/runbooks/h-2-7-cloudflare-pages-deploy.md`.
- [ ] After NS propagation: Apple AASA validation tool reports valid; Google Digital Asset Links reports green.
- [ ] iPhone fresh-install → tap a `https://fulus.sa/<route>` link → opens in app. (Android click-through deferred to internal-testing build per c-5 runbook.)

### Day 5 — sign-off + redirects
- [ ] Visual sign-off review: open `https://fulus-site.ahmed-balkhair.workers.dev/` and `https://www.fulus.sa/` side-by-side at desktop (1440px) + mobile (<810px), in EN + AR. Walk each section.
  - Document approval: `git -C "C:/Users/Administrator/Downloads/fulus-site" commit --allow-empty -m "chore: visual sign-off received from Ahmed YYYY-MM-DD"`.
- [ ] Cloudflare Bulk Redirects → list `www.fulus.sa/*` → `https://fulus.sa/$1` (301). Attach at zone level. Verify www 301s to apex.
- [ ] Run Lighthouse against the deployed URL: `npx lighthouse https://fulus-site.ahmed-balkhair.workers.dev/ --view --preset=desktop` and `--form-factor=mobile`. Target ≥95 across Performance / Accessibility / Best Practices / SEO.
- [ ] Record Lighthouse scores in this README (per Phase 6 Task 6.1 step 5).
- [ ] Cancel Framer Mini subscription.

---

## 2. Pre-launch polish — sandbox-doable (10-30 min each)

Pick up in any order before launch; none gate the cutover.

- **Touch targets below 44×44 WCAG/HIG minimum** — `.hamburger` is 36×36 (`styles.css:156`); `.lang-btn` is ~32px tall (`styles.css:154`). Bump padding.
- **Add `<link rel="canonical" href="https://fulus.sa">`** in `<head>` (`index.html`).
- **Header logo `href="#"`** → change to `href="/"` so it actually navigates home instead of scrolling to top + appending a `#` to the URL (`index.html:36`).
- **`process-line { left: 0 }`** → `inset-inline-start: 0` for logical-property consistency (`styles.css:206`; cosmetic — the line is `aria-hidden`).
- **`langchange` doesn't `ScrollTrigger.refresh()`** — services desktop scroll-pin direction stays stale until window resize when user toggles language. One-line fix in `js/main.js`: add `document.addEventListener('langchange', () => ScrollTrigger.refresh())`.
- **Drop dead `stroke-dasharray="6 6"` HTML attribute** on the process line SVG path (`index.html` process section). The CSS `stroke-dasharray: 1900` overrides it and the line draws solid by design.
- **Drop unused `isTablet` export** from `js/lib.js:5` (no animation module imports it; misleads future contributors).
- **Drop empty placeholder rule** `.price-card.popular { /* set the label via JS in Phase 3 — gradient sweep + 'Popular' label */ }` from `styles.css:248` — the comment is stale (the label IS set via JS in Phase 2 Task 2.9; the gradient-sweep was simplified to a box-shadow pulse in Phase 3 Task 3.8).

### Accessibility polish (drawer)
- **Mobile drawer focus management** — on hamburger open, move focus to first nav link; on close (any path), return focus to hamburger.
- **Escape-to-close** drawer.
- **Dynamic `aria-label` toggle** between "Open menu" / "Close menu" via the existing `data-i18n-attr="aria-label"` mechanism (keys `a11y.menu.open` / `a11y.menu.close` already in both en/ar dictionaries from Phase 4 Task 4.1).

---

## 3. Pre-launch polish — needs input/assets

- **OG image re-export to 1200×630** — current `assets/images/og-image.png` is 1897×907 (ratio 2.09:1); Facebook/LinkedIn target 1.91:1 and will crop the sides. Re-export from source, replace PNG + WebP variants.
- **Brand icon SVG paths in sprite** — `assets/icons/sprite.svg` ships simplified BTC/ETH/AAPL/META path data per the plan. For production faithfulness, fetch canonical paths from <https://simple-icons.org> and replace.
- **Arabic testimonial copy review** — `stories.cards.{0,1,2}.body` in `i18n/ar.json` are AI first-pass per spec §9. Ahmed (or a professional translator) should review pre-launch — testimonial idiom translation is the area most likely to read awkwardly.
- **Section illustration PNGs still hash-named on disk** (`LMV9IYKI2TkgMh5KmQhbeIV2A.png`, `rLihu4NmoRAKZVYcyV0i2F3lhoM.png`). The WebP variants are renamed to `section-1602.webp` / `section-1920.webp`. Rename the PNGs to match if/when these illustrations are placed in the page (currently not used in markup).

---

## 4. Spec §4.2 features that didn't make Phase 3

These were described in the spec but the Phase 3 plan delivered different / no implementation. Carry into a follow-up if they're load-bearing for visual parity:

- **Header scroll-blur ramp** — spec §4.2 calls for `backdrop-filter` ramping from `blur(0)` to `blur(12px)` past 40px scroll. Currently static at `blur(12px)` (`styles.css:146`). No `header.js` animation module exists. Adding it = small new module + scroll listener.
- **Integrations icons "pulse on hover"** — spec §4.2 mentions pulse on hover; Phase 3 Task 3.7 plan delivered orbit rotation + section reveal only.
- **Pricing badge gradient sweep** — spec §4.2 calls for "slow gradient sweep on a 3s loop" on the popular badge. Phase 3 Task 3.8 plan delivered a box-shadow pulse instead. Probably acceptable; flagging only because the simplification is a deliberate scope decision worth confirming.

### Animation timing observations
- **Pricing pulse fires at page load** with no scroll trigger — animates an off-screen element until user scrolls into view.
- **Process counters double-animate** under reduced-motion: hero.js used to sweep `[data-counter]` page-wide (since fixed in `ea2eee6` — scoped to `#hero [data-counter]`); the issue is now closed but worth knowing the history.
- **Services desktop pin in RTL** — direction sign-flipped in Phase 4 Task 4.3, but in RTL the user sees DOM-order card 5 first. If sequence is meaningful, consider `flex-direction: row-reverse` on `.services-stack` under `[dir="rtl"]` (only inside the desktop pin layout, not the mobile stagger).

---

## 5. Known limitations (acceptable as-is)

- **WebP regression on small palette images** — `cwebp -q 85` produces output larger than the optimized PNG for `logo.png`, `section-1602.png`, `section-1920.png`. Only `og-image.webp` is meaningfully smaller (-48%). The `<picture>` element fetches WebP for browsers that support it, which is a tiny perf regression for the logo on modern browsers. Decision: ship as-is per plan; total impact is ~2KB on the wire, dwarfed by the ~100KB CDN library load.
- **`reducedMotion` is a static snapshot** in `js/lib.js:3` — evaluated once at module load, not reactive to mid-session OS preference changes. Marketing site, very low risk.
- **Hardcoded RGBA accent-tint values** at three call sites (`styles.css` `.process-card .num`, `.price-card.popular`, `.compare-list .check`) using slightly different alphas (0.10, 0.08, 0.12) — could be tokenized as `--accent-soft-*` if more sites accumulate. Acceptable for v1.
- **`gsap` and `ScrollTrigger` are CDN globals**, not ES module imports. Standard pattern for this stack; main.js guards `typeof gsap === 'undefined'` before calling animation modules.
- **Single-line card markup** in benefits / services / comparison sections is dense but readable for short cards. If card copy grows substantially, expand to multi-line.

---

## 6. Forward-looking (post-launch, separate engagement)

These are out of scope per the spec but worth keeping visible:

- **CTA destinations** — header + hero + pricing CTAs are placeholder `href="#"`. Wire to TestFlight / Play / contact-form once those exist; gated on C-5 (TestFlight verification) and on a hosted Privacy URL per `c-1-11-pdpl-legal-handoff` (Flutter repo runbook).
- **Spanish + German marketing copy** — Flutter app supports `es`/`de`; add to fulus-site as a translation-strings PR via the same dictionary mechanism.
- **Analytics + cookie banner** — once tracking is needed: Plausible or Cloudflare Web Analytics + a PDPL-compliant cookie banner.
- **Visual-regression CI** — automated screenshot diff with animation-disabled snapshots, if frequent rebuilds become common.
- **Page Speed monitoring** — Cloudflare Web Vitals or RUM service to track LCP/CLS/INP in production.
- **Form-driven contact flow** — replace placeholder "Get Started" anchors with a real form (Cloudflare Forms / Tally), gated on a hosted Privacy URL.
- **A-7 (RLS `USING(true)`)** — backend hardening engagement candidate. Filed during h-2.7 design as the proper-fix layer to h-2.7's client-side IDOR mitigation. Lives in the Supabase repo.
