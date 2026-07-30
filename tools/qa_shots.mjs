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

// Wait for real animation frames, not wall-clock: the lerp converges per frame.
// 0.93^130 ≈ 8e-5 — the camera is at the stop it was asked for.
const settleFrames = (page, n) =>
  page.evaluate(
    (frames) =>
      new Promise((done) => {
        let i = 0;
        const step = () => (++i >= frames ? done(null) : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );

for (const stop of stops) {
  // A FRESH PAGE PER STOP. Scrolling one page through the stop list makes every
  // shot depend on the ones before it: the governor's tier, the noise phase and
  // the latches that never fall back (wayOpen, the door's yield) all carry over,
  // so 0.97 was being judged on a world that had already been walked through
  // 0.72. Booting the world once per stop is the only way a frame answers "what
  // does the film look like HERE" instead of "…here, after that capture run".
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // NOTE: never setDefaultTimeout(0) here — with no deadline, page.screenshot()
  // stops waiting for a composited frame and writes a blank white PNG.

  // G3 QA: SwiftShader renders this world at 2-3 fps, and the harness used to
  // judge the frames it produced under that. Two lies came out of it:
  //   1. every frame was "over budget", so the governor shed richness (ripple,
  //      grain/vignette/grade, then shafts) partway through a capture — the last
  //      frames showed a DEGRADED world, not the authored one;
  //   2. the scroll lerp (0.07/frame) only got ~10 frames per stop, so a shot
  //      labelled 0.72 was really the world at ~0.64.
  // A synthetic 60fps clock fixes both at the source: the governor sees healthy
  // frames and never sheds, and the noise phase is identical every run, so two
  // captures of the same stop are comparable.
  await page.addInitScript(() => {
    const raf = window.requestAnimationFrame.bind(window);
    let clock = 0;
    window.requestAnimationFrame = (cb) => raf(() => { clock += 1000 / 60; cb(clock); });
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(3000); // let the world boot (requestIdleCallback + module fetch)
  await settleFrames(page, 30);

  await page.evaluate((s) => {
    window.scrollTo(0, s * (document.body.scrollHeight - window.innerHeight));
  }, stop);
  await settleFrames(page, 130);
  await page.waitForTimeout(1000); // let the compositor commit the settled frame — screenshotting straight out of a rAF callback captures a blank surface
  const file = `${outPrefix}-${String(stop).replace('.', 'p')}.png`;
  await page.screenshot({ path: file });
  await page.close();
  console.log(`wrote ${file}`);
}
await browser.close();
