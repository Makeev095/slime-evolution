// Общий помощник для браузерных тестов (puppeteer-core + установленный Google Chrome).
// Запуск: NODE_PATH=/путь/к/node_modules node tests/e2e.cjs   (нужен пакет puppeteer-core)
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = process.env.PORT || 8781;
const VENDOR = fs.readFileSync(path.join(ROOT, 'vendor/phaser.min.js'));

// mode: 'dev' — SDK заблокирован (реклама и покупки имитируются), 'mock' — подставляем фейковый YaGames
const MOCK_SDK = `
(function () {
  var calls = window.__calls = [];
  window.__cloud = window.__cloud || { save: null };
  window.__purchases = window.__purchases || [];
  window.__adMode = window.__adMode || 'ok';
  var n = 0;
  var png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  var catalog = [
    { id: 'gems_100', title: '100', price: '30 Ян', priceValue: '30', priceCurrencyCode: 'YAN' },
    { id: 'gems_550', title: '550', price: '150 Ян', priceValue: '150', priceCurrencyCode: 'YAN' },
    { id: 'gems_1800', title: '1800', price: '450 Ян', priceValue: '450', priceCurrencyCode: 'YAN' },
    { id: 'x2_forever', title: 'x2', price: '199 Ян', priceValue: '199', priceCurrencyCode: 'YAN' },
    { id: 'no_ads', title: 'no ads', price: '99 Ян', priceValue: '99', priceCurrencyCode: 'YAN' }
  ].map(function (c) { c.getPriceCurrencyImage = function () { return png; }; return c; });
  var payments = {
    getCatalog: async function () { calls.push('getCatalog'); return catalog; },
    purchase: async function (o) { calls.push('purchase:' + o.id); if (window.__failPurchase) throw new Error('cancel'); var p = { productID: o.id, purchaseToken: 'tok' + (++n) }; window.__purchases.push(p); return p; },
    getPurchases: async function () { calls.push('getPurchases'); return window.__purchases.slice(); },
    consumePurchase: async function (tok) { calls.push('consume:' + tok); window.__purchases = window.__purchases.filter(function (p) { return p.purchaseToken !== tok; }); }
  };
  var player = {
    getData: async function () { calls.push('getData'); return window.__cloud.save ? { save: JSON.parse(JSON.stringify(window.__cloud.save)) } : {}; },
    setData: async function (d) { calls.push('setData'); window.__cloud.save = JSON.parse(JSON.stringify(d.save)); return true; }
  };
  var ysdk = {
    environment: { i18n: { lang: window.__lang || 'ru' } },
    features: {
      LoadingAPI: { ready: function () { calls.push('loading.ready'); } },
      GameplayAPI: { start: function () { calls.push('gp.start'); }, stop: function () { calls.push('gp.stop'); } }
    },
    on: function (ev, cb) { (window.__handlers = window.__handlers || {})[ev] = cb; },
    getPlayer: async function () { return player; },
    getPayments: async function () { return payments; },
    adv: {
      showFullscreenAdv: function (o) {
        calls.push('adv.full'); var c = o.callbacks;
        if (window.__adMode === 'error') { c.onError(new Error('no fill')); return; }
        c.onOpen(); setTimeout(function () { c.onClose(true); }, 300);
      },
      showRewardedVideo: function (o) {
        calls.push('adv.rewarded'); var c = o.callbacks;
        if (window.__adMode === 'error') { c.onError(new Error('no fill')); return; }
        c.onOpen();
        setTimeout(function () { if (window.__adMode === 'ok') c.onRewarded(); c.onClose(); }, 300);
      }
    }
  };
  window.YaGames = { init: async function () { calls.push('init'); return ysdk; } };
})();
`;

async function launch(W, H, { query = '?debug', mode = 'dev', storage = null, mobile = false, cloud = null, purchases = null, lang = null, url = null, init = null } = {}) {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    defaultViewport: { width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile }
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { const t = m.text(); if (/error|fail|warn/i.test(t) && !/GPU stall|swiftshader|WebGL|Failed to load resource/i.test(t)) errors.push(m.type() + ': ' + t); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const u = req.url();
    if (u.endsWith('/sdk.js') || u.includes('yandex.ru/games/sdk')) {
      if (mode === 'mock') return req.respond({ status: 200, contentType: 'application/javascript', body: MOCK_SDK });
      return req.abort();
    }
    if (u.includes('phaser.min.js') && u.startsWith('http') && !u.includes('127.0.0.1')) return req.respond({ status: 200, contentType: 'application/javascript', body: VENDOR });
    req.continue();
  });
  if (init) await page.evaluateOnNewDocument(init);
  if (cloud || purchases || lang) {
    await page.evaluateOnNewDocument((c, p, l) => { if (c) window.__cloud = { save: c }; if (p) window.__purchases = p; if (l) window.__lang = l; }, cloud, purchases, lang);
  }
  if (storage !== null) {
    await page.evaluateOnNewDocument((s) => { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('slime_evolution_save_v1', typeof s === 'string' ? s : JSON.stringify(s)); sessionStorage.setItem('__seeded', '1'); } }, storage);
  }
  await page.goto(url || `http://127.0.0.1:${PORT}/index.html${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__slime && window.__slime.scene && window.__slime.scene.scene.isActive(), { timeout: 40000 });
  return { browser, page, errors };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Координаты дизайна (600x1000) -> пиксели страницы. На широком экране магазин (y >= 612) рисует отдельная левая камера.
async function designPoint(page, x, y) {
  return page.evaluate((x, y) => {
    const sc = window.__slime.scene;
    const cam = sc.wide && y >= 612 ? sc.panelCam : sc.cameras.main;
    const cv = window.__game.canvas.getBoundingClientRect();
    return {
      x: cv.left + cam.x + (x - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2,
      y: cv.top + cam.y + (y - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2
    };
  }, x, y);
}
async function clickDesign(page, x, y, opts = {}) {
  const p = await designPoint(page, x, y);
  await page.mouse.click(p.x, p.y, opts);
}
// Геометрия магазина (совпадает с PANEL в src/ui/UpgradePanel.js)
const PANEL = { TOP: 612, TABS_Y: 652, LIST_Y: 694, ROW_H: 112 };
const rowY = (i) => PANEL.LIST_Y + PANEL.ROW_H * i + PANEL.ROW_H / 2;

module.exports = { launch, sleep, clickDesign, designPoint, PANEL, rowY, ROOT };
