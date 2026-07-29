#!/usr/bin/env node
// tools/isnet_matte.mjs — step 1 of the figure pipeline: semantic matting
// only. Kept in its own process because @imgly/background-removal-node
// (onnxruntime) and sharp (libvips) crash when loaded together on this
// machine (GLib criticals → segfault). Step 2 (geometry/webp) lives in
// tools/process_figures.mjs.
//
// Usage: node tools/isnet_matte.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeBackground } from '@imgly/background-removal-node';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(root, 'assets', 'images', 'cast-src');
const OUT_DIR = join(SRC_DIR, 'matted');

// The library's default publicPath is cwd-relative, which breaks when the
// package resolves from a parent checkout's node_modules (e.g. running in
// a git worktree). Anchor it to wherever the module actually lives.
const PUBLIC_PATH = new URL('./', import.meta.resolve('@imgly/background-removal-node')).href;

// Night-crossing canon cast: six founder-approved solo takes. Each source
// is a full 768x1376 scene (black figure backlit by a glowing portal
// panel, fog, wet reflective floor); ISNet keeps the figure body and
// drops the portal, fog, and floor reflection.
const SOURCES = [
  'walker.png',
  'connector.png',
  'operator.png',
  'strategist.png',
  'anchor.png',
  'visionary.png',
];

await mkdir(OUT_DIR, { recursive: true });
for (const src of SOURCES) {
  const blob = await removeBackground(
    new Blob([await readFile(join(SRC_DIR, src))], { type: 'image/png' }),
    { publicPath: PUBLIC_PATH, output: { format: 'image/png' } },
  );
  const out = join(OUT_DIR, src.replace(/\.png$/, '-matted.png'));
  await writeFile(out, Buffer.from(await blob.arrayBuffer()));
  console.log('matted:', src, '->', out.split(/[\\/]/).pop());
}
