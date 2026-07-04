// js/i18n.js — language toggle + dictionary apply.

const SUPPORTED = ['en', 'ar'];
const STORAGE_KEY = 'fulus.lang';

let dictionary = {};

function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : 'en';
}

async function loadDictionary(lang) {
  const res = await fetch(`/i18n/${lang}.json`);
  if (!res.ok) throw new Error(`i18n: failed to load ${lang}.json (${res.status})`);
  return res.json();
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
  dictionary = await loadDictionary(lang);
  window.__fulusDict = dictionary;
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
