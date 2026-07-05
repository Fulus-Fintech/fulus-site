// js/animations/portals.js — signature moment #2: Portal light-state
// progressions. State classes (exactly one per portal, CSS owns the 600 ms
// light transition): is-closed → is-invitation → is-activated. The Portal
// geometry NEVER animates and NEVER mirrors in RTL — only the light changes.
// Play-once semantics: ScrollTrigger.create({ once:true, onEnter }) is the
// callback equivalent of toggleActions 'play none none none'.
// Reduced-motion: this module's mm branch never runs; portals keep their
// authored states (hero: is-invitation, cta: is-activated) — page complete.

/* global ScrollTrigger */

const STATES = ['is-closed', 'is-invitation', 'is-activated'];

function setState(el, state) {
  STATES.forEach((s) => el.classList.remove(s));
  el.classList.add(state);
}

function nextState(el) {
  const i = STATES.findIndex((s) => el.classList.contains(s));
  if (i === -1) return 'is-invitation';
  return STATES[Math.min(i + 1, STATES.length - 1)];
}

export function initPortals(mm) {
  if (!document.documentElement.classList.contains('js')) return;
  if (typeof ScrollTrigger === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const cleanups = [];

    // CTA portal: always fully lit (re-assert the authored state).
    document.querySelectorAll('.portal--cta').forEach((p) => setState(p, 'is-activated'));

    // Hero portal: is-invitation → is-activated on the hero form's first
    // interaction, or after 1.2 s — whichever comes first.
    const heroPortal = document.querySelector('.portal--hero');
    if (heroPortal) {
      let done = false;
      const activate = () => {
        if (done) return;
        done = true;
        setState(heroPortal, 'is-activated');
      };
      const timer = setTimeout(activate, 1200);
      const heroForm = document.querySelector('form.waitlist-form[data-form="hero"]');
      if (heroForm) {
        heroForm.addEventListener('focusin', activate, { once: true });
        heroForm.addEventListener('input', activate, { once: true });
      }
      cleanups.push(() => clearTimeout(timer));
    }

    // Marker portals: one play-once upgrade each, at 75% viewport. Target
    // state comes from the optional data-state-target attr; without it the
    // portal simply advances one step from its authored state.
    const armMarkers = () => {
      document.querySelectorAll('.portal--marker').forEach((el) => {
        const target = el.getAttribute('data-state-target') || nextState(el);
        const st = ScrollTrigger.create({
          trigger: el,
          start: 'top 75%',
          once: true, // play-once (callback form of 'play none none none')
          onEnter: () => setState(el, target),
        });
        cleanups.push(() => st.kill());
      });
    };
    // Below-fold ScrollTriggers init after the load event (spec §6 budget rule).
    if (document.readyState === 'complete') {
      armMarkers();
    } else {
      window.addEventListener('load', armMarkers, { once: true });
      cleanups.push(() => window.removeEventListener('load', armMarkers));
    }

    return () => cleanups.forEach((fn) => fn());
  });
}
