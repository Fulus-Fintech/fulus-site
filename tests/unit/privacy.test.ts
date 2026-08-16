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
    ['قائمة الانتظار', /قائمة\s*(ال)?انتظار/],
  ])('the page no longer mentions %s', (_label, pattern) => {
    expect(privacyHtml).not.toMatch(pattern);
  });

  // 'your email address' USED to be banned outright, because the only email the
  // page could describe was the retired waitlist's. The page is now app-scoped
  // and the app genuinely does collect one at sign-up, so a blanket ban would
  // forbid a true statement. The guard that matters is unchanged above: the
  // WAITLIST must stay gone. This narrows the ban to the site-analytics section,
  // which is the part that still collects nothing.
  it('the site-analytics section claims no email, because the site takes none', () => {
    const siteSection = /<section class="privacy-block">(?:(?!<\/section>)[\s\S])*?Two counts[\s\S]*?<\/section>/
      .exec(privacyHtml)?.[0];
    expect(siteSection, 'the "Two counts" analytics section is missing').toBeDefined();
    expect(siteSection).not.toMatch(/email/i);
  });

  it('the meta description describes what the page now covers', () => {
    const description = /<meta\s+name="description"\s+content="([^"]+)"/.exec(privacyHtml)?.[1];
    expect(description, 'privacy.html lost its meta description').toBeDefined();
    expect(description).not.toMatch(/waitlist/i);
    // Was /no cookies/i, which described a site-only disclosure. The page now
    // covers the app as well, so the description has to name the app — that is
    // the thing a stale description would get wrong.
    expect(description).toMatch(/app/i);
  });
});

describe('every “we do not” on the page is true of the code', () => {
  it('“No cookies” — nothing on this site touches a cookie or browser storage', () => {
    // The claim moved from its own sentence ("No cookies.") into a list
    // ("No cookies, no trackers ..."), so the period is no longer there. The
    // claim itself is what this test is for, not its punctuation.
    expect(privacyHtml).toMatch(/No cookies[.,]/);
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
  // A Latin domain inside an RTL sentence must be ISOLATED, or the surrounding
  // punctuation re-orders around it. Three spellings are all correct:
  //   - <bdi>, the element that exists for exactly this \u2014 what the page uses
  //   - dir="ltr" on the wrapper, which the HTML spec gives `unicode-bidi:
  //     isolate` in the UA stylesheet
  //   - U+200E on both sides (invisible, so an editor can drop it without trace)
  // This asserts the OUTCOME rather than one spelling, so improving the
  // technique does not read as a regression while dropping isolation still
  // fails. Occurrences inside a tag (href="mailto:support@fulus.sa") are
  // skipped: an attribute is not rendered text and cannot be re-ordered.
  it('every Latin domain in the Arabic TEXT is bidi-isolated', () => {
    const arabic = privacyHtml.split('<div class="privacy-arabic"')[1] ?? '';
    expect(arabic, 'the Arabic legal text is missing').toBeTruthy();
    const LRM = '\u200E';
    const inMarkup = (idx: number): boolean =>
      arabic.lastIndexOf('<', idx) > arabic.lastIndexOf('>', idx);

    const textOccurrences = [...arabic.matchAll(/fulus\.sa/g)]
      .map((m) => m.index ?? 0)
      .filter((idx) => !inMarkup(idx));
    expect(textOccurrences.length, 'no rendered Latin domain found in the Arabic text')
      .toBeGreaterThan(0);

    for (const idx of textOccurrences) {
      const before = arabic.slice(Math.max(0, idx - 80), idx);
      const isolated =
        arabic.slice(idx - 1, idx) === LRM ||
        /<bdi\b[^>]*>[^<]*$/.test(before) ||
        /<[a-z]+[^>]*\bdir="ltr"[^>]*>[^<]*$/.test(before);
      expect(isolated, `fulus.sa at ${idx} is rendered text but not bidi-isolated`).toBe(true);
    }
  });
});
