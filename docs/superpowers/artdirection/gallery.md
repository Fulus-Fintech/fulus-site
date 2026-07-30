# WHO'S IN? — The Relight — Key-Frame Gallery (Checkpoint A)

Founder approval gate per plan Task 13. Nothing animates (Tasks 14+) until each
scene's key frame is **Approved** below. Frames live in `frames/kf/` and are real
frozen end-states of the shipped code (engine on, seed 1204, `?fulus-freeze=1`).

Engine state at capture: atmosphere + ribbon + emissive + dust all live
(two silent-render engine bugs were found and fixed during this phase: missing
`gl.viewport` on resize, and back-face culling killing the ribbon and emissive
passes — commits de5238a, 63cff7f, 7a25482).

| # | Scene | Frame(s) | Craft-law self-check | Known tunables / open questions | Founder verdict |
|---|---|---|---|---|---|
| KF0 | Hero — Everyone's Online | `hero-p100-desktop.png` · `hero-p100-mobile.png` | Pass ×6 (mobile after recompose fix) | Crew overlap margin fixed-px → clamp() at T23 | REWORK — title+subtitle copy rejected; figures to regenerate via HiggsField |
| KF1 | New Math | `math-p100-desktop.png` | Pass; law 2 borderline bands accepted | Braid could be plusher; ribbon now extends the cable edge-to-edge | REWORK — copy rejected |
| KF2 | One Pot | `pot-p100-desktop.png` | Pass after ribbon+seam fix | Ribbon terminates just short of the gate seam — T18 (pot relight) closes it | REWORK — portal does not read clearly as a portal |
| KF3 | The Vote | `vote-p100-desktop.png` | Pass | Ribbon kink at the gold-beam junction; phone option spacing | APPROVED (soft — revisit if a better alternative emerges) |
| KF4 | The Lock (poster/OG) | `shares-p100-desktop.png` · `shares-p100-mobile.png` (+`shares-p5-*` fused-bar proofs) | Pass ×6 both viewports (mobile after pill-lane fix) | None — this frame feeds the OG image at T26 | REWORK — bar meaning unclear; copy rejected |
| KF5 | Payday | `payday-p100-desktop.png` | Pass | Crew renders as lit monogram pods (no per-member figure art exists); stream tails slightly wiry | SEMI-APPROVED — lit-crew representation to improve (HiggsField per-member figures candidate) |
| KF6 | The Door | `door-p100-desktop.png` · `door-p100-mobile.png` | Pass after climax recompose + phantom-glow fix | **Founder decision:** the two figure images carry baked-in portal art — their rectangular bounds cannot fully melt via CSS. Options: (a) keep as a "doors" motif, (b) produce treated per-figure assets, (c) go figure-free and let portal+beam carry the scene | REWORK — prove the typed-fill + beam respect the parallelogram (the old square-fill bug must be visibly gone); figures await HiggsField assets (founder chose option b) |

## Checkpoint log

### Checkpoint B — first relit scene (Scene 0 · Everyone's Online)

- Date: 2026-07-26
- Reviewed: `frames/motion/hero-p{0,25,50,75,100}-desktop.png` + live preview (intro, mid-intro skip, scrub, hero→math handoff)
- Founder verdict: **Approved** ("approve, proceed")
- Rework iterations: none
- Gate: Tasks 17–23 unblocked on Approved only — UNBLOCKED as of this entry.
- Context: presented on the transition system (T14, commit 2a8b0c0 — EASE vocabulary + six boundary handoffs) and the relit Scene 0 (T15, commit 756373a); frames refreshed at checkpoint (745959d). Same gallery artifact URL, titled "WHO'S IN? — Gallery, Checkpoint B".

- 2026-07-26 — CHECKPOINT A CLOSED: founder proceed-approval ("let's proceed and see how it becomes") covering KF0/KF1/KF2/KF4/KF6 with the brand cast restored; KF3 approved, KF5 semi-approved (pods stand). Tasks 14+ UNBLOCKED. Session handed over — see docs/superpowers/plans/2026-07-26-relight-handover.md.

- 2026-07-26 — Round four presented (same artifact URL): the generated cast is fully retired; the BRAND characters (char-lone/pair/group) are back in hero + door as clean cutouts (Flux Kontext bg-removal + ISNet semantic matting + capped enclosed fill — commit 44988e9). Awaiting verdicts: KF0, KF1, KF2, KF4, KF6.

- 2026-07-25 — HiggsField cast generated (controller-driven via official CLI on founder account, 11 generations, 5 selected), processed to feathered alpha cutouts (flood-fill alpha floor after trim() proved unable to clear headroom/gutters), integrated into hero + door (commits f372f53, f93bf7c). Round three presented: KF0/KF6 with cast + all open round-two verdicts collected in one ask.

