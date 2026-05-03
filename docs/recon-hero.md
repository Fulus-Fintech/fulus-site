# Recon — Framer hero behavior on https://www.fulus.sa/

> Notes captured 2026-05-04 from inspection of the live Framer page's
> rendered HTML, inline CSS (1MB style block), and asset references.
> Truly observing animation timings requires running the page in a browser
> with dev tools — Task 2.2 (hero markup) and Task 3.1 (hero animation)
> implementers should re-confirm against the live site before declaring
> done.

## Stack
- React + Framer Motion + Lenis (smooth-scroll), bundled by Rolldown.
- Page is a SPA — no `<noscript>` fallback. JS hydrates the empty skeleton.
- No video, no Lottie, no canvas. Phone mockup and chart are SVG/DOM.

## Hero structure (inferred from `data-framer-name` attributes)
- `data-framer-name="Hero"` — top-level hero section.
- `data-framer-name="Phone"` / `"Mobile"` / `"Mobile Closed"` / `"Screen"` —
  phone mockup container with at least one screen state. The "Closed" name
  hints at a possible state machine (open/closed) but the only state we've
  seen rendered is the open one.
- Inside the phone: tickers for `AAPL` ($245.50), `META` ($778.38),
  `BTC` ($115,943), `ETH` ($3,420.00). All four appear in the source as
  separate elements with named data attrs.
- A profit-distribution example renders separately: `Q2-2025`, `$50,000`,
  `Pro-Rata`, member names `Ahmed Balkhair`, `Fatimah Hassan`,
  `Omar Khalid`. This may be in a different section (Services), not in
  the hero — verify during Task 2.2.

## Animation primitives (mentions in JS bundle)
- `motion.` (Framer Motion) — used for entrance animations and tweens.
- `lenis` — smooth scroll across the whole page.
- No mention of GSAP / ScrollTrigger / Locomotive — Framer ships its
  own Motion library which is API-compatible with framer-motion.

## What we don't know without observing the live page
- Exact headline reveal style (word-by-word vs line-by-line vs
  letter-by-letter). Plan assumes word-by-word with 60ms stagger; verify.
- Phone mockup entrance: scale-from-92% with subtle rotation is our
  best guess. Could be slide-up, fade-in, or different.
- CTA button entrance pattern. Plan assumes horizontal slide.
- Whether scroll-back-to-hero re-triggers the animation or stays settled.
- Mobile-specific simplifications (likely fewer animations).
- Inside-phone animation: counter tweens for prices, chart draw — yes
  per inference but timing/easing unknown.

## Brand color palette (from inline CSS frequency)
- `#04070D` (page bg, 207 occurrences)
- `#10131C` (cards, 141)
- `#D5DBE6` (body text, 345 — most common)
- `#FFFFFF` (headings, 298)
- `#00FFB2` (accent green, 73)
- `#0099FF` (accent blue, 176)
- `#F5F5F5` (off-white, 54)
- Dark theme only. No light-mode variant.

## Typography
- DM Sans 400/500/700 from Google Fonts (Latin glyphs only).
- No Arabic glyphs in the live Framer site (English-only).
- Negative letter-spacing on headings (-0.02em / -0.015em).

## Responsive breakpoints (from rendered media queries)
- ≥1440px: full desktop
- 810-1439px: tablet
- <810px: mobile (likely simpler animations)

## Hero asset inventory (from Framer CDN, mirrored locally)
- `assets/images/logo.png` (220×223) — brand mark
- `assets/images/apple-touch-icon.png` (400×400)
- `assets/images/og-image.png` (1897×907) — social card
- `LMV9...A.png` (1602×1049) — section illustration, possibly hero?
- `rLih...M.png` (1920×1080) — section illustration, possibly hero?
- `EdYw...w.png` (147×147) — small icon (check or asset glyph)

These were renamed during initial port; the rebuild renames them to
semantic names (Task 5 asset pipeline).

## Recommendation for implementation
Task 2.2 implementer should:
1. Open https://www.fulus.sa/ in a browser.
2. Watch hero load 3-5 times, scroll past, scroll back.
3. Note any deviations from the assumptions above.
4. Update this recon-hero.md with observations.
5. Then build hero markup matching what was observed.

Task 3.1 implementer follows the same pattern for animation timing.
