// js/animations/comparison.js
import { reducedMotion, rtlAware } from '../lib.js';

export function initComparison() {
  const rows = gsap.utils.toArray('#comparison .compare-list li');
  if (reducedMotion) { gsap.set(rows, { opacity: 1 }); return; }

  rows.forEach((row, i) => {
    const check = row.querySelector('.check');
    const text = row.querySelector('span:not(.check)');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: row, start: 'top 85%', once: true },
      delay: i * 0.08,
    });
    tl.from(check, { scale: 0, duration: 0.4, ease: 'back.out(2)' }, 0);
    tl.from(text, { opacity: 0, x: rtlAware(16), duration: 0.4, ease: 'power2.out' }, 0.15);
  });
}
