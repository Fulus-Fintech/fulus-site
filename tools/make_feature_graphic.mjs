// Renders the Google Play feature graphic from tools/feature-graphic.html.
//
//   node tools/make_feature_graphic.mjs
//   -> assets/store/play-feature-graphic.png   1024x500, 24-bit, NO alpha
//
// Play's requirement is exactly 1024x500, JPEG or 24-bit PNG "no alpha".
// Playwright screenshots are RGBA, so the alpha channel is flattened onto the
// brand canvas here. That flatten is the point of this script, not an
// incidental step — an RGBA PNG is rejected at upload.
//
// The output is verified before it is written: dimensions, channel count, and
// the absence of an alpha channel are all asserted, because every one of those
// failures is silent until the Play Console refuses the file.

import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

const fromRoot = (p) => fileURLToPath(new NodeURL(p, import.meta.url));

const SRC = fromRoot('./feature-graphic.html');
const OUT_DIR = fromRoot('../assets/store');
const OUT = `${OUT_DIR}/play-feature-graphic.png`;

const WIDTH = 1024;
const HEIGHT = 500;

if (!existsSync(SRC)) {
  console.error(`FAIL: missing ${SRC}`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2, // render at 2x, downsample — keeps the wordmark edges clean
});
await page.goto(`file://${SRC}`);
// The lockup is a <img> and the tagline needs its webfont; waiting on fonts
// alone would race the image decode.
await page.waitForLoadState('networkidle');
await page.evaluate(() => document.fonts.ready);
const raw = await page.screenshot({ type: 'png' });
await browser.close();

await sharp(raw)
  .resize(WIDTH, HEIGHT, { fit: 'fill' })
  // flatten() drops alpha by compositing onto the brand canvas. Without this the
  // PNG carries an alpha channel and Play refuses it.
  .flatten({ background: '#020B18' })
  .png({ compressionLevel: 9 })
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
const problems = [];
if (meta.width !== WIDTH || meta.height !== HEIGHT) {
  problems.push(`dimensions are ${meta.width}x${meta.height}, must be ${WIDTH}x${HEIGHT}`);
}
if (meta.hasAlpha) problems.push('has an alpha channel — Play rejects this');
if (meta.channels !== 3) problems.push(`${meta.channels} channels, expected 3 (24-bit RGB)`);

if (problems.length) {
  console.error('FAIL: ' + problems.join('; '));
  process.exit(1);
}

// sharp's metadata().size is only populated for buffer inputs, not files.
const bytes = statSync(OUT).size;

console.log(
  `play-feature-graphic.png  ${meta.width}x${meta.height}  ` +
  `${meta.channels} channels  alpha=${meta.hasAlpha}  ` +
  `${(bytes / 1024).toFixed(1)} KB`
);
