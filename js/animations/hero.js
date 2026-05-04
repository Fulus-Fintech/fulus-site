// js/animations/hero.js
import { reducedMotion } from '../lib.js';

export function initHero(/* lenis */) {
  if (reducedMotion) {
    // Set everything to final state instantly.
    gsap.set('.hero-headline .word, .hero-subhead, .hero-cta, .phone-mockup', { opacity: 1, y: 0, scale: 1 });
    gsap.set('.phone-chart path', { strokeDashoffset: 0 });
    document.querySelectorAll('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter);
      const prefix = el.dataset.counterPrefix || '';
      el.textContent = prefix + formatNumber(target, el);
    });
    return;
  }

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Words stagger.
  tl.from('.hero-headline .word', { opacity: 0, y: 24, duration: 0.6, stagger: 0.06 }, 0);
  // Subhead.
  tl.from('.hero-subhead', { opacity: 0, y: 16, duration: 0.6 }, 0.4);
  // CTAs.
  tl.from('.hero-cta .btn', { opacity: 0, x: -12, duration: 0.5, stagger: 0.08 }, 0.55);
  // Phone scale-in.
  tl.from('.phone-frame', { opacity: 0, scale: 0.92, rotation: -2, duration: 0.8, ease: 'expo.out' }, 0.3);
  // Chart draw.
  tl.to('.phone-chart path', { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.7);
  // Counters.
  document.querySelectorAll('[data-counter]').forEach((el) => {
    const target = parseFloat(el.dataset.counter);
    const prefix = el.dataset.counterPrefix || '';
    const obj = { v: 0 };
    tl.to(obj, {
      v: target,
      duration: 0.8,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = prefix + formatNumber(obj.v, el); },
    }, 0.8);
  });
}

function formatNumber(n, el) {
  // BTC has integer prices; others have 2 decimals. Heuristic: if data-counter integer, no decimals.
  const target = parseFloat(el.dataset.counter);
  const isInt = Number.isInteger(target);
  if (isInt) return Math.round(n).toLocaleString();
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
