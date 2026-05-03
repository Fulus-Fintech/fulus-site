// js/lib.js — shared helpers

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => window.matchMedia('(max-width: 809.98px)').matches;
export const isTablet = () => window.matchMedia('(min-width: 810px) and (max-width: 1439.98px)').matches;
export const isDesktop = () => window.matchMedia('(min-width: 1440px)').matches;

/** Sign-flip an X-axis tween value when html[dir="rtl"]. */
export function rtlAware(x) {
  return document.documentElement.dir === 'rtl' ? -x : x;
}

/** Debounce a function. */
export function debounce(fn, wait = 150) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Wait for an element to exist; resolves with the element. */
export function waitFor(selector, root = document) {
  return new Promise((resolve) => {
    const el = root.querySelector(selector);
    if (el) return resolve(el);
    const obs = new MutationObserver(() => {
      const found = root.querySelector(selector);
      if (found) {
        obs.disconnect();
        resolve(found);
      }
    });
    obs.observe(root, { childList: true, subtree: true });
  });
}
