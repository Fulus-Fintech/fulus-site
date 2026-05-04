// js/animations/stories.js
import { reducedMotion, isMobile } from '../lib.js';

export function initStories() {
  const cards = gsap.utils.toArray('#stories .testimonial');
  const pull = document.querySelector('#stories .pull-quote');

  if (reducedMotion) { gsap.set([cards, pull], { opacity: 1, y: 0, scale: 1 }); return; }

  // Reveal.
  gsap.from(cards, {
    opacity: 0, y: 30, duration: 0.6, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '#stories', start: 'top 70%', once: true },
  });
  if (pull) {
    gsap.from(pull, {
      opacity: 0, scale: 0.95, duration: 0.6, ease: 'power3.out',
      scrollTrigger: { trigger: pull, start: 'top 80%', once: true },
    });
  }

  if (isMobile()) return; // skip parallax + tilt on mobile

  // Parallax — different scroll speeds per card.
  cards.forEach((card) => {
    const factor = parseFloat(card.dataset.parallax || '0');
    if (factor === 0) return;
    gsap.to(card, {
      yPercent: factor,
      ease: 'none',
      scrollTrigger: { trigger: '#stories', start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  });

  // 3D tilt on hover.
  cards.forEach((card) => {
    card.style.transformStyle = 'preserve-3d';
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, { rotateY: x * 6, rotateX: -y * 6, duration: 0.4 });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.4 });
    });
  });
}