- 2026-07-24 — Round two presented (same artifact URL): Option A copy live everywhere (commit 746d9d6); KF2 door anatomy (c5a84ca); KF4 identity-in-the-light (570138a); KF6 typed-fill bug CONFIRMED and fixed with 4-level proofs (ad99872). Awaiting round-two verdicts + HiggsField assets for KF0/KF5/KF6-figures.

- 2026-07-23 — Founder verdicts: KF3 approved (soft), KF5 semi-approved, KF0/1/2/4/6 rework. Copy reopened for hero/math/shares (new drafts pending founder sign-off). Figure assets to be regenerated via HiggsField (resolves the KF6 asset question: new assets). Tasks 14+ remain BLOCKED.

- 2026-07-21 — Gallery assembled at commit 7a25482; presented to the founder. Awaiting scene-by-scene verdicts.

## Checkpoint C — final whole-film pass (2026-07-26)

Branch `rebuild/threshold-ledger` at commit `d750756` (fix(ship): final-review
wave — tier-0 restore guard, engine teardown, pot-mobile clearance, budget
hard-fail, boundary warn) — the reviewed code state; this evidence (frames +
this section) is committed on top of it.

| gate | result |
| --- | --- |
| `npm run check` | build ✓ (`✓ built in 803ms`) / typecheck ✓ (silent) / vitest 19 test files, 199 tests, 0 failures (`Test Files 19 passed (19)`, `Tests 199 passed (199)`) / html-validate ✓ (silent on both `dist/index.html` and `dist/privacy.html`) — overall exit 0 |
| `npx playwright test` | 28 passed, 0 failed, 0 flaky (`28 passed (53.2s)`) — film 6 · fallbacks 3 · waitlist 5 · visual 14 = 28 (the brief's `27 passed` figure predates Task 24's two added film tests and the fix wave's one more; this run's real count is 28) |
| bundle budget | `total: 151300 gz bytes of 307200 budget (49.3%)` — matches Task 25's recorded `151136 gz bytes … (49.2%)` within noise (+164 bytes) |
| scrub telemetry | `scrub: 227 frames over 8000 ms — p50 33.3 ms · p95 50.0 ms · max 66.7 ms` / `OK: p95 50.0 ms <= 120 ms.` |
| final frames | `frames/final/` — 50 PNGs, hero/shares/door in both viewports |
| motion review | `motion-review.md` — all verdict cells filled, open loop-backs: none (the one loop-back the review opened — Task 4's math-overture route fix — was fixed and re-verdicted PASS within Task 23 itself; see motion-review.md's Loop-backs section) |

### Founder verdict (2026-07-27)

**REWORK — whole-film.** Founder, verbatim: "I don't like the result, it is not
smooth and it feels off." No scene-by-scene verdicts were given — the rejection
is of the overall motion feel, not a specific frame. Session closed at the
founder's request; rework to be taken up in a fresh session (see
`docs/superpowers/plans/2026-07-27-relight-handover-checkpoint-c.md`).

| scene | verdict | notes |
| --- | --- | --- |
| S0 hero | — | no per-scene verdict given |
| S1 math | — | no per-scene verdict given |
| S2 pot | — | no per-scene verdict given |
| S3 vote | — | no per-scene verdict given |
| S4 shares | — | no per-scene verdict given |
| S5 payday | — | no per-scene verdict given |
| S6 door | — | no per-scene verdict given |
| whole-film motion feel | **REWORK** | "not smooth … feels off" — diagnosis is the next session's first job (see handover) |

The two assent items presented at this checkpoint (transitions boundary
`console.warn` plan deviation; meta/share-card copy options) remain
**unanswered** — re-ask when the rework returns for verdict.

## v3 — Night Crossing gates

### Gate G1 — world parity (2026-07-28)
Verdict: APPROVED (founder verbatim: "G1 approved").
Evidence: production build at cacf1f6, live preview :4174, comparison set g1-0p{0,5,62,8,97}.png vs prototype frames 01-03 (companion gate-g1.html).
Flag-items presented without objection (treated accepted, revisitable): legibility vignette; pre-live badge dim .75 (AA); footer ships without TERMS link pending founder content; hero ink-settle once per session.

## G2 — Cast in the world (per-figure verdicts, spec §8.2)

Frames: `frames/night-crossing-g2/g2-*.png` (stops 0.15/0.3/0.42/0.55/0.72,
production build e30267a) + live LAN preview.
Law: figures that read as pasted fail the gate. Verdicts are PER FIGURE.

