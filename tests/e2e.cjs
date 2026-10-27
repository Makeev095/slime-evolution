// Сквозные тесты в реальном браузере (Chrome + puppeteer-core): игровой процесс, покупки, реклама, сохранения, SDK.
// Запуск:  sh build.sh (не обязательно)  &&  python3 -m http.server 8781 &  NODE_PATH=<путь к node_modules> node tests/e2e.cjs [фильтр]
const { launch, sleep, clickDesign } = require('./lib.cjs');
const fs = require('fs');

const FILTER = process.argv[2] || '';
const results = [];
let currentName = '';
function ok(name, cond, info) {
  results.push({ scenario: currentName, name, pass: !!cond, info });
  console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : '  -> ' + JSON.stringify(info)));
}

const STAGE_AT = [0, 300, 2e4, 1e6, 6e7, 4e9, 3e11];
function seed(over = {}) {
  const now = new Date();
  const key = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const idx = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  return Object.assign({
    v: 1, gel: 0, runGel: 0, allTime: 0, gems: 0, taps: 100, gens: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], tapLevel: 0, essence: 0, rebirths: 0,
    boostUntil: 0, boostMult: 2, goldUntil: 0, stormUntil: 0, lastSeen: Date.now(), giftAt: 0, gemVideoAt: 0,
    seenStage: 0, lastDaily: { key, idx, day: 1 }, dailyStreak: 1, intro: true, sound: true, noAds: false, x2: false, tokens: [], updatedAt: Date.now()
  }, over);
}
const S = (page, fn, ...args) => page.evaluate(fn, ...args);
const state = (page) => S(page, () => JSON.parse(JSON.stringify(window.__slime.scene.d)));
const press = (page, expr) => S(page, (e) => { const btn = eval(e); btn.emit('pointerdown', {}); btn.emit('pointerup', {}); }, expr);
const waitModal = (page, ms = 6000) => page.waitForFunction(() => { const m = window.__slime.scene.modal; return m && m !== true; }, { timeout: ms }).then(() => true).catch(() => false);
const modalGone = (page, ms = 4000) => page.waitForFunction(() => !window.__slime.scene.modal, { timeout: ms }).then(() => true).catch(() => false);

