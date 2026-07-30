/// <reference types="node" />
// tests/unit/styles.test.ts — the AA floor, the focus ring and the browser
// chrome colour, asserted in the FAST gate.
//
// Why here and not only in the browser: axe reports text drawn over the poster
// image / the canvas as "incomplete", never a violation (see the header of
// tests/e2e/a11y.spec.ts), so a quiet colour can drift below the 4.5:1 floor
// without a single existing check going red. Two of the four defects this file
// pins were exactly that shape — a value that looked fine and measured 4.19:1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const rawCss = read('../../src/styles.css');
// Comments carry example colours and selector names; strip them so nothing in
// prose can satisfy — or break — an assertion about the actual rules.
const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '');
const indexHtml = read('../../index.html');
const privacyHtml = read('../../privacy.html');
const manifest = read('../../site.webmanifest');

type RGB = readonly [number, number, number];

/* ---- WCAG 2.x relative luminance and contrast ratio ---- */
const toLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (c: RGB): number => 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
const contrast = (fg: RGB, bg: RGB): number => {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/* ---- just enough CSS reading to resolve a declared text colour ---- */
const tokens = new Map<string, string>();
const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
for (const m of rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens.set(m[1].trim(), m[2].trim());

const composite = (src: RGB, alpha: number, over: RGB): RGB => [
  alpha * src[0] + (1 - alpha) * over[0],
  alpha * src[1] + (1 - alpha) * over[1],
  alpha * src[2] + (1 - alpha) * over[2],
];

// Resolves `var(--token)`, `#rrggbb` and `rgb()/rgba()`, compositing any alpha
// over `over` — which is how the browser paints it, and the step that turned
// rgba(242, 245, 248, .45) into a 4.19:1 grey nobody measured.
const resolveColour = (value: string, over: RGB): RGB | null => {
  let v = value.trim();
  const asVar = /^var\(\s*(--[\w-]+)\s*\)$/.exec(v);
  if (asVar) v = (tokens.get(asVar[1]) ?? '').trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) {
    const h = hex[1];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/.exec(v);
  if (fn) {
    const alpha = fn[4] === undefined ? 1 : Number(fn[4]);
    return composite([Number(fn[1]), Number(fn[2]), Number(fn[3])], alpha, over);
  }
  return null;
};

// Returns the body of the first `{...}` block after `marker`, brace-matched so
// nested rules (an @media wrapper) come back whole.
const blockAfter = (source: string, marker: RegExp): string => {
  const at = source.search(marker);
  if (at < 0) return '';
  const open = source.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
};

// Rule bodies keyed by selector list, flat rules only (enough for every
// assertion below; the one nested block is read with blockAfter).
const rules: Array<{ selector: string; body: string }> = [];
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  rules.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2].trim().replace(/\s+/g, ' ') });
}

const NIGHT: RGB = [2, 11, 24]; // --night #020B18 — the canvas under every layer of copy
const AA = 4.5;

