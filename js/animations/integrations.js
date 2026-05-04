// js/animations/integrations.js
import { reducedMotion, isMobile } from '../lib.js';

export function initIntegrations() {
  const ring = document.querySelector('#integrations .orbit-ring-1');
  const icons = gsap.utils.toArray('#integrations .orbit-icon');
  if (reducedMotion || isMobile() || !ring) return;

  // Continuous rotation of the ring; icons counter-rotate to stay upright.
  gsap.to(ring, { rotation: 360, repeat: -1, duration: 60, ease: 'none' });
  icons.forEach((icon) => {
    gsap.to(icon, { rotation: -360, repeat: -1, duration: 60, ease: 'none' });
  });

  // Section reveal.
  gsap.from('#integrations .orbit', {
    opacity: 0, scale: 0.95, duration: 0.6, ease: 'power3.out',
    scrollTrigger: { trigger: '#integrations', start: 'top 70%', once: true },
  });
}
