// tools/check_js_budget.mjs — CI gate: local js/ byte budget.
// Mirrors the Flutter repo's size-budget pattern: a checked-in budget file,
// fail message names the exact value to bump if growth is intentional.
// Usage:
//   node tools/check_js_budget.mjs             gate against tools/js-budget.json
//   node tools/check_js_budget.mjs --measure   print per-file bytes + suggested maxBytes
// Exit: 0 = pass/measure, 1 = over budget, 2 = bad budget file.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = join(root, 'js');

function collect(dir) {
  let files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) files = files.concat(collect(p));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(p);
  }
  return files;
}

const files = collect(jsDir).sort();
const total = files.reduce((sum, f) => sum + statSync(f).size, 0);

if (process.argv.includes('--measure')) {
  for (const f of files) {
    console.log(`${String(statSync(f).size).padStart(8)}  ${relative(root, f).replaceAll('\\', '/')}`);
  }
  console.log(`total: ${total} bytes`);
  console.log(`suggested maxBytes (total + 15%): ${Math.round(total * 1.15)}`);
  process.exit(0);
}

let budget;
try {
  budget = JSON.parse(readFileSync(join(root, 'tools', 'js-budget.json'), 'utf8'));
} catch (e) {
  console.error(`FAIL: could not read tools/js-budget.json: ${e.message}`);
  process.exit(2);
}
if (typeof budget.maxBytes !== 'number' || !Number.isFinite(budget.maxBytes) || budget.maxBytes <= 0) {
  console.error('FAIL: tools/js-budget.json needs a positive numeric "maxBytes".');
  process.exit(2);
}

if (total > budget.maxBytes) {
  const over = (((total / budget.maxBytes) - 1) * 100).toFixed(1);
  console.error(
    `FAIL: local js/ total ${total} bytes exceeds budget ${budget.maxBytes} bytes (+${over}%).\n` +
    'If this growth is intentional, run "node tools/check_js_budget.mjs --measure" and bump\n' +
    'tools/js-budget.json maxBytes to the suggested value in the same commit.'
  );
  process.exit(1);
}
console.log(`OK: js/ total ${total} bytes <= budget ${budget.maxBytes} bytes.`);
