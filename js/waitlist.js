// js/waitlist.js — waitlist behavior: the two forms, invisible Turnstile,
// join/status/profile API calls, the confirmation state, localStorage
// persistence, and langchange re-rendering.
//
// Binding contracts (plan header "Shared Interface Contracts"): Waitlist API,
// DOM contract, fixed i18n keys, localStorage keys, Turnstile. Every name
// below matches them character-for-character.

// -------------------------------------------------------------- constants

const API_URL = 'https://zainebbvseprgngrrovk.supabase.co/functions/v1/join-waitlist';

// Cloudflare's always-pass INVISIBLE test site key (the `…BB` dummy issues a
// token with no visible challenge; `…AA` is the VISIBLE variant — wrong here).
// Invisibility comes from the sitekey's widget type, not a render param.
// The Rollout task at the end of this plan (pre-merge cutover, "swap the
// Turnstile key" step) replaces it with the founder's production fulus.sa key
// (which must be created as the invisible widget type).
const TURNSTILE_SITE_KEY = '1x00000000000000000000BB';

const LS_WAITLIST = 'fulus.waitlist'; // JSON {"position":n,"referral_code":s}
const LS_REF = 'fulus.ref';           // captured ?ref= value
const REFERRAL_BASE = 'https://fulus.sa/?ref=';

// EN fallbacks for EVERY fixed i18n key — used when window.__fulusDict is
// absent or missing a key (e.g. the dictionary fetch failed).
// These 20 values are copied CHARACTER-FOR-CHARACTER from i18n/en.json (Task 7);
// en.json is the single source of truth so the baked fallback never diverges
// from the loaded dictionary. A change to en.json's fixed keys must be mirrored
// here in the same commit.
const EN_FALLBACK = {
  'form.cta': 'Save My Spot',
  'form.sending': 'Sending…',
  'form.err.invalid': 'That email doesn’t look right — check it and try again.',
  'form.err.network': 'Couldn’t reach the server — try again.',
  'form.err.captcha': 'Verification didn’t pass — try again.',
  'form.err.generic': 'Something went wrong on our side — try again in a moment.',
  'confirm.title': 'You’re on the list.',
  'confirm.position': 'You’re #{n} in line.',
  'confirm.already': 'You’re already on the list — you’re #{n}.',
  'confirm.referral.head': 'Bring your club.',
  'confirm.referral.sub': 'Referrals move you into earlier invite waves.',
  'confirm.count': '{n} joined through your link.',
  'confirm.share': 'Share on WhatsApp',
  'confirm.copy': 'Copy Link',
  'confirm.copied': 'Copied',
  'confirm.profile.q1': 'Your club — existing or new?',
  'confirm.profile.q1.existing': 'We already invest together',
  'confirm.profile.q1.new': 'Starting fresh',
  'confirm.profile.q2': 'How many people?',
  'confirm.profile.thanks': 'Noted — thanks.',
};

// WhatsApp share message. Baked in here (NOT a dictionary key) because the
// fixed i18n key set has no share-message key — recorded as a plan deviation.
// The Arabic string is a working draft, ship-gated on native-speaker review
// like all AR copy.
const SHARE_MSG = {
  en: 'I just joined the waitlist for Fulus — one app for investment clubs. Grab a spot:',
  ar: 'سجّلت في قائمة انتظار فلوس — تطبيق واحد لنوادي الاستثمار. احجز مكانك:',
};

// ---------------------------------------------------------------- helpers

function t(key) {
  const dict = window.__fulusDict || {};
  if (dict[key] != null) return dict[key];
  if (EN_FALLBACK[key] != null) return EN_FALLBACK[key];
  return key;
}

// Literal-{n} interpolation per the contract: {n} → String(value).
function fmt(key, n) {
  return t(key).split('{n}').join(String(n));
}

