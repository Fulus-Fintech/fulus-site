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
// Usage: node tools/process_figures.mjs

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// NOTE: no @imgly import here — onnxruntime and libvips segfault when
// loaded in one process on this machine. Run `node tools/isnet_matte.mjs`
// FIRST (writes cast-src/matted/*-matted.png); this script only does
// alpha gain + geometry + webp with sharp.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(root, 'assets', 'images', 'cast-src');
const OUT_DIR = join(root, 'assets', 'images', 'cast');

// floorY (optional, source-row): ISNet kept the wet-floor reflection under
// two figures (it is dark, high-confidence, and connected to the feet, so
// no alpha threshold separates it). The floor contact line was read off
// ruler-annotated crops of each matte; alpha is zeroed below it with a
// short feather. The other four mattes already end at the feet.
const MAPPING = [
  { src: 'matted/walker-matted.png', out: 'walker.webp' },
  { src: 'matted/connector-matted.png', out: 'connector.webp' },
  { src: 'matted/operator-matted.png', out: 'operator.webp', floorY: 1177 },
  { src: 'matted/strategist-matted.png', out: 'strategist.webp', floorY: 1201 },
  { src: 'matted/anchor-matted.png', out: 'anchor.webp' },
  { src: 'matted/visionary-matted.png', out: 'visionary.webp' },
];

const LONG_SIDE = 1000;   // final long side, px
const PAD_PX = 35;        // transparent padding around the alpha bbox
const QUALITY = 82;       // webp quality
const ALPHA_GAIN = 1.3;   // solidifies ISNet's semi-transparent dark
                          // interiors; edges stay feathered (values
                          // already near 0 stay near 0)
const PATCH = 24;         // corner-check sample size on the FINAL output

function idx(x, y, w) { return y * w + x; }

async function processOne({ src, out, floorY }) {
  const srcPath = join(SRC_DIR, src);

  // 1. load the pre-matted PNG (from tools/isnet_matte.mjs)
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const n = w * h;

  // 2. alpha gain
  const rgba = Buffer.from(data); // RGBA
  for (let i = 0, q = 3; i < n; i++, q += 4) {
    rgba[q] = Math.min(255, Math.round(rgba[q] * ALPHA_GAIN));
  }

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

  // 3. enclosed-interior fill: ISNet traces the RIM outlines confidently
  //    but leaves some dark body interiors semi/fully transparent. Those
  //    interiors are ENCLOSED by the rim alpha, while genuine gaps
  //    (between legs, between people) always open to the border — so:
  //    binarize, border-flood the transparent side, and solidify whatever
  //    the flood can't reach. (Small enclosed loops like a hand-on-hip
  //    arm triangle fill too — solid dark inside an arm bend reads
  //    correctly for silhouette art; hollow chests do not.)
  const solid = new Uint8Array(n);          // 1 = alpha above floor
  for (let i = 0; i < n; i++) solid[i] = rgba[i * 4 + 3] > 24 ? 1 : 0;
  const reached = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  const push = (i) => { if (!solid[i] && !reached[i]) { reached[i] = 1; queue[qt++] = i; } };
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
  const MAX_FILL_FRAC = 0.02;
  const MAX_FILL_LUM = 90;
  const maxFill = Math.round(n * MAX_FILL_FRAC);
  const label = new Int32Array(n); // 0 = unlabeled
  let filled = 0, figCount = 0, nextLabel = 0;
  const comp = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (solid[s] || reached[s] || label[s]) continue;
    nextLabel++;
    let ch = 0, ct = 0, sumLum = 0;
    comp[ct++] = s; label[s] = nextLabel;
    while (ch < ct) {
      const i = comp[ch++];
      const x = i % w, y = (i / w) | 0;
      sumLum += 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2];
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && !solid[j] && !reached[j] && !label[j]) { label[j] = nextLabel; comp[ct++] = j; }
      }
    }
    if (ct <= maxFill && sumLum / ct < MAX_FILL_LUM) {
      for (let k = 0; k < ct; k++) {
        const q = comp[k] * 4 + 3;
        if (rgba[q] < 235) { rgba[q] = 235; filled++; }
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
    `${out}: ${fw}x${fh}  coverage=${covPct}%  ` +
    `cornersAlpha=[${corners.map(c => c.toFixed(1)).join(', ')}]  ${pass ? 'PASS' : 'FAIL'}`
  );
  return pass;
}

await mkdir(OUT_DIR, { recursive: true });
let allPass = true;
for (const m of MAPPING) allPass = (await processOne(m)) && allPass;
process.exit(allPass ? 0 : 1);
