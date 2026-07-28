// tools/check_links.mjs — CI gate: every internal href/src/srcset target and
// in-page #anchor in index.html + privacy.html resolves.
// Usage:
//   node tools/check_links.mjs                check the repo-root HTML (authoring copy)
//   node tools/check_links.mjs --root dist    check the built output (what CI does)
// Exit 0 = pass, 1 = fail.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootFlag = process.argv.indexOf('--root');
const root = rootFlag !== -1 && process.argv[rootFlag + 1]
  ? resolve(process.cwd(), process.argv[rootFlag + 1])
  : join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'privacy.html'];
const failures = [];
let checked = 0;

for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8');
  const ids = new Set([...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map((m) => m[1]));
  const refs = [...html.matchAll(/\s(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/\ssrcset\s*=\s*"([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const url = part.trim().split(/\s+/)[0];
      if (url) refs.push(url);
    }
  }
  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    checked += 1;
    if (ref.startsWith('#')) {
      const id = ref.slice(1);
      if (id && !ids.has(id)) failures.push(`${page}: broken in-page anchor "${ref}"`);
      continue;
    }
    const clean = ref.split(/[?#]/)[0];
    if (clean === '' || clean === '/') continue;
    // Worker routes (src/worker.ts): /app, /app/ios, /app/android are 302s
    // served at the edge, never files in dist. The redirect contract is
    // tested in tests/unit/worker.test.ts + tests/e2e/redirects.spec.ts.
    if (/^\/app(\/|$)/.test(clean)) continue;
    const rel = clean.startsWith('/') ? clean.slice(1) : clean;
    if (!existsSync(join(root, rel))) failures.push(`${page}: missing file for "${ref}"`);
  }
}

if (failures.length) {
  console.error(`FAIL: internal link/asset check (${failures.length}):\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`OK: ${checked} internal references checked across ${pages.join(' + ')}.`);
