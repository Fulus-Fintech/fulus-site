// tools/qa_shots.mjs — SELF-QA LAW harness (spec §8): capture frames at scroll
// stops so the implementing agent LOOKS at them — against the spec and the
// prototype, hunting the named kill-classes (bounded-plane halos, horizon
// seams, blown-out cores, dead-slab floors, pasted figures) — BEFORE anything
// is committed or presented.
//
// Usage: node tools/qa_shots.mjs <url-or-file> <outprefix> [stops...]
//   <url-or-file>  http(s) URL or a path to a local HTML file
//   <outprefix>    e.g. docs/superpowers/artdirection/frames/night-crossing-wip/proto
//   [stops...]     scroll fractions; default 0 0.5 0.72 0.8 0.97
// Writes <outprefix>-<stop>.png with '.' replaced by 'p' (proto-0p5.png).
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [, , target, outPrefix, ...stopArgs] = process.argv;
if (!target || !outPrefix) {
  console.error('Usage: node tools/qa_shots.mjs <url-or-file> <outprefix> [stops...]');
  process.exit(2);
}
const stops = stopArgs.length ? stopArgs.map(Number) : [0, 0.5, 0.72, 0.8, 0.97];
const url = /^https?:/i.test(target) ? target : pathToFileURL(resolve(target)).href;

// SwiftShader keeps WebGL alive on GPU-less machines/CI; frames are review
// artifacts for eyes, never pixel-gated (spec §7).
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(3000); // let the world boot and settle

for (const stop of stops) {
  await page.evaluate((s) => {
    window.scrollTo(0, s * (document.body.scrollHeight - window.innerHeight));
  }, stop);
  await page.waitForTimeout(4000); // scroll lerp 0.07 needs time to converge
  const file = `${outPrefix}-${String(stop).replace('.', 'p')}.png`;
  await page.screenshot({ path: file });
  console.log(`wrote ${file}`);
}
await browser.close();
