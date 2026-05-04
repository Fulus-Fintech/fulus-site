// js/animations/features.js
import { reducedMotion, rtlAware } from '../lib.js';

export function initFeatures() {
  const items = gsap.utils.toArray('#features .feature-list li');
  if (reducedMotion) { gsap.set(items, { opacity: 1 }); return; }
  items.forEach((li, i) => {
    gsap.from(li, {
      opacity: 0,
      x: rtlAware(-16),
      duration: 0.5,
      ease: 'power2.out',
      delay: i * 0.08,
      scrollTrigger: { trigger: li, start: 'top 85%', once: true },
    });
  });
}
