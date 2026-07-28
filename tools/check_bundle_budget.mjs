// tools/check_bundle_budget.mjs — CI gate: gzipped critical-payload budget.
//
// "Critical payload" (spec §8) = the built entry HTML + every CSS/JS file it
// references (stylesheets, scripts, modulepreload chunks) + the Latin text
// font + the light-engine dynamic chunk (it always loads on the motion rung,
// so it is critical spend even though no <link>/<script> references it).
// Budget: 350 KB gzipped, total (spec §6: Three.js included).
//
// Usage:
//   node tools/check_bundle_budget.mjs             gate (exit 0 pass / 1 over / 2 setup error)
//   node tools/check_bundle_budget.mjs --measure   print the per-file breakdown
//
// Bump-deliberately rule: if the payload grows on purpose, raise
// MAX_GZIP_BYTES below in the SAME commit and justify it in the commit message.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const MAX_GZIP_BYTES = 350 * 1024;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

if (!existsSync(join(dist, 'index.html'))) {
  console.error('FAIL: dist/index.html not found — run "npm run build" first.');
  process.exit(2);
}

const html = readFileSync(join(dist, 'index.html'), 'utf8');

// Local CSS/JS the entry HTML references. modulepreload chunks load before
// first interaction, so they count as critical.
const refs = new Set();
for (const m of html.matchAll(/<script[^>]+src\s*=\s*"([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<link[^>]+>/g)) {
  const rel = (m[0].match(/rel\s*=\s*"([^"]+)"/) || [])[1] || '';
  const href = (m[0].match(/href\s*=\s*"([^"]+)"/) || [])[1] || '';
  if (href && (rel === 'stylesheet' || rel === 'modulepreload')) refs.add(href);
}

// The Latin text font, hashed by Vite somewhere under dist/assets/. The
// Arabic subset is not shipped (English-only site); riyal.woff2 is a tiny
// lazy subset — both excluded from "critical" by spec §8.
function findLatinFont(dir) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findLatinFont(p);
      if (hit) return hit;
    } else if (/readex-pro-latin.*\.woff2$/.test(entry.name)) {
      return p;
    }
  }
  return null;
}

const files = [{ label: 'index.html', path: join(dist, 'index.html') }];
for (const ref of refs) {
  if (/^(https?:|data:)/i.test(ref)) continue; // external — not our payload
  const rel = ref.replace(/^\//, '').split(/[?#]/)[0];
  const p = join(dist, rel);
  if (!existsSync(p)) {
    console.error(`FAIL: dist/index.html references "${ref}" but dist/${rel} does not exist.`);
    process.exit(2);
  }
  files.push({ label: rel, path: p });
}
const font = findLatinFont(join(dist, 'assets'));
if (font) {
  files.push({ label: font.slice(dist.length + 1).replaceAll('\\', '/'), path: font });
} else {
  console.warn('WARN: no readex-pro-latin*.woff2 under dist/assets — font not counted.');
}

// The world chunk (Three.js + src/world/*) loads as a TRUE dynamic import
// (no modulepreload link), so the HTML scrape above never sees it — but it
// always loads on the WebGL rung, so it is critical spend (spec: <= 350KB gz
// INCLUDING Three.js). Chunk names drift with the module graph; counting
// EVERY .js under dist/assets is drift-proof and strictly conservative.
function findAllJs(dir) {
  const hits = [];
  if (!existsSync(dir)) return hits;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) hits.push(...findAllJs(p));
    else if (/\.js$/.test(entry.name)) hits.push(p);
  }
  return hits;
}
const counted = new Set(files.map((f) => f.path));
for (const chunk of findAllJs(join(dist, 'assets'))) {
  if (!counted.has(chunk)) {
    files.push({ label: chunk.slice(dist.length + 1).replaceAll('\\', '/'), path: chunk });
  }
}

let total = 0;
const rows = files.map(({ label, path }) => {
  const gz = gzipSync(readFileSync(path), { level: 9 }).length;
  total += gz;
  return { label, gz };
});

if (process.argv.includes('--measure')) {
  for (const { label, gz } of rows.sort((a, b) => b.gz - a.gz)) {
    console.log(`${String(gz).padStart(9)} gz  ${label}`);
  }
  const pct = ((total / MAX_GZIP_BYTES) * 100).toFixed(1);
  console.log(`total: ${total} gz bytes of ${MAX_GZIP_BYTES} budget (${pct}%)`);
  process.exit(0);
}

if (total > MAX_GZIP_BYTES) {
  console.error(
    `FAIL: critical payload ${total} gz bytes exceeds ${MAX_GZIP_BYTES} (350 KB).\n` +
      'Run "node tools/check_bundle_budget.mjs --measure" for the breakdown. If the\n' +
      'growth is deliberate, raise MAX_GZIP_BYTES in tools/check_bundle_budget.mjs\n' +
      'in the same commit and justify it in the commit message.'
  );
  process.exit(1);
}
console.log(`OK: critical payload ${total} gz bytes <= ${MAX_GZIP_BYTES} (350 KB).`);