// Same interpolation, but written into an element with the value wrapped in a
// <bdi> (safe element construction, never innerHTML) so a Western numeral
// never reorders next to punctuation inside RTL Arabic copy (RTL law, spec §8).
function fmtInto(el, key, n) {
  el.replaceChildren();
  const parts = t(key).split('{n}');
  parts.forEach((part, i) => {
    if (part) el.appendChild(document.createTextNode(part));
    if (i < parts.length - 1) {
      const bdi = document.createElement('bdi');
      bdi.textContent = String(n);
      el.appendChild(bdi);
    }
  });
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) { /* storage disabled */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (_) { /* storage disabled */ }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ---------------------------------------- ?ref= capture (runs on module load)

try {
  const ref = new URLSearchParams(location.search).get('ref');
  if (ref) safeSet(LS_REF, ref.trim());
} catch (_) { /* malformed search string — nothing to capture */ }

// -------------------------------------------------------------- turnstile

let turnstileReadyPromise = null;

// render=explicit flow: api.js?render=explicit defines window.turnstile
// without auto-rendering. We honor window.onloadTurnstileCallback in case the
// script tag ever gains ?onload=, and poll as the universal fallback.
function whenTurnstileReady() {
  if (turnstileReadyPromise) return turnstileReadyPromise;
  turnstileReadyPromise = new Promise((resolve) => {
    if (window.turnstile) { resolve(window.turnstile); return; }
    let done = false;
    let waited = 0;
    const settle = () => {
      if (done) return;
      done = true;
      clearInterval(poll);
      resolve(window.turnstile || null);
    };
    const prev = window.onloadTurnstileCallback;
    window.onloadTurnstileCallback = () => {
      if (typeof prev === 'function') prev();
      settle();
    };
    const poll = setInterval(() => {
      waited += 200;
      if (window.turnstile || waited >= 20000) settle();
    }, 200);
  });
  return turnstileReadyPromise;
}

// One invisible widget per form's .turnstile-slot. Token arrives via callback.
async function mountTurnstile(entry) {
  const ts = await whenTurnstileReady();
  if (!ts || !entry.slot || entry.widgetId != null) return;
  entry.widgetId = ts.render(entry.slot, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (token) => {
      if (entry.pendingToken) entry.pendingToken.resolve(token);
    },
    'error-callback': () => {
      if (entry.pendingToken) entry.pendingToken.resolve(null);
    },
    'expired-callback': () => {
      if (entry.pendingToken) entry.pendingToken.resolve(null);
    },
  });
}

function getTurnstileToken(entry) {
  return new Promise((resolve) => {
    const ts = window.turnstile;
    if (!ts || entry.widgetId == null) { resolve(null); return; }
    let settled = false;
    const finish = (token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      entry.pendingToken = null;
      resolve(token);
    };
    const timer = setTimeout(() => finish(null), 30000);
    // Tokens are single-use: reset before every execute (harmless on a fresh widget).
    try { ts.reset(entry.widgetId); } catch (_) { /* fresh widget */ }
    entry.pendingToken = { resolve: finish };
    try { ts.execute(entry.widgetId); } catch (_) { finish(null); }
  });
}

// ------------------------------------------------------------------ forms

const forms = []; // { form, kind, email, button, msg, slot, widgetId, pendingToken, lastMsgKey }

// Wires one `form.waitlist-form` element: builds its entry, registers the
// submit handler, and fires the Turnstile mount. Used both at init time (for
// the forms present in the initial markup) and by the invalid-referral-code
// fallback in bootFromCache(), which restores a fresh hero form into
// #hero-panel and needs it wired the same way.
function wireForm(form) {
  const entry = {
    form,
    kind: form.getAttribute('data-form'), // 'hero' | 'final'
    email: form.querySelector('input[type="email"][name="email"]'),
    button: form.querySelector('button[type="submit"]'),
    msg: form.querySelector('.form-msg'),
    slot: form.querySelector('.turnstile-slot'),
    widgetId: null,
    pendingToken: null,
    lastMsgKey: null,
  };
  if (!entry.email || !entry.button || !entry.msg) return null;
  forms.push(entry);
  form.setAttribute('novalidate', ''); // our localized messages, not the UA bubble
  form.addEventListener('submit', (e) => { onJoinSubmit(entry, e); });
  mountTurnstile(entry); // fire-and-forget; retried inside submit if needed
  return entry;
}

