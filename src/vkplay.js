// VK Play JS API (iframeApi) + окно оплаты paymentFrame + облачный сейв по uid.
// Спека: https://documentation.vkplay.ru/f2p_vkp/f2pb_billing_vkp
// Платформа кладёт iframeApi в РОДИТЕЛЬСКОЕ окно. В кросс-доменный iframe github.io
// функция сама не попадает — подключаем ту же библиотеку iframe-api и делаем handshake.

export const VKPLAY_APP_ID = 51213;
export const VKPLAY_SAVE_URL = 'https://slime-evolution-billing.pages.dev/save';

export const VKPLAY_PRICES = {
  gems_100: { RUB: 99, USD: 1.26, EUR: 1.12, itemdef: 1, ru: '100 кристаллов', en: '100 crystals' },
  gems_550: { RUB: 499, USD: 6.30, EUR: 5.61, itemdef: 2, ru: '550 кристаллов', en: '550 crystals' },
  gems_1800: { RUB: 1490, USD: 18.90, EUR: 16.83, itemdef: 3, ru: '1800 кристаллов', en: '1800 crystals' },
  x2_forever: { RUB: 649, USD: 8.36, EUR: 7.44, itemdef: 4, ru: 'x2 доход навсегда', en: 'x2 income forever' }
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function currencyOf() {
  const q = new URLSearchParams(location.search);
  const c = (q.get('currency') || q.get('cur') || 'RUB').toUpperCase();
  return c === 'USD' || c === 'EUR' ? c : 'RUB';
}

export function looksLikeVkPlay() {
  if (typeof window === 'undefined') return false;
  if (typeof window.iframeApi === 'function') return true;
  const q = new URLSearchParams(location.search);
  if (q.get('appid') === String(VKPLAY_APP_ID)) return true;
  if (['auth_key', 'vid', 'whence'].some((k) => q.has(k))) return true;
  try {
    if (document.referrer && /vkplay\.ru|vkplay\.live|my\.games/i.test(document.referrer)) return true;
  } catch (e) { /* ignore */ }
  try {
    if (window.self !== window.top) {
      const host = location.hostname || '';
      if (host.includes('github.io') || host.includes('vkplay')) return true;
    }
  } catch (e) {
    return true;
  }
  return false;
}

export function isVkPlay() {
  return looksLikeVkPlay() || typeof window.iframeApi === 'function';
}

export function inIframe() {
  try { return window.self !== window.top; } catch (e) { return true; }
}

export async function loadIframeApiScript() {
  if (typeof window.iframeApi === 'function') return true;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = new URL('./lib/iframe-api.js', import.meta.url).href;
    s.onload = () => resolve(typeof window.iframeApi === 'function');
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export async function waitForIframeApi(ms = 4000) {
  if (typeof window.iframeApi === 'function') return true;
  if (inIframe()) await loadIframeApiScript();
  if (typeof window.iframeApi === 'function') return true;
  const until = Date.now() + ms;
  while (Date.now() < until) {
    if (typeof window.iframeApi === 'function') return true;
    await sleep(50);
  }
  return typeof window.iframeApi === 'function';
}

export function userUid() {
  const u = window.__vkUser || {};
  const tok = window.__vkToken || {};
  return String(
    u.uid || u.id || u.user_id ||
    (u.user && (u.user.uid || u.user.id)) ||
    tok.uid || ''
  );
}

export function handshake() {
  if (window.__vkplayReady) return window.__vkplayReady;
  window.__vkplayReady = new Promise((resolve, reject) => {
    if (typeof window.iframeApi !== 'function') {
      reject(new Error('iframeApi missing'));
      return;
    }
    const callbacks = {
      appid: VKPLAY_APP_ID,
      getLoginStatusCallback: (s) => { window.__vkLogin = s; },
      userInfoCallback: (info) => { window.__vkUser = info; },
      userProfileCallback: (p) => { window.__vkProfile = p; },
      registerUserCallback: (info) => { window.__vkUser = info; },
      paymentReceivedCallback: (data) => { if (window.__vkPayOk) window.__vkPayOk(data); },
      paymentWindowClosedCallback: () => { if (window.__vkPayClosed) window.__vkPayClosed(); },
      paymentFrameUrlCallback: () => {},
      getAuthTokenCallback: (tok) => { window.__vkToken = tok; },
      confirmWindowClosedCallback: () => {}
    };
    window.iframeApi(callbacks).then((api) => {
      window.__vkApi = api;
      resolve(api);
    }, reject);
  });
  return window.__vkplayReady;
}

function loginStatus(status) {
  const s = status && status.loginStatus;
  return s === 0 || s === '0' ? 0 : Number(s);
}

export async function ensureUser(api) {
  if (!api) return {};
  try { if (api.getLoginStatus) api.getLoginStatus(); } catch (e) { /* ignore */ }
  for (let i = 0; i < 30 && !window.__vkLogin; i++) await sleep(50);
  if (!window.__vkLogin) return {};
  const code = loginStatus(window.__vkLogin);
  if (code === 0 && api.authUser) {
    api.authUser();
    throw new Error('vkplay-auth');
  }
  if (code === 1 && api.registerUser) {
    api.registerUser();
    throw new Error('vkplay-register');
  }
  try { if (api.userInfo) api.userInfo(); } catch (e) { /* ignore */ }
  for (let i = 0; i < 30 && !window.__vkUser; i++) await sleep(50);
  try { if (api.getAuthToken) api.getAuthToken(); } catch (e) { /* ignore */ }
  return window.__vkUser || {};
}

export function pay(api, productId, lang) {
  const row = VKPLAY_PRICES[productId];
  if (!row || !api) return Promise.reject(new Error('no product'));
  const openPay = api.paymentFrame || api.paymentFrameItem || api.PaymentFrameItem;
  if (typeof openPay !== 'function') return Promise.reject(new Error('no paymentFrame'));
  const currency = currencyOf();
  const description = String((lang === 'en' ? row.en : row.ru) || productId).slice(0, 50);
  const merchant_param = {
    amount: Number(row[currency]),
    currency,
    description,
    item_id: productId,
    itemdefid: row.itemdef
  };
  const uid = userUid();
  if (uid) merchant_param.uid = String(uid);
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (ok, err) => {
      if (done) return;
      done = true;
      window.__vkPayOk = null;
      window.__vkPayClosed = null;
      if (ok) resolve(true);
      else reject(err || new Error('cancelled'));
    };
    // Начислять только после paymentReceivedCallback — закрытие окна само по себе не оплата.
    window.__vkPayOk = () => finish(true);
    window.__vkPayClosed = () => setTimeout(() => { if (!done) finish(false, new Error('cancelled')); }, 1500);
    try {
      if (api.paymentFrame) api.paymentFrame({ merchant_param });
      else openPay.call(api, { ids: String(row.itemdef), merchant_param });
    } catch (e) {
      finish(false, e);
    }
  });
}

export async function loadCloudSave(uid) {
  if (!uid) return null;
  const r = await fetch(VKPLAY_SAVE_URL + '?uid=' + encodeURIComponent(String(uid)));
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.save ? j.save : null;
}

export async function writeCloudSave(uid, data) {
  if (!uid || !data) return;
  await fetch(VKPLAY_SAVE_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ uid: String(uid), save: data })
  });
}
