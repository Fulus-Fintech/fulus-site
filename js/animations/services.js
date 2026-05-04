// js/animations/services.js
import { reducedMotion, isDesktop } from '../lib.js';

export function initServices(/* lenis */) {
  const cards = gsap.utils.toArray('#services .service-card');
  if (reducedMotion || cards.length === 0) {
    gsap.set(cards, { opacity: 1, y: 0 });
    return;
  }

  if (!isDesktop()) {
    // Mobile / tablet: simple stagger.
    gsap.from(cards, {
      opacity: 0,
      y: 30,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: { trigger: '#services', start: 'top 70%', once: true },
    });
    return;
  }

  // Desktop: scroll-pinned card swap.
  // Pin the section while scrolling vertically; cards translate horizontally.
  const stack = document.querySelector('#services .services-stack');
  const totalScroll = (cards.length - 1) * 100; // vh-equivalent

  gsap.set(stack, { display: 'flex', flexDirection: 'row', gap: '24px' });
  gsap.set(cards, { flex: '0 0 320px' });

  gsap.to(stack, {
    x: () => -(stack.scrollWidth - window.innerWidth + 48),
    ease: 'none',
    scrollTrigger: {
      trigger: '#services',
      pin: true,
      start: 'top top',
      end: () => `+=${totalScroll}vh`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
}