const scenarios = {
  // ---------------------------------------------------------------- тапы, комбо, ярость
  async tapping() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ intro: false, taps: 0 }) });
    await sleep(500);
    ok('подсказка «Тапай» видна новичку', await S(page, () => window.__slime.scene.handText.visible));
    for (let i = 0; i < 20; i++) { await clickDesign(page, 300 + (i % 3) * 15, 400); await sleep(35); }
    const d = await state(page);
    ok('20 тапов дали ≥ 20 желе и счётчик тапов', d.taps === 20 && d.gel >= 20, { taps: d.taps, gel: d.gel });
    ok('подсказка скрылась после первых тапов', !(await S(page, () => window.__slime.scene.handText.visible)));
    ok('быстрые тапы включили «ярость»', await S(page, () => window.__slime.scene.isFrenzy()));
    ok('в ярости слайм «довольный» (текстура)', await S(page, () => window.__slime.scene.slime.texture.key.endsWith('_1')));
    // тап вне слайма (по HUD) не даёт желе
    const before = (await state(page)).taps;
    await clickDesign(page, 300, 100);
    ok('тап мимо слайма не засчитывается', (await state(page)).taps === before);
    // клавиатура
    await page.keyboard.press('Space');
    ok('пробел тоже тапает', (await state(page)).taps === before + 1);
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- покупки, прокрутка, режимы
  async upgrades() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gel: 1e5, runGel: 1e5, allTime: 1e5 }) });
    await sleep(600);
    const ROW = (i) => 688 + 86 * i + 43;
    await clickDesign(page, 300, ROW(0)); await sleep(150);
    let d = await state(page);
    ok('клик по строке «Сила тапа» покупает уровень', d.tapLevel === 1 && Math.abs(d.gel - (1e5 - 25)) < 1, { lvl: d.tapLevel, gel: d.gel });
    await clickDesign(page, 300, ROW(1)); await sleep(150);
    d = await state(page);
    ok('клик по строке «Капельница» покупает производителя', d.gens[0] === 1, d.gens);
    // режим x10
    await clickDesign(page, 530, 652); await sleep(100);
    await clickDesign(page, 300, ROW(1)); await sleep(150);
    d = await state(page);
    ok('режим x10 покупает сразу 10', d.gens[0] === 11, d.gens[0]);
    // режим x100 и MAX
    await clickDesign(page, 530, 652); await clickDesign(page, 530, 652); await sleep(100); // x100 -> MAX
    ok('режим MAX включился', await S(page, () => window.__slime.scene.panel.mode === 0));
    const g0 = (await state(page)).gel;
    await clickDesign(page, 300, ROW(2)); await sleep(150);
    d = await state(page);
    ok('MAX покупает максимум на все деньги', d.gens[1] >= 10 && d.gel < g0, { g1: d.gens[1], gel: d.gel });
    // заблокированная строка
    await S(page, () => { const s = window.__slime.scene; s.d.gel = 1e5; s.d.allTime = 100; s.panel.refresh(true); });
    const locked = await S(page, () => window.__slime.scene.panel.rows[0][9].unlocked);
    ok('далёкие производители скрыты «???»', locked === false);
    // перетаскивание прокручивает и не покупает
    await S(page, () => { const s = window.__slime.scene; s.d.gel = 5e4; s.panel.modeIdx = 0; s.panel.refresh(true); });
    const gensBefore = (await state(page)).gens.join();
    const p = await S(page, () => { const cam = window.__slime.scene.cameras.main; const r = window.__game.canvas.getBoundingClientRect(); const f = (x, y) => ({ x: r.left + (x - 300) * cam.zoom + cam.width / 2, y: r.top + (y - 500) * cam.zoom + cam.height / 2 }); return { a: f(300, 900), b: f(300, 720) }; });
    await page.mouse.move(p.a.x, p.a.y); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(p.a.x, p.a.y + (p.b.y - p.a.y) * i / 8); await sleep(16); }
    await page.mouse.up(); await sleep(300);
    const scroll = await S(page, () => window.__slime.scene.panel.scroll[0]);
    ok('перетаскивание прокручивает список', scroll > 50, scroll);
    ok('перетаскивание ничего не покупает', (await state(page)).gens.join() === gensBefore);
    // колесо мыши
    await S(page, () => { window.__slime.scene.panel.scroll[0] = 0; window.__slime.scene.panel._applyScroll(); });
    const q = await S(page, () => { const cam = window.__slime.scene.cameras.main; const r = window.__game.canvas.getBoundingClientRect(); return { x: r.left + cam.width / 2, y: r.top + (850 - 500) * cam.zoom + cam.height / 2 }; });
    await page.mouse.move(q.x, q.y); await page.mouse.wheel({ deltaY: 200 }); await sleep(150);
    ok('колесо мыши прокручивает список', (await S(page, () => window.__slime.scene.panel.scroll[0])) > 50);
    // удержание
    await S(page, () => { const s = window.__slime.scene; s.panel.scroll[0] = 0; s.panel._applyScroll(); s.d.gel = 1e6; s.d.gens[0] = 0; s.panel.modeIdx = 0; s.panel.refresh(true); });
    const hp = await S(page, () => { const cam = window.__slime.scene.cameras.main; const r = window.__game.canvas.getBoundingClientRect(); return { x: r.left + cam.width / 2, y: r.top + (688 + 86 + 43 - 500) * cam.zoom + cam.height / 2 }; });
    await page.mouse.move(hp.x, hp.y); await page.mouse.down(); await sleep(1500); await page.mouse.up(); await sleep(200);
    const held = (await state(page)).gens[0];
    ok('удержание строки покупает серию', held >= 4, held);
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- эволюция
  async evolution() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gel: 295, runGel: 295, allTime: 295 }) });
    await sleep(500);
    for (let i = 0; i < 8; i++) { await clickDesign(page, 300, 420); await sleep(50); }
    ok('окно эволюции появилось', await waitModal(page));
    let d = await state(page);
    ok('стадия 1 зафиксирована, кристаллы выданы', d.seenStage === 1 && d.gems === 5, { seen: d.seenStage, gems: d.gems });
    ok('внешний вид слайма сменился', await S(page, () => window.__slime.scene.shownStage === 1 && window.__slime.scene.slime.texture.key.startsWith('slime1')));
    await sleep(500);
    await press(page, 'window.__slime.scene.modal.buttons[0]');
    ok('окно закрылось', await modalGone(page));
    d = await state(page);
    ok('кристаллы не удвоились без видео', d.gems === 5, d.gems);
    // x2 за видео (dev-реклама ~0.9 c)
    await S(page, () => { const s = window.__slime.scene; s.d.allTime = 19999; s.d.gel += 100; s.d.runGel += 100; });
    for (let i = 0; i < 6; i++) { await clickDesign(page, 300, 420); await sleep(50); }
    ok('окно эволюции №2', await waitModal(page));
    await sleep(500);
    await press(page, 'window.__slime.scene.modal.buttons[1]');
    await sleep(2200);
    d = await state(page);
    ok('x2 за видео: кристаллы начислены дважды', d.gems === 5 + 20, d.gems);
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- оффлайн-доход
  async offline() {
    const gens = [5, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gens, allTime: 400, seenStage: 1, lastSeen: Date.now() - 3600e3 }) });
    ok('окно «С возвращением» показано', await waitModal(page));
    const info = await S(page, () => { const s = window.__slime.scene; return { expected: window.__slime.Eco.cps(s.d, 0) * 3600 * 0.5, gel: s.d.gel }; });
    ok('до нажатия желе (оффлайн) не начислено', info.gel < info.expected * 0.01, info);
    await sleep(500);
    await press(page, 'window.__slime.scene.modal.buttons[0]');
    await modalGone(page); await sleep(200);
    let d = await state(page);
    ok('«Забрать» начисляет 50% дохода за час', Math.abs(d.gel - info.expected) / info.expected < 0.02, { gel: d.gel, exp: info.expected });
    await browser.close();

    const b2 = await launch(540, 960, { storage: seed({ gens, allTime: 400, seenStage: 1, lastSeen: Date.now() - 3600e3 }) });
    await waitModal(b2.page); await sleep(500);
    const exp = await S(b2.page, () => window.__slime.Eco.cps(window.__slime.scene.d, 0) * 3600 * 0.5 * 2);
    await press(b2.page, 'window.__slime.scene.modal.buttons[1]');
    await sleep(2400);
    d = await state(b2.page);
    ok('«x2 за видео» начисляет двойной доход', Math.abs(d.gel - exp) / exp < 0.05, { gel: d.gel, exp });
    ok('окно закрылось после видео', await modalGone(b2.page));
    ok('нет ошибок консоли', errors.length === 0 && b2.errors.length === 0, [...errors, ...b2.errors]);
    await b2.browser.close();

    // короткое отсутствие — молча
    const b3 = await launch(540, 960, { storage: seed({ gens, allTime: 400, seenStage: 1, lastSeen: Date.now() - 60e3 }) });
    await sleep(600);
    d = await state(b3.page);
    ok('отсутствие <2 мин: без окна, доход начислен полностью', !(await S(b3.page, () => !!window.__slime.scene.modal)) && d.gel > 100, d.gel);
    await b3.browser.close();
  },

  // ---------------------------------------------------------------- ежедневные награды
  async daily() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ lastDaily: null, dailyStreak: 0 }) });
    ok('ежедневное окно появилось', await waitModal(page, 8000));
    await sleep(500);
    await press(page, 'window.__slime.scene.modal.buttons[0]');
    await modalGone(page); await sleep(200);
    const d = await state(page);
    ok('день 1: кристаллы начислены, серия = 1', d.gems === 3 && d.dailyStreak === 1 && d.lastDaily && d.lastDaily.day === 1, { gems: d.gems, streak: d.dailyStreak });
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__slime && window.__slime.scene.scene.isActive(), { timeout: 30000 });
    await sleep(3500);
    ok('повторно за день окно не показывается', !(await S(page, () => !!window.__slime.scene.modal)));
    ok('прогресс сохранился после перезагрузки', (await state(page)).gems === 3);
    await browser.close();

    // вчера был день 3 -> сегодня день 4
    const now = new Date(); const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yk = y.getFullYear() * 10000 + (y.getMonth() + 1) * 100 + y.getDate();
    const yi = Math.floor(Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) / 86400000);
    const b2 = await launch(540, 960, { storage: seed({ lastDaily: { key: yk, idx: yi, day: 3 }, dailyStreak: 3 }) });
    await waitModal(b2.page, 8000); await sleep(400);
    await press(b2.page, 'window.__slime.scene.modal.buttons[0]');
    await modalGone(b2.page); await sleep(200);
    const d2 = await state(b2.page);
    ok('серия продолжается: день 4 даёт 12 кристаллов', d2.gems === 12 && d2.dailyStreak === 4, { gems: d2.gems, streak: d2.dailyStreak });
    ok('нет ошибок консоли', errors.length === 0 && b2.errors.length === 0, [...errors, ...b2.errors]);
    await b2.browser.close();
  },

  // ---------------------------------------------------------------- реклама (dev-режим)
  async ads_dev() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gens: [10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], allTime: 400, seenStage: 1 }) });
    await sleep(500);
    // ускорение x2
    const cps0 = await S(page, () => window.__slime.Eco.cps(window.__slime.scene.d, Date.now()));
    await clickDesign(page, 534, 196);
    await sleep(120);
    ok('во время рекламы игра на паузе и звук выключен', await S(page, () => window.__slime.YandexSDK._sleeping && window.__game.sound.mute));
    await sleep(1600);
    let d = await state(page);
    ok('награда x2 выдана после просмотра', d.boostUntil > Date.now() + 100000 && d.boostMult === 2, d.boostUntil - Date.now());
    ok('после рекламы игра и звук возобновились', await S(page, () => !window.__slime.YandexSDK._sleeping && !window.__game.sound.mute));
    await sleep(400);
    const cps1 = await S(page, () => window.__slime.scene.cpsCache);
    ok('доход удвоился', Math.abs(cps1 / cps0 - 2) < 0.05, { cps0, cps1 });
    // подарок
    const gel0 = (await state(page)).gel;
    await clickDesign(page, 66, 196); await sleep(2000);
    d = await state(page);
    ok('подарок за видео: желе выдано, кулдаун запущен', d.gel > gel0 && d.giftAt > Date.now() + 200000, { gel: d.gel, gel0 });
    await clickDesign(page, 66, 196); await sleep(300);
    ok('подарок на кулдауне не открывает рекламу', !(await S(page, () => window.__slime.YandexSDK.busy)));
    // межстраничная: интервал не прошёл — реклама не показывается даже в простое
    await sleep(500);
    ok('интервал 2 мин: межстраничная не запускается раньше', !(await S(page, () => !!window.__slime.scene.countdown || window.__slime.YandexSDK.busy)));
    // имитируем, что 2 минуты прошло
    await S(page, () => { window.__slime.YandexSDK.lastAdAt = 0; window.__slime.scene.lastTapAt = Date.now() - 7000; });
    await sleep(1200);
    ok('в простое показывается предупреждение «Видео через N…»', await S(page, () => !!window.__slime.scene.countdown && window.__slime.scene.adBanner.visible));
    // тап во время отсчёта отменяет рекламу
    await clickDesign(page, 300, 420); await sleep(100);
    ok('тап отменяет предстоящую рекламу', await S(page, () => !window.__slime.scene.countdown && !window.__slime.YandexSDK.busy));
    // теперь ждём настоящую
    await S(page, () => { window.__slime.scene.lastTapAt = Date.now() - 7000; });
    await sleep(5200);
    const shown = await S(page, () => window.__slime.YandexSDK.lastAdAt > 0);
    ok('межстраничная показана после отсчёта', shown);
    await sleep(1200);
    ok('после межстраничной игра продолжилась', await S(page, () => !window.__slime.YandexSDK.busy && !window.__slime.YandexSDK._sleeping));
    // «Без рекламы»
    await S(page, () => { window.__slime.YandexSDK.data.noAds = true; window.__slime.YandexSDK.lastAdAt = 0; window.__slime.scene.lastTapAt = Date.now() - 9000; });
    await sleep(1500);
    ok('noAds: межстраничная не показывается', !(await S(page, () => !!window.__slime.scene.countdown || window.__slime.YandexSDK.busy)));
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- золотой пузырь
  async golden() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gens: [10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], allTime: 400, seenStage: 1 }) });
    await sleep(400);
    await S(page, () => { window.__slime.scene.goldenAt = 0; });
    await sleep(900);
    ok('золотой пузырь появился', await S(page, () => !!window.__slime.scene.golden));
    await page.waitForFunction(() => { const g = window.__slime.scene.golden; return g && g.x > 120 && g.x < 480; }, { timeout: 9000 });
    const before = await state(page);
    // ловим пузырь в точке, где он сейчас
    const pos = await S(page, () => { const g = window.__slime.scene.golden; const cam = window.__slime.scene.cameras.main; const r = window.__game.canvas.getBoundingClientRect(); return { x: r.left + (g.x - 300) * cam.zoom + cam.width / 2, y: r.top + (g.y - 500) * cam.zoom + cam.height / 2 }; });
    await page.mouse.click(pos.x, pos.y); await sleep(300);
    const after = await state(page);
    ok('пузырь собран: награда выдана', !(await S(page, () => !!window.__slime.scene.golden)) && (after.gel > before.gel || after.gems > before.gems || after.goldUntil > Date.now() || after.stormUntil > Date.now()), { b: before.gel, a: after.gel });
    ok('следующий пузырь запланирован не раньше 45 с', await S(page, () => window.__slime.scene.goldenAt - Date.now() > 40000));
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- магазин (dev)
  async shop_dev() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gens: [10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], allTime: 400, seenStage: 1 }) });
    await sleep(400);
    await clickDesign(page, 98, 36); await sleep(200); // плашка кристаллов -> вкладка
    ok('плашка кристаллов открывает вкладку', await S(page, () => window.__slime.scene.panel.tab === 1));
    // последняя строка вкладки — «Купить кристаллы»
    await S(page, () => window.__slime.scene.panel.rows[1][4].c.emit('x'));
    await S(page, () => window.__slime.scene.openShop());
    await sleep(900);
    ok('магазин открыт, ввод игры отключён', await S(page, () => window.__slime.scene.shopOpen && !window.__slime.scene.input.enabled));
    const n = await S(page, () => window.__game.scene.getScene('ShopScene').rows.length);
    ok('в магазине 5 товаров', n === 5, n);
    const cps0 = await S(page, () => window.__slime.scene.cpsCache);
    for (let i = 0; i < 5; i++) { await press(page, `window.__game.scene.getScene('ShopScene').rows[${i}].btn`); await sleep(1100); }
    const d = await state(page);
    ok('пакеты кристаллов начислены (100+550+1800)', d.gems === 2450, d.gems);
    ok('«Без рекламы» куплено', d.noAds === true);
    ok('«Доход x2 навсегда» куплено', d.x2 === true);
    await sleep(500);
    const cps1 = await S(page, () => window.__slime.scene.cpsCache);
    ok('x2 навсегда удвоил доход', Math.abs(cps1 / cps0 - 2) < 0.05, { cps0, cps1 });
    await press(page, `window.__game.scene.getScene('ShopScene').closeBtn`); await sleep(600);
    ok('магазин закрыт, ввод игры вернулся', await S(page, () => !window.__slime.scene.shopOpen && window.__slime.scene.input.enabled && !window.__game.scene.isActive('ShopScene')));
    ok('кристаллы видны в HUD', await S(page, () => window.__slime.scene.gemTxt.text.length > 0));
    ok('токены потребляемых покупок учтены', (await state(page)).tokens.length === 3, (await state(page)).tokens.length);
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- кристаллы
  async crystals() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gems: 200, gens: [10, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], allTime: 5e4, seenStage: 2 }) });
    await sleep(400);
    await S(page, () => window.__slime.scene.panel.setTab(1));
    const ROW = (i) => 688 + 86 * i + 43;
    const gel0 = (await state(page)).gel;
    await clickDesign(page, 300, ROW(1)); await sleep(200); // перемотка 1 ч
    let d = await state(page);
    ok('перемотка 1 ч: списано 25 💎, желе выросло', d.gems === 175 && d.gel > gel0 + 1000, { gems: d.gems, gel: d.gel });
    await clickDesign(page, 300, ROW(3)); await sleep(200); // турбо x5
    d = await state(page);
    ok('турбо x5: списано 40 💎, ускорение на 5 минут', d.gems === 135 && d.boostMult === 5 && d.boostUntil - Date.now() > 290000, { gems: d.gems, mult: d.boostMult });
    await S(page, () => { window.__slime.scene.d.gems = 10; });
    await clickDesign(page, 300, ROW(2)); await sleep(200);
    ok('нехватка кристаллов: покупка не прошла', (await state(page)).gems === 10);
    await clickDesign(page, 300, ROW(0)); await sleep(2200); // видео за кристаллы
    d = await state(page);
    ok('видео за кристаллы: +10 💎 и кулдаун', d.gems === 20 && d.gemVideoAt > Date.now() + 100000, { gems: d.gems });
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- перерождение
  async rebirth() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gel: 5e8, runGel: 2e8, allTime: 2e8, gems: 30, seenStage: 4, gens: [10, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0], tapLevel: 5 }) });
    await sleep(500);
    await S(page, () => window.__slime.scene.panel.setTab(2));
    await clickDesign(page, 300, 688 + 262); await sleep(700);
    ok('подтверждение перерождения показано', await waitModal(page, 3000));
    await press(page, 'window.__slime.scene.modal.buttons[0]');
    await sleep(900);
    const d = await state(page);
    ok('эссенция +2, прогресс обнулён', d.essence === 2 && d.rebirths === 1 && d.gel === 0 && d.tapLevel === 0 && d.gens.every((x) => x === 0), d);
    ok('стадия и кристаллы сохранены', d.allTime >= 2e8 && d.allTime < 2.1e8 && d.gems === 30, { a: d.allTime, g: d.gems });
    ok('вкладка вернулась на «Улучшения»', await S(page, () => window.__slime.scene.panel.tab === 0));
    // отказ
    await S(page, () => { const s = window.__slime.scene; s.d.runGel = 6e8; });
    await S(page, () => window.__slime.scene.requestRebirth()); await sleep(600);
    await waitModal(page, 3000);
    await press(page, 'window.__slime.scene.modal.buttons[1]'); await sleep(700);
    ok('«Нет» не сбрасывает прогресс', (await state(page)).essence === 2);
    await S(page, () => { const s = window.__slime.scene; s.d.runGel = 100; });
    await S(page, () => window.__slime.scene.requestRebirth()); await sleep(400);
    ok('рано — окно не открывается', !(await S(page, () => !!window.__slime.scene.modal)));
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- сохранения
  async persistence() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed({ gel: 5000, runGel: 5000, allTime: 5000, seenStage: 1 }) });
    await sleep(400);
    const ROW = (i) => 688 + 86 * i + 43;
    await clickDesign(page, 300, ROW(0)); await sleep(100);
    await clickDesign(page, 300, ROW(1)); await sleep(100);
    for (let i = 0; i < 5; i++) { await clickDesign(page, 300, 420); await sleep(40); }
    await S(page, () => window.__slime.scene.persist(true));
    const before = await state(page);
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__slime && window.__slime.scene.scene.isActive(), { timeout: 30000 });
    await sleep(500);
    const after = await state(page);
    ok('после перезагрузки уровни и счётчики совпадают', after.tapLevel === before.tapLevel && after.gens.join() === before.gens.join() && after.taps === before.taps, { b: before.gens, a: after.gens });
    ok('желе не потеряно (и чуть выросло от дохода)', after.gel >= before.gel - 1, { b: before.gel, a: after.gel });
    await browser.close();
    // битое сохранение не ломает игру
    const b2 = await launch(540, 960, { storage: '{"gel":"abc","gens":[1,2],"tapLevel":-5,"allTime":null,"gems":1e999}' });
    await sleep(400);
    const d = await state(b2.page);
    ok('битое сохранение нормализуется', d.gens.length === 12 && d.tapLevel === 0 && Number.isFinite(d.gel) && Number.isFinite(d.allTime) && Number.isFinite(d.gems), d);
    ok('частично валидные поля сохраняются (gens[0..1])', d.gens[0] === 1 && d.gens[1] === 2);
    await b2.browser.close();
    const b3 = await launch(540, 960, { storage: 'not json at all' });
    await sleep(400);
    ok('мусор вместо JSON — игра стартует с нуля', (await state(b3.page)).gens.length === 12);
    await b3.browser.close();
    return;
    ok('нет ошибок консоли', errors.filter((e) => !/JSON|Unexpected/.test(e)).length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- Yandex SDK (мок): облако, реклама, покупки
  async sdk_mock() {
    const cloudNewer = seed({ gel: 777, runGel: 777, allTime: 777, seenStage: 1, updatedAt: Date.now() + 5000 });
    const local = seed({ gel: 10, updatedAt: Date.now() - 100000 });
    const { browser, page, errors } = await launch(540, 960, { mode: 'mock', storage: local, cloud: cloudNewer });
    await sleep(500);
    const calls = () => S(page, () => window.__calls.slice());
    let c = await calls();
    ok('SDK: init → LoadingAPI.ready → GameplayAPI.start', c.includes('init') && c.includes('loading.ready') && c.includes('gp.start') && c.indexOf('init') < c.indexOf('loading.ready'), c);
    ok('режим yandex', (await S(page, () => window.__slime.YandexSDK.mode)) === 'yandex');
    let d = await state(page);
    ok('побеждает более свежее облачное сохранение', d.gel >= 777, d.gel);
    // облачное сохранение при важном событии
    await S(page, () => { window.__slime.scene.d.gems = 55; window.__slime.scene.persist(true); });
    await sleep(300);
    ok('важное событие уходит в облако немедленно', (await S(page, () => window.__cloud.save && window.__cloud.save.gems)) === 55);
    // реклама: награда только в onRewarded
    await S(page, () => { window.__adMode = 'noreward'; });
    await clickDesign(page, 534, 196); await sleep(1100);
    d = await state(page);
    ok('закрыл видео без награды — ускорения нет', !(d.boostUntil > Date.now()), d.boostUntil);
    await S(page, () => { window.__adMode = 'error'; });
    await sleep(2200); // дождаться конца блокировки busy и кулдауна
    await clickDesign(page, 534, 196); await sleep(800);
    d = await state(page);
    ok('ошибка рекламы — награды нет, игра не зависла', !(d.boostUntil > Date.now()) && !(await S(page, () => window.__slime.YandexSDK.busy || window.__slime.YandexSDK._sleeping)));
    await S(page, () => { window.__adMode = 'ok'; });
    await clickDesign(page, 534, 196); await sleep(1100);
    d = await state(page);
    ok('просмотр до конца — ускорение выдано', d.boostUntil > Date.now() + 100000);
    c = await calls();
    ok('GameplayAPI.stop вызывается на время рекламы', c.includes('gp.stop'));
    // межстраничная
    await S(page, () => { window.__slime.YandexSDK.lastAdAt = 0; window.__slime.scene.lastTapAt = Date.now() - 9000; });
    await sleep(4800);
    c = await calls();
    ok('межстраничная запрошена через SDK', c.includes('adv.full'), c);
    await sleep(800);
    ok('после межстраничной всё возобновилось', await S(page, () => !window.__slime.YandexSDK._sleeping && !window.__game.sound.mute));
    // событие паузы от платформы (звуковой контекст должен быть разблокирован жестом пользователя)
    await clickDesign(page, 300, 420); await sleep(200);
    await S(page, () => window.__handlers && window.__handlers.game_api_pause && window.__handlers.game_api_pause());
    await sleep(250);
    ok('game_api_pause усыпляет игру и глушит звук', await S(page, () => window.__slime.YandexSDK._sleeping && window.__game.sound.mute));
    await S(page, () => window.__handlers.game_api_resume());
    await sleep(250);
    ok('game_api_resume возобновляет', await S(page, () => !window.__slime.YandexSDK._sleeping && !window.__game.sound.mute));
    // покупки
    await S(page, () => window.__slime.scene.openShop());
    await sleep(1200);
    const hasIcon = await S(page, () => window.__game.textures.exists('curr_icon'));
    ok('иконка валюты Яндекса загружена из SDK', hasIcon);
    const gems0 = (await state(page)).gems;
    await press(page, `window.__game.scene.getScene('ShopScene').rows[0].btn`); await sleep(900);
    c = await calls();
    d = await state(page);
    ok('gems_100: начислено один раз и потреблено (consume)', d.gems === gems0 + 100 && c.some((x) => x.startsWith('consume:tok')), { gems: d.gems, gems0, c });
    await press(page, `window.__game.scene.getScene('ShopScene').rows[4].btn`); await sleep(900);
    c = await calls();
    d = await state(page);
    ok('no_ads: флаг включён, consume НЕ вызван', d.noAds === true && c.filter((x) => x.startsWith('consume:')).length === 1, c);
    await S(page, () => { window.__failPurchase = true; });
    const gems1 = (await state(page)).gems;
    await press(page, `window.__game.scene.getScene('ShopScene').rows[1].btn`); await sleep(900);
    ok('отмена оплаты ничего не начисляет', (await state(page)).gems === gems1);
    ok('после отказа магазин жив (ввод не зависает)', await S(page, () => !window.__slime.YandexSDK.busy && !window.__slime.YandexSDK._sleeping));
    ok('нет неожиданных ошибок консоли', errors.filter((e) => !/rewarded error: Error: no fill|purchase failed: cancel/.test(e)).length === 0, errors);
    await browser.close();

    // недообработанные покупки при старте
    const pend = [{ productID: 'gems_550', purchaseToken: 'dangling1' }, { productID: 'no_ads', purchaseToken: 'perm1' }, { productID: 'x2_forever', purchaseToken: 'perm2' }];
    const b2 = await launch(540, 960, { mode: 'mock', storage: seed({ gems: 0 }), purchases: pend });
    await sleep(700);
    const d2 = await state(b2.page);
    const c2 = await S(b2.page, () => window.__calls.slice());
    ok('старт: недообработанная покупка выдана ровно один раз', d2.gems === 550, d2.gems);
    ok('старт: непотребляемые включены', d2.noAds === true && d2.x2 === true);
    ok('старт: consume только для потребляемого', c2.filter((x) => x.startsWith('consume:')).join() === 'consume:dangling1', c2);
    await b2.page.reload({ waitUntil: 'load' });
    await b2.page.waitForFunction(() => window.__slime && window.__slime.scene.scene.isActive(), { timeout: 30000 });
    await sleep(500);
    ok('повторный старт не выдаёт повторно', (await state(b2.page)).gems === 550);
    ok('нет ошибок консоли (2)', b2.errors.length === 0, b2.errors);
    await b2.browser.close();

    // английский язык
    const b3 = await launch(540, 960, { mode: 'mock', storage: seed(), lang: 'en' });
    await sleep(400);
    ok('lang=en: интерфейс на английском', await S(b3.page, () => window.__slime.scene.panel.tabs.length === 3 && window.__slime.scene.boostBtn.label.text === 'VIDEO'));
    await b3.browser.close();
  },

  // ---------------------------------------------------------------- звук
  async audio() {
    const { browser, page, errors } = await launch(540, 960, { storage: seed() });
    await sleep(400);
    const rep = await S(page, () => {
      const out = {};
      const keys = ['tap', 'click', 'buy', 'denied', 'gem', 'gold_spawn', 'gold_get', 'frenzy', 'evolve', 'rebirth', 'music'];
      for (const k of keys) {
        if (!window.__game.cache.audio.exists(k)) { out[k] = null; continue; }
        const b = window.__game.cache.audio.get(k);
        const ch = b.getChannelData(0);
        let peak = 0, sum = 0;
        for (let i = 0; i < ch.length; i++) { const v = Math.abs(ch[i]); if (v > peak) peak = v; sum += v * v; }
        out[k] = { dur: +b.duration.toFixed(2), peak: +peak.toFixed(2), rms: +Math.sqrt(sum / ch.length).toFixed(3) };
      }
      return out;
    });
    for (const k of Object.keys(rep)) ok(`звук «${k}»: есть, не тишина, без клиппинга`, rep[k] && rep[k].peak > 0.1 && rep[k].peak <= 1.0 && rep[k].rms > 0.005, rep[k]);
    ok('музыка 16 с, зациклена', rep.music && Math.abs(rep.music.dur - 16) < 0.1, rep.music);
    // звук: тумблер
    await S(page, () => window.__slime.scene.sndBtn.emit('pointerdown', {}));
    await S(page, () => window.__slime.scene.sndBtn.emit('pointerup', {}));
    await sleep(100);
    ok('кнопка звука выключает звук и сохраняет выбор', await S(page, () => window.__game.sound.mute && window.__slime.scene.d.sound === false));
    await S(page, () => { window.__slime.scene.sndBtn.emit('pointerdown', {}); window.__slime.scene.sndBtn.emit('pointerup', {}); });
    await sleep(150);
    ok('повторное нажатие включает', await S(page, () => !window.__game.sound.mute && window.__slime.scene.d.sound === true));
    // воспроизведение: тапы реально создают звук
    await clickDesign(page, 300, 420); await sleep(100);
    ok('музыка запущена после первого касания', await S(page, () => !!window.__slime.Sfx.music));
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- сенсорный ввод (телефон)
  async touch() {
    const { browser, page, errors } = await launch(414, 896, { mobile: true, storage: seed({ gel: 500, runGel: 500, allTime: 500, seenStage: 1 }) });
    await sleep(500);
    const toScreen = (x, y) => S(page, (x, y) => { const cam = window.__slime.scene.cameras.main; const r = window.__game.canvas.getBoundingClientRect(); return { x: r.left + (x - 300) * cam.zoom + cam.width / 2, y: r.top + (y - 500) * cam.zoom + cam.height / 2 }; }, x, y);
    let p = await toScreen(300, 400);
    await page.touchscreen.tap(p.x, p.y); await sleep(100);
    await page.touchscreen.tap(p.x + 10, p.y + 5); await sleep(100);
    ok('касания по слайму засчитываются', (await state(page)).taps === 102, (await state(page)).taps);
    p = await toScreen(300, 688 + 43);
    await page.touchscreen.tap(p.x, p.y); await sleep(200);
    ok('касание по строке улучшения покупает', (await state(page)).tapLevel === 1, (await state(page)).tapLevel);
    p = await toScreen(252, 652);
    await page.touchscreen.tap(p.x, p.y); await sleep(200);
    ok('касание по вкладке переключает её', await S(page, () => window.__slime.scene.panel.tab === 1));
    // два пальца одновременно
    p = await toScreen(300, 400);
    const before = (await state(page)).taps;
    const cdp = await page.createCDPSession();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 30, y: p.y, id: 1 }, { x: p.x + 30, y: p.y, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(200);
    ok('мультитач: два пальца = два тапа', (await state(page)).taps === before + 2, (await state(page)).taps - before);
    ok('нет ошибок консоли', errors.length === 0, errors);
    await browser.close();
  },

  // ---------------------------------------------------------------- адаптивность
  async layouts() {
    const sizes = [[360, 640], [414, 896], [768, 1024], [1280, 720], [1920, 1080], [320, 480]];
    for (const [W, H] of sizes) {
      const { browser, page, errors } = await launch(W, H, { storage: seed({ gens: [10, 6, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0], allTime: 5e4, gel: 3000, seenStage: 2 }), mobile: W < 800 });
      await sleep(600);
      fs.mkdirSync('/tmp/slime', { recursive: true });
      await page.screenshot({ path: `/tmp/slime/layout_${W}x${H}.png` });
      const info = await S(page, () => { const c = window.__slime.scene.cameras.main; return { zoom: c.zoom, listH: window.__slime.scene.panel.listH }; });
      ok(`${W}x${H}: масштаб и высота списка в норме, ошибок нет`, info.zoom > 0.3 && info.listH >= 312 && errors.length === 0, { info, errors });
      // изменение размера «на лету»
      await page.setViewport({ width: H, height: W, deviceScaleFactor: W < 800 ? 2 : 1, isMobile: W < 800, hasTouch: W < 800 });
      await sleep(400);
      const info2 = await S(page, () => ({ zoom: window.__slime.scene.cameras.main.zoom, w: window.__game.scale.width }));
      ok(`${W}x${H}: поворот экрана подхватывается`, info2.w === H, info2);
      await browser.close();
    }
  }
};

(async () => {
  const names = Object.keys(scenarios).filter((n) => !FILTER || n.includes(FILTER));
  for (const n of names) {
    currentName = n;
    console.log('\n== ' + n);
    try { await scenarios[n](); } catch (e) { ok('сценарий завершился без исключений', false, String(e && e.stack || e)); }
  }
  const fails = results.filter((r) => !r.pass);
  console.log(`\nИТОГО: ${results.length - fails.length}/${results.length} проверок пройдено`);
  if (fails.length) { console.log('Провалены:\n' + fails.map((f) => ` - [${f.scenario}] ${f.name}`).join('\n')); process.exitCode = 1; }
})();
