// tools/make_poster.mjs — poster edition + OG image from a captured approach frame.
//
// Input: a tools/qa_shots.mjs capture of the built site (1440x900) with NO
// rendered copy in frame (see the plan: stop 0 if the harness excludes the
// DOM overlay, else the 0.18 text-free gap). Outputs, into assets/images/:
//   poster-hero.avif   AVIF q60, 1440x900 — the <picture> primary source
//   poster-hero.webp   WebP q80, 1440x900 — the <picture> fallback
//   og.jpg             1200x630 sRGB JPEG, hard cap 300KB (spec §4)
//
// OG NOTE (spec §4): the spec calls for "It's open." composited onto the OG
// frame. That compositing is DEFERRED: the display face is undecided (spec
// §10.3 — FK Grotesk licence vs Readex Pro, founder call). Until the founder
// picks the face, og.jpg ships as the plain approach frame. Tracked in
// BACKLOG.md ("OG type compositing").
//
// Usage: node tools/make_poster.mjs <input.png>
import sharp from 'sharp';
import { statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input || !existsSync(input)) {
  console.error('Usage: node tools/make_poster.mjs <input.png> — capture one with tools/qa_shots.mjs first.');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'images');
mkdirSync(outDir, { recursive: true });

const kb = (p) => (statSync(p).size / 1024).toFixed(1);

// Poster hero: full 1440x900 frame, two formats for the <picture>.
const avifPath = join(outDir, 'poster-hero.avif');
const webpPath = join(outDir, 'poster-hero.webp');
await sharp(input).avif({ quality: 60 }).toFile(avifPath);
await sharp(input).webp({ quality: 80 }).toFile(webpPath);
console.log(`poster-hero.avif  ${kb(avifPath)} KB`);
console.log(`poster-hero.webp  ${kb(webpPath)} KB`);

// OG: 1200x630 sRGB JPEG, center-crop cover; walk quality down to the 300KB cap.
const ogPath = join(outDir, 'og.jpg');
const makeOg = (q) =>
  sharp(input)
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .toColourspace('srgb')
    .jpeg({ quality: q, mozjpeg: true })
    .toFile(ogPath);
let quality = 82;
for (;;) {
  await makeOg(quality);
  if (statSync(ogPath).size <= 300 * 1024 || quality <= 40) break;
  quality -= 6;
}
if (statSync(ogPath).size > 300 * 1024) {
  console.error(`FAIL: og.jpg is ${statSync(ogPath).size} bytes (> 300KB) even at quality 40.`);
  process.exit(1);
}
console.log(`og.jpg            ${kb(ogPath)} KB (q${quality})`);
