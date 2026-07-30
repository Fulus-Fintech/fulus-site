#!/usr/bin/env node
// tools/process_figures.mjs — brand-figure cutout processing.
//
// Sources: assets/images/cast-src/matted/*-matted.png — ISNet mattes
// (tools/isnet_matte.mjs) of the six founder-approved canon solo takes.
// Each ORIGINAL source is a full 768x1376 scene: black silhouette figure
// backlit by a glowing portal panel, with fog and a wet reflective floor.
// The matte keeps the figure body (solid black interior + thin rim-light
// edges) and drops the portal, fog, and the floor reflection under the
// feet; this script does the geometry/webp pass on that matte.
//
// Segmentation (the graveyard of prior strategies lives in .superpowers/
// sdd/figures-report.md): every per-pixel heuristic — luminance flood
// fill, morphological closing, background-level thresholding — fails on
// this art, because the figures are dark bodies with ONE-SIDED thin rims
// plus soft glow halos on near-black backgrounds: luminance cannot tell
// an unlit limb edge from background, and glow gradients read brighter
// than both. The working answer is SEMANTIC matting: @imgly/
// background-removal-node (ISNet ONNX, local/offline) segments the
// figure SHAPES regardless of internal darkness. Verified by
// compositing the result over a bright teal backdrop: solid bodies,
// intact rims, genuine gaps transparent. A modest ALPHA_GAIN solidifies
// interior regions ISNet leaves semi-transparent on the faintest figure
// while leaving its soft edges feathered.
//
// MATTE REFINEMENT ROUND 1 (adversarial QA of the teal composites found
// systematic residue classes; all fixed deterministically here, in the
// sharp step, so the slow ISNet pass never re-runs):
//   - DARK-PIXEL RESCUE: ISNet erodes thin floor-contact structures
//     (stiletto heel spikes) to ghosts because they blend with floor
//     reflections. In the source the spikes are near-black (lum < 32)
//     against a floor that never drops that dark next to them (>= 43),
//     so narrow TALL src-dark components touching the solid body inside
//     the floor zone are restored to near-opaque with source RGB.
//     Measured: visionary right spike, connector right spike, strategist
//     left heel edge. Wide-short dark smears (contact shadows) share the
//     darkness but not the shape — the width/height gates exclude them.
//   - FLOOR-SHADOW TRIM: everything below the lowest near-opaque row is
//     dropped, and inside the bottom band semi-transparent pixels that
//     do not hug the solid body (Chebyshev distance > 2) are dropped —
//     kills contact-shadow smears, heel-tip reflections and arch-gap
//     haze while keeping a <=2px contact feather under the soles.
//   - HAZE KILL: semi-opaque portal-glow pockets in silhouette notches
//     (neck notch, trouser-hem gap) are BRIGHT (lum >= 90) unlike any
//     genuine unlit edge; bright semi pixels farther than 3px from the
//     solid body are cleared. Thin rim-light edges live within 3px of
//     the body and are untouched.
//   - GHOST CULL: leftover connected components that contain no
//     near-opaque pixel at all (floating shadow/fog wisps) are cleared.
//   - POCKET FILL: tiny (<=150px) fully-enclosed sub-opaque pockets
//     inside the near-opaque body (alpha pinholes in the shoes) are
//     solidified regardless of brightness — at that size they are matte
//     artifacts, never genuine see-throughs (the real windows measure
//     694-2310px). The pre-existing enclosed-interior fill now skips the
//     floor zone, where "enclosure" is usually a shadow smear sealing a
//     genuine arch gap (that skip is what un-fills the strategist arch).
//
// MATTE REFINEMENT ROUND 2 (adversarial QA of the round-1 composites):
//   - DENSE floor bar: round 1 used alpha>=240 as the in-band "true body"
//     core, but the anchor's densest contact shadow reaches 235-238
//     post-gain (pre-gain ~183), which made shadow rows core, dragged the
//     floor line down, and let a ragged 10-40% smear survive under both
//     shoes. Measured across all six mattes: genuine soles/heels are
//     >=245 post-gain (pre-gain >=197) and below the last >=245 row NO
//     pixel exceeds 238 — so the floor reference line and the in-band
//     core both move to DENSE_A=245, the keep halo tightens to 1px, and
//     everything below the last dense row is dropped.
//   - BAKED-GLOW KILL: ISNet baked a patch of portal glow at FULL alpha
//     into the connector's thumb-finger gap (src lum 90-220, cyan). The
//     round-1 haze kill only handled semi pixels (a < 217), so it
//     survived. Genuine figure pixels are near-black; genuine rim light
//     is bright but hugs the dark silhouette within ~2px. So: bright
//     (src lum >= 90) pixels of ANY alpha farther than 2px from the
//     eroded dark body core are background glow and are cleared.
//   - DARK-FRINGE KILL: dark (src lum < 90) sub-dense (a < 245) pixels
//     farther than 2px from the eroded solid core are blur/shadow, not
//     edge feather, and are cleared; the 1-2px feather adjacent to the
//     body survives, bright rim light is exempt.
//   - BRIGHT-SEMI REMAP: the anchor's shoulder tops carried a glow-bloom
//     tail — bright semi pixels ramping 9-10px along the shallow edge
//     while staying 1-3px from the body vertically, out of reach of any
//     proximity rule that spares rim light. Smoothstep on bright semi
//     alpha (kill < 0.45, keep >= 0.85) shortens every bloom tail while
//     the near-solid rim feather keeps partial alpha; dark feather is
//     untouched.
//   - Pocket-fill guard: bright pockets (mean src lum >= 90) only refill
//     inside the floor zone (shoe-glint pinholes); above it a bright
//     enclosed pocket is portal show-through (e.g. the cleared thumb
//     gap) and must stay transparent.
//
// MATTE REFINEMENT ROUND 3 (adversarial QA found DAMAGE the round-1/2
// passes themselves did to thin near-black structures; acceptance was
// recalibrated — attached soft glow fringes along silhouette edges are
// the ART, only detached blobs / rectangular texture edges are defects,
// and faint floor-line shadow is tolerable):
//   - ANATOMY PROTECTION: the in-band floor trim and the dark-fringe
//     kill were eroding / severing stiletto heel shafts (visionary left
//     heel cut clean through, right heel thinned to a 1px thread,
//     connector toe sole undercut, operator shoe notch edges hardened).
//     Heel shafts, soles and toe tips are near-black in the SOURCE
//     (lum < 60) — but so is the wet-floor reflection, so darkness alone
//     cannot gate a floor pass. A dark pixel is protected from the
//     in-band trim only when its own column (+-1px) still has DENSE
//     body at or below it: true for every floor-contact structure
//     (heels, soles, toes end in a dense rescued tip), false for shadow
//     carpets and reflections, which have nothing dense underneath.
//     The dark-fringe kill (6c) now skips near-black source pixels
//     entirely (measured: genuine defocus fringe is 60-90, shafts <60).
//     No pass fills rectangles or blocks — every kill stays per-pixel.
//   - RESCUE MONOTONE CLAMP: the round-2 "upper-half columns" clamp let
//     the rescue resurrect a 14px-wide zero-alpha shadow anvil across
//     the last rows of the connector's right heel tip. The clamp is now
//     per-row: walking the component top to bottom, a row may only
//     restore pixels in columns within +-1 of the previous row's
//     structure, so a spike can taper or drift but never flare sideways
//     into floor shadow.
//   - INTERIOR SLIVER PROTECTION + FILL: the bright-semi remap (6d) was
//     zeroing bright semi pixels DEEP inside the solid body — filmed
//     highlight lines (operator jacket hem, watch ring) — punching
//     exact-teal slivers through the figure. 6d now only acts within
//     3px of existing transparency (silhouette edge / glow-killed gap),
//     and a sliver-fill pass solidifies sub-opaque non-zero pixels deep
//     inside the body that have near-opaque neighbours within 4px on
//     all four sides. Genuine see-through gaps always carry zero-alpha
//     cores, so they are exempt by the same transparency-proximity test.
//   - THIN-SLIT HOLE FILL: enclosed components that contain fully
//     transparent pixels, measure <= 200px, hug the solid wall within
//     2px everywhere and do not overlap a glow-killed gap are matte
//     pinholes, never genuine windows (the real windows measure 694px+
//     and run deeper than 2px) — filled from the source scene.
//
// Usage: node tools/process_figures.mjs

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// NOTE: no @imgly import here — onnxruntime and libvips segfault when
// loaded in one process on this machine. Run `node tools/isnet_matte.mjs`
// FIRST (writes cast-src/matted/*-matted.png); this script only does
// alpha gain + refinement + geometry + webp with sharp.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(root, 'assets', 'images', 'cast-src');
const OUT_DIR = join(root, 'assets', 'images', 'cast');

