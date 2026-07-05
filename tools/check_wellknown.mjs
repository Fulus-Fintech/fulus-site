// tools/check_wellknown.mjs — CI gate: deep-link verification artifacts intact.
// Asserts the AASA appID, assetlinks package + SHA-256 fingerprint prefix, and the
// literal _headers rule blocks that make iOS/Android accept the files as JSON.
// The .well-known files are committed copies of the source of truth in the Flutter
// repo at audit/runbooks/h-2-7-fulus-site-files/ — never hand-edit them here.
// Usage: node tools/check_wellknown.mjs   (exit 0 = pass, 1 = fail, 2 = unreadable)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(rel) {
  try {
    return readFileSync(join(root, rel), 'utf8');
  } catch (e) {
    console.error(`FAIL: cannot read ${rel}: ${e.message}`);
    process.exit(2);
  }
}

// 1. Apple apple-app-site-association
try {
  const aasa = JSON.parse(read('.well-known/apple-app-site-association'));
  const details = aasa?.applinks?.details;
  if (!Array.isArray(details) || details.length === 0) {
    failures.push('AASA: applinks.details missing or empty');
  } else {
    const appIDs = details[0].appIDs;
    if (!Array.isArray(appIDs) || !appIDs.includes('2P5F7CK94A.com.fulus.fintech')) {
      failures.push(`AASA: appIDs must include "2P5F7CK94A.com.fulus.fintech", got ${JSON.stringify(appIDs)}`);
    }
    const components = details[0].components;
    if (!Array.isArray(components) || components.length === 0) {
      failures.push('AASA: components whitelist missing or empty');
    }
  }
} catch (e) {
  failures.push(`AASA: not valid JSON (${e.message})`);
}

// 2. Android assetlinks.json
try {
  const links = JSON.parse(read('.well-known/assetlinks.json'));
  const entry = Array.isArray(links) ? links[0] : undefined;
  if (!entry) {
    failures.push('assetlinks: top-level array missing or empty');
  } else {
    if (!Array.isArray(entry.relation) || !entry.relation.includes('delegate_permission/common.handle_all_urls')) {
      failures.push('assetlinks: relation must include "delegate_permission/common.handle_all_urls"');
    }
    if (entry.target?.package_name !== 'com.fulus.fintech') {
      failures.push(`assetlinks: package_name must be "com.fulus.fintech", got ${JSON.stringify(entry.target?.package_name)}`);
    }
    const fp = entry.target?.sha256_cert_fingerprints?.[0];
    if (typeof fp !== 'string' || !fp.startsWith('63:E3')) {
      failures.push(`assetlinks: first sha256_cert_fingerprint must start with "63:E3", got ${JSON.stringify(fp)}`);
    }
  }
} catch (e) {
  failures.push(`assetlinks: not valid JSON (${e.message})`);
}

// 3. _headers — the two rule blocks, asserted literally (CRLF-normalized).
const headers = read('_headers').replace(/\r\n/g, '\n');
const requiredBlocks = [
  '/.well-known/apple-app-site-association\n  Content-Type: application/json\n  Cache-Control: public, max-age=300',
  '/.well-known/assetlinks.json\n  Content-Type: application/json\n  Cache-Control: public, max-age=300',
];
for (const block of requiredBlocks) {
  if (!headers.includes(block)) {
    failures.push(`_headers: missing literal rule block:\n${block}`);
  }
}

if (failures.length) {
  console.error(`FAIL: .well-known integrity (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('OK: .well-known integrity — AASA appID, assetlinks package + fingerprint, _headers rules all present.');