function setMsg(entry, key) {
  entry.lastMsgKey = key || null;
  entry.msg.textContent = key ? t(key) : '';
  // Task 8 contract: toggle .form-msg.is-error / .is-success. All messages in
  // this flow are the form.err.* validation/error keys, so is-error tracks
  // those; clearing (key falsy) or any non-error key removes BOTH classes so
  // a stale error color never lingers.
  const isError = typeof key === 'string' && key.indexOf('form.err.') === 0;
  entry.msg.classList.toggle('is-error', isError);
  entry.msg.classList.remove('is-success');
}

function setBusy(entry, busy) {
  entry.button.disabled = busy;
  entry.button.textContent = busy ? t('form.sending') : t('form.cta');
}

async function onJoinSubmit(entry, event) {
  event.preventDefault();
  const email = entry.email.value.trim().toLowerCase();
  setMsg(entry, null);
  if (!EMAIL_RE.test(email)) {
    setMsg(entry, 'form.err.invalid'); // client-side block: NO network call
    entry.email.focus();
    return;
  }
  setBusy(entry, true);
  try {
    await mountTurnstile(entry); // no-op if already rendered
    const turnstileToken = await getTurnstileToken(entry);
    if (!turnstileToken) {
      setMsg(entry, 'form.err.captcha');
      return;
    }
    const body = {
      action: 'join',
      email,
      locale: document.documentElement.lang || 'en',
      ref: safeGet(LS_REF) || undefined,
      source: new URLSearchParams(location.search).get('utm_source') || undefined,
      turnstileToken,
    };
    let res;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body), // undefined keys are dropped by JSON.stringify
      });
    } catch (_) {
      setMsg(entry, 'form.err.network'); // input value stays; button restored in finally
      return;
    }
    let data = {};
    try { data = await res.json(); } catch (_) { /* non-JSON error body */ }
    if (!res.ok) {
      const code = data && data.error;
      if (code === 'invalid_email') {
        setMsg(entry, 'form.err.invalid');
      } else if (code === 'invalid_captcha') {
        setMsg(entry, 'form.err.captcha');
        if (window.turnstile && entry.widgetId != null) {
          window.turnstile.reset(entry.widgetId); // challenge re-runs on next submit
        }
      } else if (code === 'rate_limited') {
        setMsg(entry, 'form.err.generic'); // 429 {"error":"rate_limited"} — no dedicated key; generic copy
      } else {
        setMsg(entry, 'form.err.generic'); // 500 {"error":"generic"} and anything else
      }
      return;
    }
    // 200 {position, referral_code, referral_count, already_joined}
    safeSet(LS_WAITLIST, JSON.stringify({
      position: data.position,
      referral_code: data.referral_code,
    }));
    renderConfirmation(data, { focus: true });
    if (entry.kind === 'final') {
      const hero = document.getElementById('hero');
      if (hero) {
        hero.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto' : 'smooth',
        });
      }
    }
  } finally {
    setBusy(entry, false); // harmless if the hero form was just replaced
  }
}

// -------------------------------------------------------- confirmation view

let confirmState = null; // { position, referral_code, referral_count, already_joined, profileDone }

function renderConfirmation(data, opts) {
  confirmState = {
    position: data.position,
    referral_code: data.referral_code,
    referral_count: data.referral_count || 0,
    already_joined: !!data.already_joined,
    profileDone: confirmState ? confirmState.profileDone : false,
  };
  const panel = document.getElementById('hero-panel');
  const tpl = document.getElementById('confirmation-template');
  if (!panel || !tpl) return;
  panel.replaceChildren(tpl.content.cloneNode(true));
  wireConfirmation(panel);
  fillConfirmation(panel);
  if (opts && opts.focus) {
    // Focus the heading (not the position paragraph) so a screen reader
    // announces the state change with context ("You're on the list.")
    // rather than a bare number.
    const target = panel.querySelector('[data-confirm="title"]');
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
    }
  }
}