// floorY (optional, source-row): ISNet kept the wet-floor reflection under
// two figures (it is dark, high-confidence, and connected to the feet, so
// no alpha threshold separates it). The floor contact line was read off
// ruler-annotated crops of each matte; alpha is zeroed below it with a
// short feather. The other four mattes already end at the feet.
const MAPPING = [
  { src: 'matted/walker-matted.png', orig: 'walker.png', out: 'walker.webp' },
  { src: 'matted/connector-matted.png', orig: 'connector.png', out: 'connector.webp' },
  { src: 'matted/operator-matted.png', orig: 'operator.png', out: 'operator.webp', floorY: 1177 },
  { src: 'matted/strategist-matted.png', orig: 'strategist.png', out: 'strategist.webp', floorY: 1201 },
  { src: 'matted/anchor-matted.png', orig: 'anchor.png', out: 'anchor.webp' },
  { src: 'matted/visionary-matted.png', orig: 'visionary.png', out: 'visionary.webp' },
];

// SURGICAL SOURCE-RESTORE PATCHES (round 1) — per-figure, keyed by `out`.
// Localized hard defects that survive every pipeline-level pass because the
// pixels are absent from the ISNet matte itself. Each patch is a small
// SOURCE-space rectangle; inside it, pixels whose SOURCE luminance is below
// maxLum (near-black figure art) are restored to full alpha with their
// source RGB. Applied immediately after the alpha gain, before the floor
// cut, so the floor line and every refinement pass keep authority over the
// result. Reproducible by construction — never hand-edit a matte.
const PATCHES = {
  'operator.webp': [
    // Right-shoe heel notch, reported in FINAL space at x264-280, y947-963
    // (teal rectangle with a straight vertical edge at x=280 and straight
    // top edge at y=947). Inverse of the crop/resize/pad transform (bbox
    // x274-559/y351-1172, scale 1.1314, pad 35) puts it at SOURCE
    // x476-491, y1157-1171. Measured there in the source take:
    //   - the notch interior is BRIGHT portal-seam glare, rgb(3,206,227)
    //     lum 143-186 — identical to the open floor at the same rows
    //     (rgb(0,203,227)), i.e. the take itself has no dark heel block
    //     under the glare (the LEFT shoe carries a full near-black heel;
    //     the right shoe's hem-to-heel gap shows the glowing seam behind).
    //     Bright glare pixels are NOT restorable as body — baking them in
    //     would freeze portal light into the cutout.
    //   - the near-black art the matte left sub-dense IS restorable: the
    //     heel-back edge column (x490, lum 29-49) and the sole corner
    //     (y1172, x482-485, lum 37-56). The rectangle below covers the
    //     defect with margin and rescues exactly those.
    { x0: 474, y0: 1152, x1: 494, y1: 1172, maxLum: 60 },
  ],
};

