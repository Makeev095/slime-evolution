// VK Play JS API (iframeApi) + окно оплаты paymentFrame.
// Подключается только внутри iframe кабинета; снаружи iframeApi нет — игра остаётся в Yandex/dev.

export const VKPLAY_APP_ID = 51213;

export const VKPLAY_PRICES = {
  gems_100: { RUB: 99, USD: 1.26, EUR: 1.12, ru: '100 кристаллов', en: '100 crystals' },
  gems_550: { RUB: 499, USD: 6.30, EUR: 5.61, ru: '550 кристаллов', en: '550 crystals' },
  gems_1800: { RUB: 1490, USD: 18.90, EUR: 16.83, ru: '1800 кристаллов', en: '1800 crystals' },
  x2_forever: { RUB: 649, USD: 8.36, EUR: 7.44, ru: 'x2 доход навсегда', en: 'x2 income forever' },
  no_ads: { RUB: 329, USD: 4.16, EUR: 3.70, ru: 'Без рекламы', en: 'No ads' }
};

export function isVkPlay() {
  return typeof window !== 'undefined' && typeof window.iframeApi === 'function';
}

export function currencyOf() {
  const q = new URLSearchParams(location.search);
  const c = (q.get('currency') || q.get('cur') || 'RUB').toUpperCase();
  return c === 'USD' || c === 'EUR' ? c : 'RUB';
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
      getAuthTokenCallback: (tok) => { window.__vkToken = tok; }
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
  try { if (api.userInfo) api.userInfo(); } catch (e) { /* ignore */ }
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
  return window.__vkUser || {};
}

export function pay(api, productId, lang) {
  const row = VKPLAY_PRICES[productId];
  if (!row || !api || !api.paymentFrame) return Promise.reject(new Error('no product'));
  const currency = currencyOf();
  const description = String((lang === 'en' ? row.en : row.ru) || productId).slice(0, 50);
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      window.__vkPayOk = null;
      window.__vkPayClosed = null;
      if (ok) resolve(true);
      else reject(new Error('cancelled'));
    };
    window.__vkPayOk = () => finish(true);
    window.__vkPayClosed = () => setTimeout(() => { if (!done) finish(false); }, 800);
    api.paymentFrame({
      merchant_param: {
        amount: row[currency],
        currency,
        description,
        item_id: productId
      }
    });
  });
}
