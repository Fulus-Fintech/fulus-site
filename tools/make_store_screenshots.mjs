// Turns raw phone captures into Play-compliant store screenshots.
//
//   assets/store/raw/*.png        ->  assets/store/play/*.png        (1080x1920)
//   assets/store/raw/ar/*.png     ->  assets/store/play/ar/*.png     (1080x1920)
//
//   node tools/make_store_screenshots.mjs
//
// WHY THIS EXISTS
//
// A raw screenshot from a modern phone cannot be uploaded to Google Play. Play's
// rule is that the longest side may not exceed twice the shortest side, and a
// current Android capture is 1080x2340 = 2.167:1. It is rejected at upload, and
// the same is true of iPhone captures (1290x2796), which is why the existing iOS
// screenshot set can never be reused.
//
// This scales each capture to fit 1920 tall and pads it onto a 1080x1920 canvas
// in the brand's Deep Ocean Night. Nothing is cropped, so no content is lost and
// the side margins read as deliberate framing. Cropping to 1080x1920 instead
// would remove 420px of real content.
//
// It fails loudly rather than writing a file Play would refuse — a rejected
// upload surfaces days later in the Console, far from the cause.

import sharp from 'sharp';
import { mkdirSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';
import { join } from 'node:path';

const fromRoot = (p) => fileURLToPath(new NodeURL(p, import.meta.url));

const RAW = fromRoot('../assets/store/raw');
const OUT = fromRoot('../assets/store/play');

const WIDTH = 1080;
const HEIGHT = 1920;
const CANVAS = '#020B18'; // FulusColors.oceanNight — tokens.dart:8

/** Play's own constraint, stated once so the check cannot drift from the comment. */
const violatesAspectRule = (w, h) => Math.max(w, h) > 2 * Math.min(w, h);

async function convert(srcPath, outPath) {
  const meta = await sharp(srcPath).metadata();

  if (!meta.width || !meta.height) {
    throw new Error(`${srcPath}: could not read dimensions`);
  }
  if (meta.width < 1080) {
    throw new Error(
      `${srcPath}: ${meta.width}px wide. Capture at 1080px or more — ` +
      `upscaling would ship a soft screenshot.`
    );
  }

  await sharp(srcPath)
    // `contain` fits the whole capture inside the canvas and pads the rest;
    // `cover` would crop, which is what we are deliberately avoiding.
    .resize(WIDTH, HEIGHT, { fit: 'contain', background: CANVAS })
    .flatten({ background: CANVAS }) // Play refuses an alpha channel
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const out = await sharp(outPath).metadata();
  const problems = [];
  if (out.width !== WIDTH || out.height !== HEIGHT) {
    problems.push(`is ${out.width}x${out.height}, must be ${WIDTH}x${HEIGHT}`);
  }
  if (out.hasAlpha) problems.push('has an alpha channel');
  if (out.channels !== 3) problems.push(`has ${out.channels} channels, expected 3`);
  if (violatesAspectRule(out.width, out.height)) {
    problems.push('violates Play\'s 2:1 rule');
  }
  if (problems.length) throw new Error(`${outPath}: ${problems.join('; ')}`);

  return `${meta.width}x${meta.height} -> ${out.width}x${out.height}`;
}

async function convertDir(srcDir, outDir, label) {
  if (!existsSync(srcDir)) return 0;
  const files = readdirSync(srcDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  if (!files.length) return 0;

  mkdirSync(outDir, { recursive: true });
  for (const f of files) {
    const outName = f.replace(/\.jpe?g$/i, '.png');
    const how = await convert(join(srcDir, f), join(outDir, outName));
    console.log(`  ${label}${outName.padEnd(20)} ${how}`);
  }
  return files.length;
}

if (!existsSync(RAW)) {
  console.error(
    `No captures found.\n` +
    `Put raw phone screenshots in assets/store/raw/ (and assets/store/raw/ar/ ` +
    `for the Arabic set).\nSee audit/runbooks/play-store-screenshots.md in the ` +
    `Flutter repo for the shot list.`
  );
  process.exit(1);
}

// Failures here are operator-facing (someone processing captures, not a
// developer reading a stack). Print the reason and nothing else.
let en = 0;
let ar = 0;
try {
  en = await convertDir(RAW, OUT, 'en/');
  ar = await convertDir(join(RAW, 'ar'), join(OUT, 'ar'), 'ar/');
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}

if (en + ar === 0) {
  console.error(`FAIL: assets/store/raw/ exists but contains no images.`);
  process.exit(1);
}

console.log(`\n${en} English, ${ar} Arabic — all 1080x1920, 24-bit, no alpha.`);
if (en > 0 && en < 2) {
  console.warn(`WARNING: Play needs at least 2 screenshots to publish; 4+ at ` +
    `1080px unlocks recommendation placements. You have ${en}.`);
}
if (ar === 0) {
  console.warn(`NOTE: no Arabic set. Arabic is the primary market for this app ` +
    `and Play accepts a separate set per locale.`);
}
