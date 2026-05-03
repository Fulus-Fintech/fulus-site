// js/main.js — entry; wires i18n, Lenis, animations.

import { reducedMotion } from './lib.js';
import { initI18n } from './i18n.js';
import { initHero } from './animations/hero.js';
import { initBenefits } from './animations/benefits.js';
import { initServices } from './animations/services.js';
import { initFeatures } from './animations/features.js';
import { initProcess } from './animations/process.js';
import { initStories } from './animations/stories.js';
import { initIntegrations } from './animations/integrations.js';
import { initPricing } from './animations/pricing.js';
import { initComparison } from './animations/comparison.js';
import { initFaq } from './animations/faq.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. i18n boot — apply stored/detected lang before paint.
  await initI18n();

  const { setLang, getLang } = await import('./i18n.js');
  function syncLangButtons() {
    const cur = getLang();
    document.querySelectorAll('.lang-btn').forEach((b) => {
      const isActive = b.dataset.lang === cur;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });
  }
  syncLangButtons();
  document.addEventListener('langchange', syncLangButtons);
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });

  const hamburger = document.querySelector('.hamburger');
  const navMobile = document.getElementById('nav-mobile');
  if (hamburger && navMobile) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!open));
      navMobile.hidden = open;
    });
    navMobile.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        hamburger.setAttribute('aria-expanded', 'false');
        navMobile.hidden = true;
      }),
    );
  }

  // 2. GSAP + ScrollTrigger setup (loaded via CDN; available on window).
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.error('[fulus-site] GSAP or ScrollTrigger missing; animations skipped.');
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // 3. Lenis smooth scroll. Skipped under reduced-motion.
  let lenis = null;
  if (!reducedMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Anchor links use Lenis.
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const target = document.getElementById(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { duration: 1.2 });
        }
      });
    });
  }

  // 4. Per-section animation modules. Each handles its own reduced-motion / mobile gating.
  initHero(lenis);
  initBenefits();
  initServices(lenis);
  initFeatures();
  initProcess();
  initStories();
  initIntegrations();
  initPricing();
  initComparison();
  initFaq();
});
