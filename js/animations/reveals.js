// js/animations/reveals.js — signature moment #3: 400 ms fade-up reveals with
// 50 ms child staggers. Hooks: [data-reveal] singles (default y 24; the
// data-reveal="x" variant enters horizontally from the reading-start edge —
// left in LTR, right in RTL), [data-reveal-group] containers whose direct
// children stagger. All play-once ('play none none none'); all ScrollTriggers
// created only after the window load event (spec §6). Content is authored
// visible; gsap.from() is the only thing that ever hides it, and only in the
// no-preference branch — JS-off / reduced-motion pages are complete.
// Authoring rule (spec §6): never put [data-reveal] within ~200 px of either
// email field.

/* global gsap */

export function initReveals(mm) {
  if (!document.documentElement.classList.contains('js')) return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tweens = [];
    let built = false;

    const build = () => {
      if (built) return;
      built = true;
      const rtl = document.documentElement.dir === 'rtl';
      const xStart = rtl ? 24 : -24; // enter FROM the reading-start edge

      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        // Direct children of a group stagger with the group, not solo.
        if (el.parentElement && el.parentElement.hasAttribute('data-reveal-group')) return;
        const fromVars = el.getAttribute('data-reveal') === 'x'
          ? { x: xStart, opacity: 0 }
          : { y: 24, opacity: 0 };
        gsap.set(el, { willChange: 'transform, opacity' }); // spec §6: will-change before animating
        tweens.push(gsap.from(el, {
          ...fromVars,
          duration: 0.4,      // sanctioned 400 ms
          ease: 'power2.out', // core approximation of cubic-bezier(0.4,0,0.2,1)
          clearProps: 'willChange', // spec §6: removed after the reveal completes
          scrollTrigger: {
            trigger: el,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }));
      });

      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        const children = Array.from(group.children);
        if (!children.length) return;
        gsap.set(children, { willChange: 'transform, opacity' }); // spec §6: will-change before animating
        tweens.push(gsap.from(children, {
          y: 24,
          opacity: 0,
          duration: 0.4,
          stagger: 0.05,      // sanctioned 50 ms
          ease: 'power2.out',
          clearProps: 'willChange', // spec §6: removed after the reveal completes
          scrollTrigger: {
            trigger: group,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }));
      });
    };

    if (document.readyState === 'complete') {
      build();
    } else {
      window.addEventListener('load', build, { once: true });
    }

    return () => { // reduced-motion toggled on: land everything visible, drop triggers
      window.removeEventListener('load', build);
      tweens.forEach((tw) => {
        if (tw.scrollTrigger) tw.scrollTrigger.kill();
        tw.progress(1).kill();
      });
    };
  });
}
