// js/animations/hero.js — signature moment #1: hero headline line-mask reveal.
// ~0.8 s, once per page load. SplitText type:'lines' ONLY (never chars/words —
// Arabic connected script would corrupt), split after document.fonts.ready;
// mask:'lines' (GSAP ≥3.13) wraps each line in an overflow-hidden element.
// Reduced-motion: initHero's mm branch never runs — headline stays static and
// visible. Nothing here hides content outside a gsap tween (visible-by-default law).

/* global gsap, SplitText */

const SELECTOR = '.hero-head[data-split]';
const SPLIT_VARS = { type: 'lines', mask: 'lines', linesClass: 'hero-line' };

let split = null;
let tween = null;
let played = false; // the intro runs once per page load
let active = false; // true while the no-preference matchMedia branch is live

export function initHero(mm) {
  if (!document.documentElement.classList.contains('js')) return;
  const head = document.querySelector(SELECTOR);
  if (!head || typeof SplitText === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    active = true;
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (cancelled || played || split) return;
      buildAndPlay(head);
    });
    return () => { // user toggled reduced-motion ON mid-session
      cancelled = true;
      active = false;
      teardown(head);
    };
  });
}

// langchange guard — called from main.js AFTER js/i18n.js applied the new
// dictionary. applyDictionary() has already overwritten the h1's textContent
// (destroying the split wrappers), and SplitText.revert() would resurrect the
// OLD-language markup — so: revert, re-apply the current dict string, re-split.
export function resplitHero() {
  if (!active) return; // reduced-motion / GSAP absent: i18n already fixed the text
  const head = document.querySelector(SELECTOR);
  if (!head) return;
  teardown(head);
  document.fonts.ready.then(() => {
    if (!active || split) return;
    if (played) {
      split = SplitText.create(head, SPLIT_VARS);
      gsap.set(split.lines, { yPercent: 0 }); // final state; the intro never replays
    } else {
      buildAndPlay(head); // langchange raced the initial load — play it properly
    }
  });
}

function buildAndPlay(head) {
  split = SplitText.create(head, SPLIT_VARS);
  gsap.set(split.lines, { willChange: 'transform, opacity' }); // spec §6: hint compositor just before animating
  tween = gsap.from(split.lines, {
    yPercent: 110,
    duration: 0.8,      // sanctioned 800 ms
    stagger: 0.06,      // sanctioned 60 ms
    ease: 'power2.out', // closest core ease to the brand curve cubic-bezier(0.4,0,0.2,1);
                        // the exact curve needs CustomEase = a 4th CDN script vs the
                        // three-script pin (recorded plan deviation)
    clearProps: 'willChange', // spec §6: drop will-change once the reveal finishes
    onComplete: () => { played = true; },
  });
}

function teardown(head) {
  if (tween) {
    tween.kill();
    tween = null;
    played = true; // never replay after a teardown mid/post-flight
  }
  if (split) {
    split.revert(); // restores the innerHTML captured at split time…
    split = null;
    // …which may be stale after a langchange — re-apply the current dictionary.
    const key = head.getAttribute('data-i18n');
    const dict = window.__fulusDict || {};
    if (key && dict[key] != null) head.textContent = dict[key];
  }
}
