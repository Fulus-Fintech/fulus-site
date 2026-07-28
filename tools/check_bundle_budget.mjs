// tools/check_bundle_budget.mjs — CI gate: transfer-size budgets (spec §6).
//
// Default mode — the CRITICAL payload every motion-rung visitor downloads:
//   dist/index.html + EVERY .js/.css under dist/assets + the Latin font.
//   All dist JS counts because the world chunk is a true dynamic import the
//   HTML never references, yet it always loads on the motion rung — counting
//   everything makes chunk-name drift impossible (the light-engine lesson
//   from v2: a rename silently uncounted a third of the payload).
//   Budget: 350 KB gzipped, Three.js included.
//
// --poster mode — the POSTER-EDITION total (no-WebGL / reduced-motion /
//   save-data visitors): dist/index.html + only the CSS/JS the HTML
//   references (the world chunk never loads for them) + the Latin font +
//   the poster hero image (worst of avif/webp — old browsers fetch the
//   bigger webp). Budget: 700 KB transfer (text gzipped, images raw —
//   servers do not gzip images).
//
// --measure prints the per-file breakdown in either mode.
//
// Bump-deliberately rule: if a payload grows on purpose, raise the constant
// below in the SAME commit and justify it in the commit message.
import { readFileSync, statSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const CRITICAL_MAX_GZIP = 350 * 1024; // JS+CSS+HTML gz, Three.js included
const POSTER_MAX_BYTES = 700 * 1024; // poster-edition total transfer

const posterMode = process.argv.includes('--poster');
const measure = process.argv.includes('--measure');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('FAIL: dist/index.html not found — run "npm run build" first.');
  process.exit(2);
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(join(dist, 'assets'));
const font = all.find((p) => /readex-pro-latin.*\.woff2$/.test(p));
if (!font) {
  console.error('FAIL: no readex-pro-latin*.woff2 under dist/assets — font not counted.');
  process.exit(2);
}

const files = [join(dist, 'index.html'), font];

if (posterMode) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = new Set();
  for (const m of html.matchAll(/<script[^>]+src\s*=\s*"([^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/<link[^>]+>/g)) {
    const rel = (m[0].match(/rel\s*=\s*"([^"]+)"/) || [])[1] || '';
    const href = (m[0].match(/href\s*=\s*"([^"]+)"/) || [])[1] || '';
    if (href && (rel === 'stylesheet' || rel === 'modulepreload')) refs.add(href);
  }
  for (const ref of refs) {
    if (/^(https?:|data:)/i.test(ref)) continue; // external — not our payload
    const p = join(dist, ref.replace(/^\//, '').split(/[?#]/)[0]);
    if (!existsSync(p)) {
      console.error(`FAIL: dist/index.html references "${ref}" but it does not exist in dist/.`);
      process.exit(2);
    }
    files.push(p);
  }
  const avif = join(dist, 'assets', 'images', 'poster-hero.avif');
  const webp = join(dist, 'assets', 'images', 'poster-hero.webp');
  if (!existsSync(avif) || !existsSync(webp)) {
    console.error('FAIL: poster-hero.avif/.webp missing under dist/assets/images — run tools/make_poster.mjs and rebuild.');
    process.exit(2);
  }
  files.push(statSync(avif).size >= statSync(webp).size ? avif : webp);
} else {
  for (const p of all) if (/\.(js|css)$/.test(p)) files.push(p);
}

const gzExt = new Set(['.html', '.css', '.js', '.svg', '.json']);
let total = 0;
const rows = [...new Set(files)].map((p) => {
  const buf = readFileSync(p);
  const bytes = gzExt.has(extname(p)) ? gzipSync(buf, { level: 9 }).length : buf.length;
  total += bytes;
  return { label: p.slice(dist.length + 1).replaceAll('\\', '/'), bytes };
});

const MAX = posterMode ? POSTER_MAX_BYTES : CRITICAL_MAX_GZIP;
const name = posterMode ? 'poster-edition total' : 'critical payload';

if (measure) {
  for (const { label, bytes } of rows.sort((a, b) => b.bytes - a.bytes)) {
    console.log(`${String(bytes).padStart(9)}  ${label}`);
  }
  console.log(`total: ${total} bytes of ${MAX} budget (${((total / MAX) * 100).toFixed(1)}%)`);
  process.exit(0);
}

if (total > MAX) {
  console.error(
    `FAIL: ${name} ${total} bytes exceeds ${MAX}.\n` +
      'Run with --measure for the breakdown. If the growth is deliberate, raise\n' +
      'the constant in tools/check_bundle_budget.mjs in the same commit and\n' +
      'justify it in the commit message.'
  );
  process.exit(1);
}
console.log(`OK: ${name} ${total} bytes <= ${MAX}.`);