function wireConfirmation(root) {
  const copyBtn = root.querySelector('[data-confirm="copy"]');
  const linkInput = root.querySelector('[data-confirm="link"]');
  if (copyBtn && linkInput) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(linkInput.value);
      } catch (_) {
        if (linkInput.select) linkInput.select(); // clipboard blocked — leave link selected
        return;
      }
      copyBtn.textContent = t('confirm.copied');
      setTimeout(() => { copyBtn.textContent = t('confirm.copy'); }, 2000);
    });
  }
  const fieldset = root.querySelector('[data-confirm="profile"]');
  if (fieldset) {
    // Progressive profiling saves on every change (API is last-write-wins);
    // once BOTH answers are present and saved, swap to the thanks line.
    fieldset.addEventListener('change', () => { onProfileSave(root, fieldset); });
  }
}

function profileMsgRegion(root, fieldset) {
  let msg = root.querySelector('[data-confirm="profile-msg"]');
  if (!msg) {
    msg = document.createElement('p');
    msg.className = 'form-msg';
    msg.setAttribute('aria-live', 'polite');
    msg.setAttribute('data-confirm', 'profile-msg');
    fieldset.insertAdjacentElement('afterend', msg);
  }
  return msg;
}

async function onProfileSave(root, fieldset) {
  if (!confirmState) return;
  const intentEl = fieldset.querySelector('input[name="club_intent"]:checked');
  const sizeEl = fieldset.querySelector('select[name="club_size"]');
  const intent = intentEl ? intentEl.value : undefined;               // 'existing' | 'new'
  // Option values are integers (5/10/20/21). Number('') → NaN is guarded by the
  // truthiness check; Number.isInteger below is the real gate so a bad parse can
  // never hide the fieldset or send a non-integer the backend would silently drop.
  const size = sizeEl && sizeEl.value ? Number(sizeEl.value) : undefined;
  const sizeValid = Number.isInteger(size);
  const msg = profileMsgRegion(root, fieldset);
  msg.textContent = '';
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'profile',
        referral_code: confirmState.referral_code,
        club_intent: intent,
        club_size: sizeValid ? size : undefined, // undefined is dropped by JSON.stringify
      }),
    });
    if (!res.ok) throw new Error('profile_failed');
    if (intent !== undefined && sizeValid) {
      confirmState.profileDone = true;
      fieldset.hidden = true;
      const thanks = root.querySelector('[data-confirm="profile-thanks"]');
      if (thanks) {
        thanks.hidden = false;
        thanks.textContent = t('confirm.profile.thanks');
      }
      msg.textContent = '';
    }
  } catch (_) {
    // Errors keep the fieldset; quiet inline note only.
    msg.textContent = t('form.err.generic');
  }
}