Implementer self-check (spec §8.1 — nothing reaches the founder unexamined),
zoomed crops on every figure's feet/contact region, both at normal exposure
and brightened to confirm the mechanism (not just eyeballed at a glance):

| Figure | Position (world) | Self-check (feet contact / halo edges / reflection) | Founder verdict |
|---|---|---|---|
| fig-pair | (-3.2, 0, -6) | Halo: clean at 3-5x zoom, no rectangular ghost/bright fringe. Feet: legs run down to the dark floor; a faint wavy reflection (matching leg shapes) is visible beneath at normal exposure, confirmed unmistakably present when brightened — grounded, not floating. Orientation: 3/4 view facing the path, never edge-on. Watch item: the black radial "pool" decal is essentially invisible against the near-black pre-crossing floor (black-on-black); the reflection decal is doing the actual visible grounding work. | PENDING |
| fig-lone | (2.8, 0, -9.5) | Halo: clean at 5x zoom (`halo-lone-head` crop), smooth alpha falloff, no bounded-plane artifact. Feet: reflection streak clearly visible at normal exposure immediately below/behind the feet, fading with distance — the clearest "water remembering the figure" read of the three. Orientation: seen from behind at some flight stops (camera has passed him, facing back toward the approach) — a valid full view, not edge-on. | PENDING |
| fig-group | (-2.5, 0, -12) | Halo: clean, no fringe/ghost (`halo-group-full` crop). Feet: same wavy-reflection grounding cue as fig-pair, subtle but present at normal exposure. Partial clipping at the frame's left edge at later stops (0.55/0.72) is normal FOV framing of the single wide plane, not a defect. Same pool-contrast watch item as fig-pair. | PENDING |

Note on stop 0.72: at prog ~0.72 the crossing wash is at/near its peak
(calibrated in Task 5's carry-forward: wash peaks ~prog 0.71), so the frame
is a near-white wash with no figures legible — expected/by-design, not
diagnostic for this gate. Figure QA judgment rests on stops 0.15/0.3/0.42/0.55.

AMENDED (G2 QA round 3, 2026-07-30): the "by-design near-white 0.72" doctrine
is retired. QA killed the settled 0.72 whiteout; attribution shots proved it
was the full-frustum portal face + wide wash sigma (the cast backglows
contribute zero pixels there — figures sit behind the camera). The door now
YIELDS its presence on approach (face alpha + hushed halo, flight/portal
round-3 laws) and the wash hugs the plane (sigma 0.24), so settled 0.72 reads
as deep night with a soft halo whisper, and the 0.92 flash lives only at the
crossing itself (~prog 0.74). Settled captures need converged-lerp polling —
fixed 4s waits under-settle on SwiftShader (g2b/g2c stop labels lag true prog).

Question to ask, per figure: "does this figure stand in the night, or does
it read as pasted?"

### Gate G2 — cast in the world (2026-07-28)
Verdict: REWORK, all three figures (founder verbatim: "all failed. the images look so bad, unlike the original key arts.")
Diagnosis opened: texture fidelity vs source art — suspects: ACES tone mapping regrading texture colors (v2 film figures were never tone-mapped), source cutout resolution, texture filtering.

Gate G2 round 2 verdict (founder verbatim): "it has nothing to do with the tone-mapping or atmospheric fog, the issue is from the images themselves, the characters are completely different from the key arts. return the previous version, it was better, then let's work on fixing/building characters with HiggsField MCP to fit the website and our original art style better."
Actions: 3f9f1d7 reverted (previous rendering restored); character assets to be rebuilt via the sanctioned Higgsfield pipeline (Soul IDs + archetype canon) with founder in the loop.

### Gate G2 — cast in the world, round 3 (2026-07-30)
Verdict: APPROVED (founder verbatim: "G2 approved").
The cast that passed: six solo HiggsField generations under the canon style law
(Hero/Heroine = sole style masters) — Walker (f0e92037), Connector (42558b60,
necklace removed per founder), Operator (2128ab41), Strategist (e086c6dc),
Anchor (8d8a5ff4, hand repaired), Visionary (b39fc298) — matted via the
luminance-gated isnet pipeline and staged black-on-glow with authored
per-colorway backlight pools (commit 0287469, "the light is us").
Founder-selected at every round; controller eyes-on preceded the gate.
Flag disclosed and accepted: operator heel seam is in the approved source take.
Captures: shots/g2c (stops 0.15/0.3/0.42/0.55/0.72), all passed adversarial QA
+ controller eyes.
