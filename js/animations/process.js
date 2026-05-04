// js/animations/process.js
import { reducedMotion } from '../lib.js';

export function initProcess() {
  const cards = gsap.utils.toArray('#process .process-card');
  const nums = gsap.utils.toArray('#process .num');
  const linePath = document.querySelector('#process .process-line path');

  if (reducedMotion) {
    gsap.set(cards, { opacity: 1, y: 0 });
    nums.forEach((n) => { n.textContent = n.dataset.counter; });
    if (linePath) gsap.set(linePath, { strokeDashoffset: 0 });
    return;
  }

  const tl = gsap.timeline({
    scrollTrigger: { trigger: '#process', start: 'top 70%', once: true },
  });

  tl.from(cards, { opacity: 0, y: 30, duration: 0.5, stagger: 0.15, ease: 'power3.out' }, 0);

  nums.forEach((n) => {
    const target = parseInt(n.dataset.counter, 10);
    const obj = { v: 0 };
    tl.to(obj, {
      v: target, duration: 0.6, ease: 'power2.out',
      onUpdate: () => { n.textContent = Math.round(obj.v); },
    }, 0.2);
  });

  if (linePath) {
    tl.to(linePath, { strokeDashoffset: 0, duration: 1.0, ease: 'power2.inOut' }, 0.4);
  }
}
