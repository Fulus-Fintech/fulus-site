/// <reference types="node" />
// @vitest-environment node
//
// tests/unit/build-passthrough.test.ts — what the static passthrough is
// allowed to publish.
//
// Node environment, not the suite-wide jsdom: this file imports vite.config.ts
// itself, and vite pulls in esbuild, which refuses to load when TextEncoder
// comes from jsdom ("this JavaScript environment is broken").
//
// Why this exists: copyStaticPassthrough used to copy the whole assets/ tree,
// which dragged assets/images/cast-src/ — six ~1.3 MB full-scene originals
// plus their ISNet mattes — into dist/ on every deploy. Those are pipeline
// INPUTS (tools/isnet_matte.mjs → tools/process_figures.mjs); nothing on the
// site ever requests them. The served frames live one directory over, in
// assets/images/cast/, whose path is a PREFIX of the excluded one — so a
// sloppier filter would silently drop the six figures the world actually
// draws. Both halves are pinned below.
import { describe, expect, it } from 'vitest';
import { isPublishedStatic } from '../../vite.config';

describe('static passthrough — pipeline inputs stay out of dist/', () => {
  it.each([
    'assets/images/cast-src',
    'assets/images/cast-src/walker.png',
    'assets/images/cast-src/visionary.png',
    'assets/images/cast-src/matted',
    'assets/images/cast-src/matted/walker-matted.png',
  ])('excludes %s', (rel) => {
    expect(isPublishedStatic(rel)).toBe(false);
  });

  it('excludes the same paths written with Windows separators', () => {
    expect(isPublishedStatic('assets\\images\\cast-src')).toBe(false);
    expect(isPublishedStatic('assets\\images\\cast-src\\matted\\anchor-matted.png')).toBe(false);
  });
});

describe('static passthrough — everything the site references still ships', () => {
  it.each([
    // The served cast frames: assets/images/cast is a prefix of cast-src.
    'assets/images/cast',
    'assets/images/cast/walker.webp',
    'assets/images/cast/visionary.webp',
    'assets/images/og.jpg',
    'assets/images/poster-hero.avif',
    'assets/images/poster-hero.webp',
    'assets/fonts',
    'assets/favicons/favicon.ico',
    '.well-known/apple-app-site-association',
    '.well-known/assetlinks.json',
    'site.webmanifest',
    '_headers',
  ])('publishes %s', (rel) => {
    expect(isPublishedStatic(rel)).toBe(true);
  });

  it('publishes the assets/ root itself (an excluded root would empty dist)', () => {
    expect(isPublishedStatic('assets')).toBe(true);
    expect(isPublishedStatic('')).toBe(true);
  });
});
