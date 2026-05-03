// js/i18n.js — language toggle + dictionary apply.

const SUPPORTED = ['en', 'ar'];
const STORAGE_KEY = 'fulus.lang';
const ARABIC_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;700&display=swap';

let dictionary = {};

function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : 'en';
}

async function loadDictionary(lang) {
  const res = await fetch(`/i18n/${lang}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`i18n: failed to load ${lang}.json (${res.status})`);
  return res.json();
}

function ensureArabicFont() {
  if (document.querySelector('link[data-i18n-font="ar"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = ARABIC_FONT_HREF;
  link.crossOrigin = 'anonymous';
  link.dataset.i18nFont = 'ar';
  document.head.appendChild(link);
}

function applyDictionary(dict) {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const attr = el.getAttribute('data-i18n-attr');
    const val = dict[key];
    if (val == null) return;
    if (attr) {
      el.setAttribute(attr, val);
    } else {
      el.textContent = val;
    }
  });
  if (dict['meta.title']) document.title = dict['meta.title'];
}

export async function setLang(lang) {
  if (!SUPPORTED.includes(lang)) return;
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  html.dataset.lang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  if (lang === 'ar') ensureArabicFont();
  dictionary = await loadDictionary(lang);
  applyDictionary(dictionary);
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export async function initI18n() {
  const initial = detectInitialLang();
  await setLang(initial);
}

export function getLang() {
  return document.documentElement.lang || 'en';
}