describe('AA contrast law (spec §6) — every declared text colour on #020B18', () => {
  const declared = [...css.matchAll(/(?:^|[;{\s])color\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());

  it('finds the sheet’s colour declarations (guards the parser itself)', () => {
    expect(declared.length).toBeGreaterThan(8);
  });

  it.each(declared)('color: %s >= 4.5:1', (value) => {
    const rgb = resolveColour(value, NIGHT);
    expect(rgb, `unparsed colour value: ${value}`).not.toBeNull();
    expect(contrast(rgb as RGB, NIGHT)).toBeGreaterThanOrEqual(AA);
  });

  it('--text-quiet is the declared floor and clears AA with headroom', () => {
    const quiet = resolveColour('var(--text-quiet)', NIGHT);
    expect(quiet).toEqual([0x93, 0xa1, 0xb0]);
    expect(contrast(quiet as RGB, NIGHT)).toBeGreaterThan(7);
  });

  it('the sub-AA quiet alpha is gone — rgba(242, 245, 248, .45) measures 4.19:1', () => {
    const sunk = resolveColour('rgba(242, 245, 248, .45)', NIGHT);
    expect(contrast(sunk as RGB, NIGHT)).toBeLessThan(AA); // the reason it was replaced
    expect(css).not.toMatch(/color\s*:\s*rgba\(\s*242\s*,\s*245\s*,\s*248\s*,\s*\.45\s*\)/);
  });
});

describe('focus answers with light you can actually see', () => {
  it('a:focus-visible still carries the replacement ring', () => {
    const ring = rules.find((r) => /(^|,\s*)a:focus-visible/.test(r.selector));
    expect(ring, 'the a:focus-visible ring rule vanished').toBeDefined();
    expect(ring?.body).toMatch(/box-shadow\s*:/);
    expect(ring?.body).toMatch(/#00E5FF/i);
  });

  // The trap: .badge:focus-visible (0,2,0) outranks a:focus-visible (0,1,1) and
  // box-shadow does not stack across rules, so folding focus into the hover
  // rule silently replaces the ring with a soft glow on the only two links
  // that matter. Any .badge hover rule must stand down while focus-visible.
  it('no .badge hover rule outranks the ring while the badge is focused', () => {
    const hovers = rules.filter((r) => /\.badge[^,]*:hover/.test(r.selector));
    expect(hovers.length).toBeGreaterThan(0);
    for (const rule of hovers) {
      expect(rule.selector, 'hover must yield to :focus-visible').toContain(':not(:focus-visible)');
    }
    expect(rules.some((r) => /\.badge[^,]*:focus-visible/.test(r.selector) && !/:not\(/.test(r.selector))).toBe(false);
  });
});

describe('world mode keeps the badges reachable', () => {
  // In world mode the acts go fixed / opacity 0 / pointer-events none until the
  // flight stages them. opacity 0 does NOT remove a link from the tab order, so
  // without this rule a keyboard user tabs into two invisible store links with
  // no way to reveal them.
  it('a beat that holds focus stages itself in, at .act.on specificity', () => {
    const staged = rules.find((r) => r.selector.includes('.act:focus-within'));
    expect(staged, 'the :focus-within staging rule is missing').toBeDefined();
    expect(staged?.selector).toContain('html:has(#gl[data-world])');
    expect(staged?.body).toMatch(/opacity\s*:\s*1/);
    expect(staged?.body).toMatch(/pointer-events\s*:\s*auto/);
  });
});

describe('poster edition legibility scrim', () => {
  it('the authored world ellipse is untouched', () => {
    const scrim = rules.find((r) => r.selector === 'body::before');
    expect(scrim?.body).toContain('radial-gradient(55% 45% at 50% 50%');
  });

  // Nothing moves in the poster edition, so a centre-weighted ellipse cannot
  // follow the copy across a fixed photograph.
  it('reduced motion flattens it to a full-bleed dim', () => {
    const block = blockAfter(css, /@media[^{]*prefers-reduced-motion\s*:\s*reduce/);
    expect(block, 'no reduced-motion block in the sheet').not.toBe('');
    expect(block).toContain('body::before');
    const override = /body::before\s*\{([^}]*)\}/.exec(block)?.[1] ?? '';
    expect(override).toMatch(/background\s*:/);
    expect(override).not.toMatch(/gradient/);
    // never weaker than the ellipse's own peak (.55) anywhere in the frame
    const flat = /background\s*:\s*(rgba?\([^)]*\))/.exec(override)?.[1] ?? '';
    expect(/^rgba\(\s*2\s*,\s*11\s*,\s*24\s*,/.test(flat), `flat dim was ${flat}`).toBe(true);
    expect(Number(/,\s*([\d.]+)\s*\)$/.exec(flat)?.[1])).toBeGreaterThanOrEqual(0.55);
  });
});

describe('browser chrome matches the page it frames', () => {
  const themeColour = (html: string): string | undefined =>
    /<meta\s+name="theme-color"\s+content="([^"]+)"\s*\/?>/i.exec(html)?.[1];

  it('index.html declares the same theme-color as privacy.html and the manifest', () => {
    const manifestColour = (JSON.parse(manifest) as { theme_color?: string }).theme_color;
    expect(themeColour(indexHtml)).toBe('#020B18');
    expect(themeColour(privacyHtml)).toBe('#020B18');
    expect(manifestColour).toBe('#020B18');
  });
});
