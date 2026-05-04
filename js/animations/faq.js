// js/animations/faq.js
import { reducedMotion } from '../lib.js';

export function initFaq() {
  const items = gsap.utils.toArray('#faq .faq-item');
  // Browser-native <details> handles open/close. We add: close-others + smooth height tween on the answer.
  items.forEach((item) => {
    const summary = item.querySelector('summary');
    const answer = item.querySelector('.answer');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = item.hasAttribute('open');
      // Close others.
      items.forEach((other) => {
        if (other !== item && other.hasAttribute('open')) {
          collapse(other);
        }
      });
      if (isOpen) collapse(item);
      else expand(item);
    });
  });

  function expand(item) {
    const answer = item.querySelector('.answer');
    item.setAttribute('open', '');
    if (reducedMotion) return;
    gsap.fromTo(answer, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' });
  }
  function collapse(item) {
    const answer = item.querySelector('.answer');
    if (reducedMotion) { item.removeAttribute('open'); return; }
    gsap.to(answer, {
      height: 0, opacity: 0, duration: 0.25, ease: 'power2.in',
      onComplete: () => { item.removeAttribute('open'); gsap.set(answer, { height: 'auto' }); },
    });
  }
}
