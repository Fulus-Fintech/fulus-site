// js/animations/benefits.js
import { reducedMotion } from '../lib.js';

export function initBenefits() {
  if (reducedMotion) {
    gsap.set('#benefits .benefit-card', { opacity: 1, y: 0 });
    return;
  }
  gsap.from('#benefits .benefit-card', {
    opacity: 0,
    y: 30,
    duration: 0.6,
    ease: 'power3.out',
    stagger: 0.15,
    scrollTrigger: { trigger: '#benefits', start: 'top 70%', once: true },
  });
}
