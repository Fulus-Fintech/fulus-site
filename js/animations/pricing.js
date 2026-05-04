// js/animations/pricing.js
import { reducedMotion } from '../lib.js';

export function initPricing() {
  const cards = gsap.utils.toArray('#pricing .price-card');
  const popular = document.querySelector('#pricing .price-card.popular');
  if (reducedMotion) { gsap.set(cards, { opacity: 1, y: 0 }); return; }

  gsap.from(cards, {
    opacity: 0, y: 24, duration: 0.5, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '#pricing', start: 'top 70%', once: true },
  });

  if (popular) {
    // Subtle accent-glow pulse on the popular card's box-shadow via CSS variable.
    gsap.to(popular, {
      boxShadow: '0 0 48px rgba(0, 255, 178, 0.18)',
      duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut',
    });
  }
}