const LONG_SIDE = 1000;   // final long side, px
const PAD_PX = 35;        // transparent padding around the alpha bbox
const QUALITY = 82;       // webp quality
const ALPHA_GAIN = 1.3;   // solidifies ISNet's semi-transparent dark
                          // interiors; edges stay feathered (values
                          // already near 0 stay near 0)
const PATCH = 24;         // corner-check sample size on the FINAL output

// refinement constants (all measured on the six mattes — see the
// refinement notes above)
const SOLID_A = 217;      // alpha >= this is "near-opaque body" (0.85)
const ZONE_H = 75;        // floor zone: rows above the last solid row
const RESCUE_SRC_LUM = 32;  // source lum below this = real dark structure
const RESCUE_MIN_H = 12;    // rescued comps are narrow and TALL
const RESCUE_MAX_W = 20;
const RESCUE_MAX_SIZE = 800;
const BAND_H = 55;        // floor-shadow trim band above the last dense row
const DENSE_A = 245;      // "true sole/heel" bar (round 2): genuine soles are
                          // >=245 post-gain, the densest contact shadow
                          // measures 235-238 — and below the last >=245 row
                          // no pixel on any of the six mattes exceeds 238
const BAND_KEEP_DIST = 1; // in-band contact-feather allowance, px
const HAZE_MIN_LUM = 90;  // glow haze is bright; unlit edges are 17-65
const HAZE_KEEP_DIST = 3; // semi rim-light lives within 3px of the body
const GLOW_KEEP_DIST = 2; // baked (near-opaque) rim hugs the dark core <=2px
const FRINGE_KEEP_DIST = 2; // dark edge feather allowance around the body
const CULL_MAX_SIZE = 2000; // never cull anything bigger (safety)
const POCKET_MAX = 150;   // interior pinhole fill cap, px
const PROTECT_LUM = 60;   // src lum below this = near-black figure art
                          // (heel shafts, soles, toe tips); never zeroed
                          // by the in-band trim (when dense body remains
                          // below in the column) or the dark-fringe kill
const DARK_KEEP_DIST = 3; // near-black art also survives the in-band trim
                          // within this distance of dense body (sole/toe
                          // tapers sit 2-3px off the dense core; anything
                          // farther with no dense below is shadow carpet)
const ZERO_NEAR_DIST = 3; // "near transparency" halo for the 6d gate and
                          // the sliver fill (genuine gaps carry a<=8 cores)
const SLIVER_REACH = 4;   // sliver fill: solid wall within this many px
                          // in all four axis directions
const HOLE_MAX = 200;     // thin-slit enclosed hole fill cap, px

function idx(x, y, w) { return y * w + x; }
const lumOf = (buf, q) => 0.2126 * buf[q] + 0.7152 * buf[q + 1] + 0.0722 * buf[q + 2];

// Chebyshev dilation of a 0/1 mask by `r` px (r iterations of 8-neighbour
// growth). Returns a new mask.
function dilate(mask, w, h, r) {
  let cur = Uint8Array.from(mask);
  for (let it = 0; it < r; it++) {
    const next = Uint8Array.from(cur);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y, w);
      if (cur[i]) continue;
      const x0 = x > 0 ? x - 1 : 0, x1 = x < w - 1 ? x + 1 : w - 1;
      const y0 = y > 0 ? y - 1 : 0, y1 = y < h - 1 ? y + 1 : h - 1;
      let hit = 0;
      for (let yy = y0; yy <= y1 && !hit; yy++)
        for (let xx = x0; xx <= x1 && !hit; xx++) if (cur[idx(xx, yy, w)]) hit = 1;
      if (hit) next[i] = 1;
    }
    cur = next;
  }
  return cur;
}

// single-step erosion: a set pixel survives only with >= 5 of its 8
// neighbours set. Strips isolated specks and 1px strands so they cannot
// anchor a keep-halo, while any body >= 2px thick keeps its full outline.
function erode8(mask, w, h) {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(x, y, w);
    if (!mask[i]) continue;
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[idx(nx, ny, w)]) c++;
    }
    if (c >= 5) out[i] = 1;
  }
  return out;
}

function solidMask(rgba, n) {
  const m = new Uint8Array(n);
  for (let i = 0; i < n; i++) m[i] = rgba[i * 4 + 3] >= SOLID_A ? 1 : 0;
  return m;
}

function lastSolidRowOf(solid, w, h) {
  for (let y = h - 1; y >= 0; y--)
    for (let x = 0; x < w; x++) if (solid[idx(x, y, w)]) return y;
  return -1;
}

