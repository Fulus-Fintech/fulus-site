// js/main.js — entry: html.js flag, i18n boot, lang buttons, waitlist,
// GSAP matchMedia motion, langchange plumbing. No Lenis — native scroll.

import { initI18n, setLang, getLang } from './i18n.js';
import { initWaitlist } from './waitlist.js';
import { initHero, resplitHero } from './animations/hero.js';
import { initPortals } from './animations/portals.js';
import { initReveals } from './animations/reveals.js';

// First executed statement (the imports above are hoisted declarations):
// mark JS-on. CSS/animations may only hide content under `html.js`.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', async () => {
  // 1. i18n boot — apply stored/detected lang before anything reads the dict.
  // Defense in depth: i18n.js already guards its own localStorage calls, but
  // if it throws for any other reason (fetch failure, etc.) the page must
  // still degrade to English and the waitlist form must still attach.
  try {
    await initI18n();
  } catch (err) {
    console.error('[fulus-site] i18n init failed; continuing with EN fallback.', err);
  }

  // 2. Language toggle buttons (aria-pressed per the a11y law).
  function syncLangButtons() {
    const cur = getLang();
    document.querySelectorAll('.lang-btn').forEach((b) => {
      const isActive = b.dataset.lang === cur;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  }
  syncLangButtons();
  document.addEventListener('langchange', syncLangButtons);
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });

  // 3. Waitlist forms — independent of GSAP; must work even if the CDN fails.
  initWaitlist();

  // 4. Motion. CDN-loaded globals; if any script failed, the page stays
  // complete and static (visible-by-default law).
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined'
      || typeof SplitText === 'undefined') {
    console.error('[fulus-site] GSAP/ScrollTrigger/SplitText missing; static page shown.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  const mm = gsap.matchMedia();

  // Reduced-motion branch: registered explicitly and calls NOTHING —
  // the page is complete statically. Keep it empty forever.
  mm.add('(prefers-reduced-motion: reduce)', () => {});

  // Desktop / mobile tuning seams — intentionally empty today (the three
  // modules are breakpoint-agnostic); device-specific overrides land here
  // without re-plumbing.
  mm.add('(min-width: 810px)', () => {});
  mm.add('(max-width: 809.98px)', () => {});

  // Each module registers its own '(prefers-reduced-motion: no-preference)'
  // work on the shared matchMedia instance.
  initHero(mm);
  initPortals(mm);
  initReveals(mm);

  // 5. Language/direction changed (i18n.js dispatches on document AFTER the
  // dict is applied): re-split the hero headline, then re-measure every
  // ScrollTrigger for the new text metrics + RTL flip (spec §6).
  document.addEventListener('langchange', () => {
    resplitHero();
    ScrollTrigger.refresh();
  });
});
