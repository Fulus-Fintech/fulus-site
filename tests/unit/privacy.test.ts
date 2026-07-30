/// <reference types="node" />
// tests/unit/privacy.test.ts — the privacy page is a factual claim about the
// code, so it is asserted against the code.
//
// The page shipped for a long time describing a waitlist that no longer exists
// (email, language, club size) while saying nothing about the two events the
// site actually sends. Nothing went red, because prose has no compiler. These
// tests are that compiler: every promise the page makes is pinned to the file
// that would have to change to break it, so the disclosure cannot silently
// drift away from the site again.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const path = (rel: string): string => fileURLToPath(new URL(rel, import.meta.url));
const read = (rel: string): string => readFileSync(path(rel), 'utf8');

const privacyHtml = read('../../privacy.html');
const indexHtml = read('../../index.html');
const workerTs = read('../../src/worker.ts');
const mainTs = read('../../src/main.ts');

// Every .ts file under src/, so a new sender or a new store cannot hide in a
// subdirectory the assertions below never open.
const srcFiles = (function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.ts') ? [readFileSync(full, 'utf8')] : [];
  });
})(path('../../src'));

/** The event names the Worker will accept, read out of its allowlist literal. */
const allowedEvents = (): string[] => {
  const literal = /EVENTS_ALLOWED\s*=\s*new Set\(\[([^\]]*)\]\)/.exec(workerTs)?.[1];
  expect(literal, 'the /e allowlist moved — this test cannot read it any more').toBeDefined();
  return [...(literal as string).matchAll(/'([^']*)'/g)].map((m) => m[1]);
};

describe('“Two counts” is the number of things the code can send', () => {
  it('the Worker accepts exactly a pageview and the two store taps', () => {
    expect(allowedEvents()).toEqual(['pv', 'tap:ios', 'tap:android']);
  });

  // The page is described to a reader as two kinds of count, not three names.
  it('the browser sends nothing the page does not describe', () => {
    const beaconArg = /function beacon\(name:\s*([^)]*)\)/.exec(mainTs)?.[1];
    expect(beaconArg, 'the beacon signature moved').toBeDefined();
    const sent = [...(beaconArg as string).matchAll(/'([^']*)'/g)].map((m) => m[1]);
    expect(sent).toEqual(allowedEvents());
  });

  it('the page names both counts in plain words', () => {
    expect(privacyHtml).toMatch(/a page was opened/);
    expect(privacyHtml).toMatch(/tapped a store badge/);
  });
});

describe('the retired waitlist is gone from the disclosure', () => {
  it.each([
    ['waitlist', /waitlist/i],
    ['a place in line', /place in line/i],
    ['launch updates', /launch updates/i],
    ['your email address', /your email address/i],
    ['قائمة الانتظار', /قائمة\s*(ال)?انتظار/],
  ])('the page no longer mentions %s', (_label, pattern) => {
    expect(privacyHtml).not.toMatch(pattern);
  });

  it('the meta description describes this site, not the retired one', () => {
    const description = /<meta\s+name="description"\s+content="([^"]+)"/.exec(privacyHtml)?.[1];
    expect(description, 'privacy.html lost its meta description').toBeDefined();
    expect(description).not.toMatch(/waitlist/i);
    expect(description).toMatch(/no cookies/i);
  });
});

describe('every “we do not” on the page is true of the code', () => {
  it('“No cookies” — nothing on this site touches a cookie or browser storage', () => {
    expect(privacyHtml).toMatch(/No cookies\./);
    const storage = /document\.cookie|localStorage|sessionStorage|indexedDB|set-cookie/i;
    for (const source of [...srcFiles, indexHtml, privacyHtml]) {
      expect(source.replace(/cookieless/gi, '')).not.toMatch(storage);
    }
  });

  it('“no form that asks for any of it” — the site has no field to type into', () => {
    for (const page of [indexHtml, privacyHtml]) {
      expect(page).not.toMatch(/<(form|input|textarea|select)\b/i);
    }
  });

  it('“no trackers belonging to other companies” — neither page loads a foreign origin', () => {
    for (const page of [indexHtml, privacyHtml]) {
      const urls = [...page.matchAll(/(?:src|href|content)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
      for (const url of urls) expect(new URL(url).host).toBe('fulus.sa');
    }
  });
});

describe('the Arabic mirror still mirrors (spec §9 keeps it bilingual)', () => {
  it('both languages carry the same number of sections', () => {
    const [english, arabic] = privacyHtml.split('<div class="privacy-arabic"');
    expect(arabic, 'the Arabic legal text is missing').toBeDefined();
    const sections = (html: string): number => (html.match(/<section class="privacy-block">/g) ?? []).length;
    expect(sections(english)).toBeGreaterThan(4);
    expect(sections(arabic)).toBe(sections(english));
  });

  // U+200E on both sides keeps the Latin domain from being re-ordered inside an
  // RTL sentence. It is invisible, so an editor can drop it without a trace —
  // hence an explicit escape here rather than a pasted character.
  it('the Latin domain keeps its LRM isolation inside the Arabic sentence', () => {
    const arabic = privacyHtml.split('<div class="privacy-arabic"')[1] ?? '';
    const LRM = '\u200E';
    expect(arabic).toContain(`${LRM}fulus.sa${LRM}`);
  });
});
