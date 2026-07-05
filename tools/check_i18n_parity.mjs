// tools/check_i18n_parity.mjs — CI gate: en/ar dictionary key parity + no empty values.
// The dictionaries are flat single-level JSON objects (key -> string).
// Usage: node tools/check_i18n_parity.mjs   (exit 0 = pass, 1 = fail, 2 = unreadable input)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function load(name) {
  const path = join(root, 'i18n', name);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`FAIL: could not read/parse ${path}: ${e.message}`);
    process.exit(2);
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.error(`FAIL: ${name} must be a flat JSON object (key -> string)`);
    process.exit(2);
  }
  return parsed;
}

const en = load('en.json');
const ar = load('ar.json');
const enKeys = new Set(Object.keys(en));
const arKeys = new Set(Object.keys(ar));

const problems = [];
const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();
const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();
if (missingInAr.length) {
  problems.push(`keys in en.json missing from ar.json (${missingInAr.length}):\n  ${missingInAr.join('\n  ')}`);
}
if (missingInEn.length) {
  problems.push(`keys in ar.json missing from en.json (${missingInEn.length}):\n  ${missingInEn.join('\n  ')}`);
}
for (const [name, dict] of [['en.json', en], ['ar.json', ar]]) {
  const empty = Object.entries(dict)
    .filter(([, v]) => typeof v !== 'string' || v.trim() === '')
    .map(([k]) => k)
    .sort();
  if (empty.length) {
    problems.push(`empty or non-string values in ${name} (${empty.length}):\n  ${empty.join('\n  ')}`);
  }
}

if (problems.length) {
  console.error(`FAIL: i18n parity check\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`OK: i18n parity — ${enKeys.size} keys in both dictionaries, no empty values.`);