function fillConfirmation(root) {
  if (!confirmState) return;
  const link = REFERRAL_BASE + confirmState.referral_code;
  const posEl = root.querySelector('[data-confirm="position"]');
  if (posEl) {
    fmtInto(
      posEl,
      confirmState.already_joined ? 'confirm.already' : 'confirm.position',
      confirmState.position
    );
  }
  const countEl = root.querySelector('[data-confirm="count"]');
  if (countEl) fmtInto(countEl, 'confirm.count', confirmState.referral_count);
  // The referral URL is shown only in the readonly link input; a <bdi> cannot
  // be a child of <input>, so its LTR isolation comes from the input's own
  // dir="ltr" (set in the template) — equivalent isolation for the URL.
  const linkEl = root.querySelector('[data-confirm="link"]');
  if (linkEl) linkEl.value = link;
  const shareEl = root.querySelector('[data-confirm="share"]');
  if (shareEl) {
    const lang = document.documentElement.lang || 'en';
    shareEl.href = 'https://wa.me/?text='
      + encodeURIComponent((SHARE_MSG[lang] || SHARE_MSG.en) + ' ' + link);
  }
  // Static template labels (confirm.title, confirm.referral.head, radio/option
  // labels…) carry data-i18n and are re-translated by js/i18n.js on langchange —
  // but a clone mounted AFTER the last langchange never went through
  // applyDictionary, so translate them here too (dict → EN fallback → leave as-is).
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const dict = window.__fulusDict || {};
    const val = dict[key] != null ? dict[key] : EN_FALLBACK[key];
    if (val == null) return;
    const attr = el.getAttribute('data-i18n-attr');
    if (attr) el.setAttribute(attr, val);
    else el.textContent = val;
  });
  // Profile completion state survives re-fills (langchange, status refresh).
  if (confirmState.profileDone) {
    const fieldset = root.querySelector('[data-confirm="profile"]');
    const thanks = root.querySelector('[data-confirm="profile-thanks"]');
    if (fieldset) fieldset.hidden = true;
    if (thanks) {
      thanks.hidden = false;
      thanks.textContent = t('confirm.profile.thanks');
    }
  }
}

// ------------------------------------------------------------ return visit

async function bootFromCache() {
  const raw = safeGet(LS_WAITLIST);
  if (!raw) return;
  let cached;
  try { cached = JSON.parse(raw); } catch (_) { return; }
  if (!cached || cached.position == null || !cached.referral_code) return;
  const panel = document.getElementById('hero-panel');
  // Snapshot the plain hero markup before the optimistic render below
  // replaces it, so an invalid_code response (the cached referral row no
  // longer exists server-side) can fall back to it instead of leaving a
  // stale confirmation on screen.
  const originalPanelHTML = panel ? panel.innerHTML : null;
  // 1) Instant render from cache…
  renderConfirmation({
    position: cached.position,
    referral_code: cached.referral_code,
    referral_count: 0,
    already_joined: false,
  });
  // 2) …then refresh position/count from the server; keep cache silently on failure.
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status', referral_code: cached.referral_code }),
    });
    if (!res.ok) {
      let errData = {};
      try { errData = await res.json(); } catch (_) { /* non-JSON error body */ }
      if (errData && errData.error === 'invalid_code') {
        safeRemove(LS_WAITLIST);
        safeRemove(LS_REF);
        confirmState = null;
        if (panel && originalPanelHTML != null) {
          panel.innerHTML = originalPanelHTML;
          const restoredForm = panel.querySelector('form.waitlist-form');
          if (restoredForm) wireForm(restoredForm);
        }
      }
      return; // other failures: keep the stale cache/confirmation standing
    }
    const data = await res.json(); // {position, referral_count}
    confirmState.position = data.position;
    confirmState.referral_count = data.referral_count || 0;
    safeSet(LS_WAITLIST, JSON.stringify({
      position: data.position,
      referral_code: cached.referral_code,
    }));
    if (panel) fillConfirmation(panel);
  } catch (_) { /* offline return visit — cached values stand */ }
}

// -------------------------------------------------------------------- init

export function initWaitlist() {
  document.querySelectorAll('form.waitlist-form').forEach(wireForm);

  bootFromCache();

  // i18n.js dispatches langchange on document (non-bubbling) AFTER applying
  // the new dictionary. Re-fill every JS-written text node via t()/fmt().
  document.addEventListener('langchange', () => {
    const panel = document.getElementById('hero-panel');
    if (confirmState && panel && panel.querySelector('[data-confirm="position"]')) {
      fillConfirmation(panel);
    }
    forms.forEach((entry) => {
      if (entry.lastMsgKey && document.contains(entry.msg)) {
        entry.msg.textContent = t(entry.lastMsgKey);
      }
    });
  });
}