async function processOne({ src, orig, out, floorY }) {
  const srcPath = join(SRC_DIR, src);

  // 1. load the pre-matted PNG (from tools/isnet_matte.mjs) + the original
  //    scene (source RGB drives the dark-pixel rescue)
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;
  const srcRgb = (await sharp(join(SRC_DIR, orig)).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })).data; // RGB, same geometry

  // 2. alpha gain
  const rgba = Buffer.from(data); // RGBA
  for (let i = 0, q = 3; i < n; i++, q += 4) {
    rgba[q] = Math.min(255, Math.round(rgba[q] * ALPHA_GAIN));
  }

  // 2a. surgical source-restore patches (see PATCHES): inside each figure's
  //     patch rectangles, near-black SOURCE pixels the matte dropped or left
  //     sub-dense become fully opaque with their source RGB. Runs before the
  //     floor cut and the refinement passes so both keep authority.
  let patched = 0;
  for (const p of PATCHES[out] ?? []) {
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const i = idx(x, y, w), q = i * 4, sq = i * 3;
      if (lumOf(srcRgb, sq) >= p.maxLum) continue;
      if (rgba[q + 3] === 255) continue;
      rgba[q] = srcRgb[sq]; rgba[q + 1] = srcRgb[sq + 1]; rgba[q + 2] = srcRgb[sq + 2];
      rgba[q + 3] = 255;
      patched++;
    }
  }
  if (patched) console.log(`  patch ${out}: ${patched}px restored`);

  // 2b. floor cut (see MAPPING): drop the wet-floor reflection below the
  //     figure's contact line, feathering the last few rows.
  if (floorY != null) {
    const FEATHER = 4;
    for (let y = floorY - FEATHER; y < h; y++) {
      const k = y < floorY ? (floorY - y) / (FEATHER + 1) : 0;
      for (let x = 0; x < w; x++) {
        const q = idx(x, y, w) * 4 + 3;
        rgba[q] = Math.round(rgba[q] * k);
      }
    }
  }

  // floor zone reference line: the lowest near-opaque row at this point.
  // (Recomputed after the rescue for the trim; the two agree because the
  // rescue never writes below this line.)
  let solid = solidMask(rgba, n);
  const lastSolidRow0 = lastSolidRowOf(solid, w, h);
  const zoneTop = lastSolidRow0 - ZONE_H;

  // 3. enclosed-interior fill: ISNet traces the RIM outlines confidently
  //    but leaves some dark body interiors semi/fully transparent. Those
  //    interiors are ENCLOSED by the rim alpha, while genuine gaps
  //    (between legs, between people) always open to the border — so:
  //    binarize, border-flood the transparent side, and solidify whatever
  //    the flood can't reach. (Small enclosed loops like a hand-on-hip
  //    arm triangle fill too — solid dark inside an arm bend reads
  //    correctly for silhouette art; hollow chests do not.)
  const solidLoose = new Uint8Array(n);      // 1 = alpha above floor
  for (let i = 0; i < n; i++) solidLoose[i] = rgba[i * 4 + 3] > 24 ? 1 : 0;
  const reached = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  const push = (i) => { if (!solidLoose[i] && !reached[i]) { reached[i] = 1; queue[qt++] = i; } };
  for (let x = 0; x < w; x++) { push(idx(x, 0, w)); push(idx(x, h - 1, w)); }
  for (let y = 0; y < h; y++) { push(idx(0, y, w)); push(idx(w - 1, y, w)); }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (y > 0) push(i - w);
    if (y < h - 1) push(i + w);
  }
  // Fill only SMALL enclosed regions (pinholes, arm loops). Large enclosed
  // windows — the space between two people bridged by a handshake, a wide
  // trouser gap closed at the hem — are genuine see-through in the art and
  // must stay transparent, or they render as slabs.
  //
  // AND only DARK ones. In the night-crossing scenes the figure often
  // encloses a loop that frames the BRIGHT portal panel (hand-on-hip
  // triangle, arm-over-tablet diamond): ISNet correctly leaves those
  // transparent, and force-filling them paints a grey portal slab into a
  // genuine see-through. Measured on the six mattes: portal show-through
  // regions have mean luminance 108-119+, unlit body pinholes 60-65 —
  // MAX_FILL_LUM=90 splits them cleanly. Dark enclosed interiors (unlit
  // body left semi-transparent by ISNet) still solidify as before.
  //
  // AND never in the floor zone: down there "enclosed" is almost always a
  // contact-shadow smear sealing the bottom of a genuine heel-arch gap
  // (measured on strategist: three dark cores inside the arch were being
  // solidified into a blue-grey blob). The trim opens those gaps; real
  // in-zone pinholes are handled by the POCKET FILL afterwards.
  const MAX_FILL_FRAC = 0.02;
  const MAX_FILL_LUM = 90;
  const maxFill = Math.round(n * MAX_FILL_FRAC);
  const label = new Int32Array(n); // 0 = unlabeled
  let filled = 0, figCount = 0, nextLabel = 0;
  const comp = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (solidLoose[s] || reached[s] || label[s]) continue;
    nextLabel++;
    let ch = 0, ct = 0, sumLum = 0, maxCY = 0;
    comp[ct++] = s; label[s] = nextLabel;
    while (ch < ct) {
      const i = comp[ch++];
      const x = i % w, y = (i / w) | 0;
      if (y > maxCY) maxCY = y;
      sumLum += lumOf(rgba, i * 4);
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && !solidLoose[j] && !reached[j] && !label[j]) { label[j] = nextLabel; comp[ct++] = j; }
      }
    }
    if (ct <= maxFill && sumLum / ct < MAX_FILL_LUM && maxCY <= zoneTop) {
      for (let k = 0; k < ct; k++) {
        const q = comp[k] * 4 + 3;
        if (rgba[q] < 235) { rgba[q] = 235; filled++; }
      }
    }
  }

  // 4. DARK-PIXEL RESCUE (floor zone): restore eroded thin dark structures
  //    (stiletto heel spikes). Candidates: sub-opaque pixels in the floor
  //    zone whose SOURCE luminance is near-black. 8-connected candidate
  //    components qualify when they touch the near-opaque body and are
  //    narrow + tall (contact shadows are wide + short). Qualifying pixels
  //    become near-opaque with their source RGB (faithful to the scene).
  let rescued = 0;
  {
    const cand = new Uint8Array(n);
    for (let y = Math.max(0, zoneTop); y <= lastSolidRow0; y++) for (let x = 0; x < w; x++) {
      const i = idx(x, y, w);
      if (rgba[i * 4 + 3] >= SOLID_A) continue;
      if (lumOf(srcRgb, i * 3) < RESCUE_SRC_LUM) cand[i] = 1;
    }
    const seen = new Uint8Array(n);
    const stack = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (!cand[s] || seen[s]) continue;
      let sp = 0, ct = 0, mnX = w, mxX = 0, mnY = h, mxY = 0, touches = 0;
      stack[sp++] = s; seen[s] = 1;
      while (sp) {
        const i = stack[--sp];
        const x = i % w, y = (i / w) | 0;
        comp[ct++] = i;
        if (x < mnX) mnX = x; if (x > mxX) mxX = x;
        if (y < mnY) mnY = y; if (y > mxY) mxY = y;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = idx(nx, ny, w);
          if (solid[j]) touches = 1;
          if (cand[j] && !seen[j]) { seen[j] = 1; stack[sp++] = j; }
        }
      }
      const cw = mxX - mnX + 1, chh = mxY - mnY + 1;
      if (touches && ct <= RESCUE_MAX_SIZE && chh >= RESCUE_MIN_H &&
          cw <= RESCUE_MAX_W && chh >= 1.2 * cw) {
        // per-row monotone continuity clamp (round 3): a heel spike is
        // column-continuous top to bottom, while its contact shadow flares
        // SIDEWAYS at the floor. The round-2 "upper-half columns" clamp let
        // a wide zero-alpha shadow anvil ride back in on the last rows of
        // the connector's right heel, so the clamp is now per-row: a row
        // may only restore pixels in columns within +-1 of the previous
        // row's structure (restored candidates, or pixels of this
        // component's bbox that are already near-opaque). The restored
        // shape can taper or drift 1px/row but never jump sideways into
        // the flare; unrestored flare pixels keep their near-zero alpha
        // and the floor trim still owns them.
        const rows = new Map(); // y -> comp pixel indices on that row
        for (let k = 0; k < ct; k++) {
          const i = comp[k], y = (i / w) | 0;
          let arr = rows.get(y);
          if (!arr) rows.set(y, arr = []);
          arr.push(i);
        }
        let support = null; // columns with structure on the previous row
        let kept = 0;
        for (let y = mnY; y <= mxY; y++) {
          const next = new Uint8Array(w);
          for (let x = mnX; x <= mxX; x++)
            if (solid[idx(x, y, w)]) next[x] = 1; // pre-existing body
          for (const i of rows.get(y) ?? []) {
            const x = i % w;
            if (support && !support[x] && !(x > 0 && support[x - 1]) &&
                !(x < w - 1 && support[x + 1])) continue;
            const q = i * 4, sq = i * 3;
            rgba[q] = srcRgb[sq]; rgba[q + 1] = srcRgb[sq + 1]; rgba[q + 2] = srcRgb[sq + 2];
            rgba[q + 3] = 250;
            next[x] = 1;
            kept++;
          }
          support = next;
        }
        rescued += kept;
        console.log(`  rescue ${out}: ${kept}/${ct}px x${mnX}-${mxX} y${mnY}-${mxY}`);
      }
    }
  }

  // masks for the trim pass (post-rescue body). The floor reference line
  // and the in-band core both use the DENSE bar: the densest contact
  // shadow measures 235-238 post-gain, genuine soles/heels >= 245, so a
  // 240 bar (round 1) let shadow qualify as body under the anchor.
  const dense = new Uint8Array(n);
  for (let i = 0; i < n; i++) dense[i] = rgba[i * 4 + 3] >= DENSE_A ? 1 : 0;
  let lastDenseRow = -1;
  for (let y = h - 1; y >= 0 && lastDenseRow < 0; y--)
    for (let x = 0; x < w; x++) if (dense[idx(x, y, w)]) { lastDenseRow = y; break; }
  const nearDense = dilate(dense, w, h, BAND_KEEP_DIST);

  // ANATOMY PROTECTION (round 3): near-black SOURCE pixels are figure art
  // (heel shafts, soles, toe tips) — but the wet-floor reflection is also
  // near-black, so darkness alone cannot gate a floor pass. A dark pixel
  // is protected only while its own column (+-1px) still has DENSE body
  // at or below it: true for floor-contact structures (they end in a
  // dense sole / rescued tip), false for shadow carpets and reflections,
  // which have nothing dense underneath.
  const srcDark = new Uint8Array(n);
  for (let i = 0; i < n; i++) srcDark[i] = lumOf(srcRgb, i * 3) < PROTECT_LUM ? 1 : 0;
  const denseBelow = new Uint8Array(n); // column has dense at this row or lower
  for (let x = 0; x < w; x++) {
    let seenD = 0;
    for (let y = h - 1; y >= 0; y--) {
      const i = idx(x, y, w);
      if (dense[i]) seenD = 1;
      denseBelow[i] = seenD;
    }
  }
  // ...and a sole/toe TAPER has nothing dense below its own bottom edge,
  // so dark pixels also survive within DARK_KEEP_DIST of the dense core
  // (a 2-3px dark contact feather is the tolerated floor-line look;
  // shadow carpets run 8+ rows down and stay outside both rules).
  const nearDenseDark = dilate(dense, w, h, DARK_KEEP_DIST);
  const darkArt = (i, x) => srcDark[i] &&
    (nearDenseDark[i] || denseBelow[i] ||
     (x > 0 && denseBelow[i - 1]) || (x < w - 1 && denseBelow[i + 1]));

  // 5. FLOOR-SHADOW TRIM: nothing lives below the lowest dense row
  //    (heel-tip reflections, under-sole shadow tails), and inside the
  //    bottom band sub-dense pixels that do not hug the dense body are
  //    contact-shadow / arch-haze remnants, not figure edges. Near-black
  //    art pixels with dense body below them in the column are anatomy
  //    (heel shafts / soles / toes) and are never zeroed.
  let trimmed = 0;
  for (let y = Math.max(0, lastDenseRow - BAND_H); y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(x, y, w), q = i * 4 + 3;
    if (rgba[q] === 0) continue;
    if (y > lastDenseRow) { rgba[q] = 0; trimmed++; continue; }
    if (rgba[q] < DENSE_A && !nearDense[i] && !darkArt(i, x)) { rgba[q] = 0; trimmed++; }
  }

  // 5b. NICK HEAL: the stricter in-band bar can bite small notches into a
  //     sole edge where dense shadow chunks alternate with sub-core pixels.
  //     A sub-solid pixel with near-opaque body within 2px to the LEFT,
  //     RIGHT and ABOVE is a downward-open slit in the sole, not a genuine
  //     gap (arch mouths have open space above) — refill it from the
  //     source scene. Self-limiting: slits wider than ~4px keep their
  //     centres and stay open.
  let healed = 0;
  for (let it = 0; it < 2; it++) {
    for (let y = Math.max(2, lastDenseRow - BAND_H); y <= Math.min(h - 1, lastDenseRow); y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = idx(x, y, w);
        if (rgba[i * 4 + 3] >= SOLID_A) continue;
        const S = (xx, yy) => rgba[idx(xx, yy, w) * 4 + 3] >= SOLID_A;
        const left = S(x - 1, y) || S(x - 2, y);
        const right = S(x + 1, y) || S(x + 2, y);
        const up = S(x, y - 1) || S(x, y - 2);
        if (left && right && up) {
          const q = i * 4, sq = i * 3;
          rgba[q] = srcRgb[sq]; rgba[q + 1] = srcRgb[sq + 1]; rgba[q + 2] = srcRgb[sq + 2];
          rgba[q + 3] = 245;
          healed++;
        }
      }
    }
  }

  // 6a. BAKED-GLOW KILL: portal glow baked at NEAR-OPAQUE alpha into a
  //     silhouette gap (connector thumb-finger gap: src lum 90-220 cyan
  //     at a255). Genuine near-opaque bright pixels are rim light, and
  //     rim hugs the DARK body core within ~2px; a bright near-opaque
  //     pixel farther out is background glow. The dark core is eroded so
  //     an isolated dark speck inside a glow pocket cannot shelter it.
  let glowKilled = 0;
  const glowCut = new Uint8Array(n); // glow-killed gap pixels: these gaps
                                     // must never be refilled (round 3)
  {
    solid = solidMask(rgba, n);
    const darkCore = new Uint8Array(n);
    for (let i = 0; i < n; i++)
      darkCore[i] = solid[i] && lumOf(srcRgb, i * 3) < HAZE_MIN_LUM ? 1 : 0;
    const nearDark = dilate(erode8(darkCore, w, h), w, h, GLOW_KEEP_DIST);
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      if (rgba[q + 3] >= SOLID_A && !nearDark[i] && lumOf(srcRgb, i * 3) >= HAZE_MIN_LUM) {
        rgba[q + 3] = 0; glowCut[i] = 1; glowKilled++;
      }
    }
  }

  // 6b. HAZE KILL: bright semi-opaque fog/glow pockets in open notches.
  //     Genuine unlit edges measure lum 17-65; portal haze measures
  //     135-190. Rim light is bright too but hugs the body — the 3px halo
  //     keeps it. (Solid is recomputed after 6a so a dead glow blob no
  //     longer anchors its own semi fringe.)
  let hazed = 0;
  solid = solidMask(rgba, n);
  const near3 = dilate(solid, w, h, HAZE_KEEP_DIST);
  for (let i = 0; i < n; i++) {
    const q = i * 4;
    const a = rgba[q + 3];
    if (a > 8 && a < SOLID_A && !near3[i] && lumOf(srcRgb, i * 3) >= HAZE_MIN_LUM) {
      rgba[q + 3] = 0; hazed++;
    }
  }

  // 6c. DARK-FRINGE KILL: dark defocus fringe off the silhouette (anchor
  //     shoulder tops: dark semi pixels ramping 9-10px where the spec is
  //     1-3px). A dark sub-dense pixel farther than 2px from the eroded
  //     solid core is blur/shadow, not edge feather; the 1-2px feather
  //     adjacent to the body survives and bright rim light is exempt.
  //     (Sole contact feather survives too: it sits within 1px of the
  //     dense sole, whose outline the erosion preserves.) Round 3: skips
  //     near-black source pixels — erode8 strips thin heel shafts from the
  //     core, so this pass was severing them; genuine defocus fringe
  //     measures lum 60-90, shafts and soles < 60.
  let fringed = 0;
  {
    const nearCore2 = dilate(erode8(solid, w, h), w, h, FRINGE_KEEP_DIST);
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      const a = rgba[q + 3];
      if (a <= 8 || a >= DENSE_A || nearCore2[i]) continue;
      const l = lumOf(srcRgb, i * 3);
      if (l >= PROTECT_LUM && l < HAZE_MIN_LUM) {
        rgba[q + 3] = 0; fringed++;
      }
    }
  }

  // 6d. BRIGHT-SEMI REMAP: glow-bloom tails ride the silhouette within the
  //     distance halos (the anchor's shoulder tops: a shallow edge whose
  //     bright semi tail stretches 9-10px horizontally while staying 1-3px
  //     from the body vertically, so no proximity rule can catch it without
  //     eating rim light everywhere). Smoothstep the BRIGHT semi alpha:
  //     kill below 0.45, keep 0.85+, ease between — the faint bloom tail
  //     dies, the near-solid rim feather stays partial, dark feather is
  //     untouched. Also clears the low-alpha glow residue that 6a's halo
  //     leaves along the walls of a glow-killed gap. Round 3: only acts
  //     within ZERO_NEAR_DIST of existing transparency — bloom tails ride
  //     the silhouette edge and glow-gap walls hug their zeroed core, but
  //     bright semi pixels DEEP inside the solid body are filmed highlight
  //     lines (operator jacket hem / watch ring), and remapping them was
  //     punching exact-teal slivers through the figure.
  let remapped = 0;
  {
    const LO = 115, HI = SOLID_A; // 0.45 / 0.85
    const zeroM = new Uint8Array(n);
    for (let i = 0; i < n; i++) zeroM[i] = rgba[i * 4 + 3] <= 8 ? 1 : 0;
    const nearZero = dilate(zeroM, w, h, ZERO_NEAR_DIST);
    for (let i = 0; i < n; i++) {
      const q = i * 4;
      const a = rgba[q + 3];
      if (a <= 8 || a >= HI || !nearZero[i] || lumOf(srcRgb, i * 3) < HAZE_MIN_LUM) continue;
      const t = (a - LO) / (HI - LO);
      const a2 = t <= 0 ? 0 : Math.round(HI * t * t * (3 - 2 * t));
      if (a2 !== a) { rgba[q + 3] = a2; remapped++; }
    }
  }

  // 6e. SLIVER FILL (round 3): sub-opaque non-zero pixels DEEP inside the
  //     body (farther than ZERO_NEAR_DIST from any transparency) with a
  //     near-opaque wall within SLIVER_REACH px in all four axis
  //     directions are interior matte slivers over filmed highlights —
  //     solidified from their own matte RGB. Genuine see-through gaps
  //     always carry zero-alpha cores (ISNet zeroes real background
  //     confidently), so the transparency-proximity test exempts them.
  //     A sliver LINE only has walls across its own axis (the operator's
  //     watch-ring sliver is a 1x11px vertical line: solid left+right
  //     within 1px, but 5+px from any solid wall above/below its middle),
  //     so one fully-walled axis (L+R or U+D) qualifies — still interior
  //     only, still fill-only.
  let slivered = 0;
  {
    const zeroM = new Uint8Array(n);
    for (let i = 0; i < n; i++) zeroM[i] = rgba[i * 4 + 3] <= 8 ? 1 : 0;
    const nearZero = dilate(zeroM, w, h, ZERO_NEAR_DIST);
    for (let it = 0; it < 3; it++) {
      const fills = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = idx(x, y, w);
        const a = rgba[i * 4 + 3];
        if (a <= 8 || a >= SOLID_A || nearZero[i]) continue;
        const S = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h &&
          rgba[idx(xx, yy, w) * 4 + 3] >= SOLID_A;
        let L = 0, R = 0, U = 0, D = 0;
        for (let d = 1; d <= SLIVER_REACH; d++) {
          if (!L && S(x - d, y)) L = 1;
          if (!R && S(x + d, y)) R = 1;
          if (!U && S(x, y - d)) U = 1;
          if (!D && S(x, y + d)) D = 1;
        }
        if ((L && R) || (U && D)) fills.push(i);
      }
      if (!fills.length) break;
      for (const i of fills) rgba[i * 4 + 3] = 250;
      slivered += fills.length;
    }
  }

  // 7. GHOST CULL: any remaining connected alpha component with no
  //    near-opaque pixel at all is a floating shadow/fog wisp.
  let culled = 0;
  {
    const seen = new Uint8Array(n);
    const stack = new Int32Array(n);
    for (let s = 0; s < n; s++) {
      if (seen[s] || rgba[s * 4 + 3] <= 8) continue;
      let sp = 0, ct = 0, hasSolid = 0;
      stack[sp++] = s; seen[s] = 1;
      while (sp) {
        const i = stack[--sp];
        const x = i % w, y = (i / w) | 0;
        comp[ct++] = i;
        if (rgba[i * 4 + 3] >= SOLID_A) hasSolid = 1;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = idx(nx, ny, w);
          if (!seen[j] && rgba[j * 4 + 3] > 8) { seen[j] = 1; stack[sp++] = j; }
        }
      }
      if (!hasSolid && ct <= CULL_MAX_SIZE) {
        for (let k = 0; k < ct; k++) rgba[comp[k] * 4 + 3] = 0;
        culled += ct;
      }
    }
  }

  // 8. POCKET FILL: tiny sub-opaque pockets fully enclosed by the
  //    near-opaque body (alpha pinholes punched through the shoes) go
  //    opaque, whatever their brightness — the source RGB there is the
  //    shoe surface (often a glow glint), which is the filmed look.
  let pocketed = 0;
  {
    solid = solidMask(rgba, n);
    const reach2 = new Uint8Array(n);
    qh = 0; qt = 0;
    const push2 = (i) => { if (!solid[i] && !reach2[i]) { reach2[i] = 1; queue[qt++] = i; } };
    for (let x = 0; x < w; x++) { push2(idx(x, 0, w)); push2(idx(x, h - 1, w)); }
    for (let y = 0; y < h; y++) { push2(idx(0, y, w)); push2(idx(w - 1, y, w)); }
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % w, y = (i / w) | 0;
      if (x > 0) push2(i - 1);
      if (x < w - 1) push2(i + 1);
      if (y > 0) push2(i - w);
      if (y < h - 1) push2(i + w);
    }
    const seen = new Uint8Array(n);
    for (let s = 0; s < n; s++) {
      if (solid[s] || reach2[s] || seen[s]) continue;
      let ch = 0, ct = 0, sumLum = 0, maxCY = 0;
      comp[ct++] = s; seen[s] = 1;
      while (ch < ct) {
        const i = comp[ch++];
        const x = i % w, y = (i / w) | 0;
        if (y > maxCY) maxCY = y;
        sumLum += lumOf(srcRgb, i * 3);
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j >= 0 && !solid[j] && !reach2[j] && !seen[j]) { seen[j] = 1; comp[ct++] = j; }
        }
      }
      // bright pockets only refill in the floor zone (shoe-glint pinholes);
      // higher up a bright enclosed pocket is portal show-through (e.g. the
      // glow-killed thumb gap) and must stay open. Dark pockets fill as in
      // round 1.
      //
      // THIN-SLIT HOLE FILL (round 3): an enclosed pocket that contains
      // fully transparent pixels, measures <= HOLE_MAX, hugs the solid
      // wall within 2px everywhere (no pixel deeper than two peels from
      // the near-opaque boundary) and does not overlap a glow-killed gap
      // is a matte pinhole punched through the body, never a genuine
      // window — the real windows measure 694px+ and run far deeper.
      // Zero-alpha pixels take their RGB from the source scene (the matte
      // RGB is unreliable where ISNet zeroed the alpha).
      let slit = 0;
      {
        let zeroCt = 0, cutGap = 0;
        for (let k = 0; k < ct; k++) {
          if (rgba[comp[k] * 4 + 3] <= 8) zeroCt++;
          if (glowCut[comp[k]]) cutGap = 1;
        }
        if (!cutGap && zeroCt > 0 && ct <= HOLE_MAX) {
          const inComp = new Set();
          for (let k = 0; k < ct; k++) inComp.add(comp[k]);
          const dist = new Map();
          let frontier = [];
          for (let k = 0; k < ct; k++) {
            const i = comp[k], x = i % w, y = (i / w) | 0;
            let wall = 0;
            for (let dy = -1; dy <= 1 && !wall; dy++) for (let dx = -1; dx <= 1 && !wall; dx++) {
              if (!dx && !dy) continue;
              if (!inComp.has(idx(x + dx, y + dy, w))) wall = 1;
            }
            if (wall) { dist.set(i, 1); frontier.push(i); }
          }
          let covered = dist.size;
          for (const i of frontier) {
            const x = i % w, y = (i / w) | 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const j = idx(x + dx, y + dy, w);
              if (inComp.has(j) && !dist.has(j)) { dist.set(j, 2); covered++; }
            }
          }
          if (covered === ct) slit = 1;
        }
      }
      if ((ct <= POCKET_MAX && (sumLum / ct < HAZE_MIN_LUM || maxCY > zoneTop)) || slit) {
        for (let k = 0; k < ct; k++) {
          const i = comp[k], q = i * 4;
          if (slit && rgba[q + 3] <= 8) {
            const sq = i * 3;
            rgba[q] = srcRgb[sq]; rgba[q + 1] = srcRgb[sq + 1]; rgba[q + 2] = srcRgb[sq + 2];
          }
          rgba[q + 3] = 255;
        }
        pocketed += ct;
      }
    }
  }

  for (let i = 0; i < n; i++) if (rgba[i * 4 + 3] > 32) figCount++;
  // alpha bbox (alpha > 8)
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (rgba[idx(x, y, w) * 4 + 3] > 8) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error(src + ': empty mask');

  const cropW = maxX - minX + 1, cropH = maxY - minY + 1;
  const scale = (LONG_SIDE - 2 * PAD_PX) / Math.max(cropW, cropH);
  const outW = Math.round(cropW * scale), outH = Math.round(cropH * scale);

  const outPath = join(OUT_DIR, out);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .resize(outW, outH)
    .extend({ top: PAD_PX, bottom: PAD_PX, left: PAD_PX, right: PAD_PX,
              background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: QUALITY, alphaQuality: 90 })
    .toFile(outPath);

  // verify: corners of the FINAL output must be transparent
  const fin = await sharp(outPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const fw = fin.info.width, fh = fin.info.height, fd = fin.data;
  const cornerMean = (x0, y0) => {
    let s = 0;
    for (let y = y0; y < y0 + PATCH; y++) for (let x = x0; x < x0 + PATCH; x++)
      s += fd[(y * fw + x) * 4 + 3];
    return s / (PATCH * PATCH);
  };
  const corners = [
    cornerMean(0, 0), cornerMean(fw - PATCH, 0),
    cornerMean(0, fh - PATCH), cornerMean(fw - PATCH, fh - PATCH),
  ];
  const pass = corners.every(c => c < 8);

  const covPct = (100 * figCount / n).toFixed(1);
  console.log(
    `${out}: ${fw}x${fh}  coverage=${covPct}%  bbox=x${minX}-${maxX},y${minY}-${maxY}  scale=${scale.toFixed(4)}\n` +
    `  refine: patched=${patched} rescued=${rescued} trimmed=${trimmed} healed=${healed} glowKilled=${glowKilled} hazed=${hazed} fringed=${fringed} remapped=${remapped} slivered=${slivered} culled=${culled} pocketed=${pocketed} filled=${filled}\n` +
    `  cornersAlpha=[${corners.map(c => c.toFixed(1)).join(', ')}]  ${pass ? 'PASS' : 'FAIL'}`
  );
  return pass;
}

await mkdir(OUT_DIR, { recursive: true });
let allPass = true;
for (const m of MAPPING) allPass = (await processOne(m)) && allPass;
process.exit(allPass ? 0 : 1);
