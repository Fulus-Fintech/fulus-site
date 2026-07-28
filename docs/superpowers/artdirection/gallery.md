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
